import {
  type QueryClient,
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  type Contact,
  type ContactDetail,
  type ContactInput,
  type ContactSort,
  type NewClientInput,
  type TitularInput,
  archiveContact,
  createClient,
  deleteClientPermanently,
  fetchContact,
  fetchContacts,
  fetchDeleteImpact,
  fetchUnionPreview,
  fetchVinculos,
  setTitular,
  unirContactos,
  unarchiveContact,
  updateContact,
} from "../../api/contacts";

export const CONTACTS_PAGE_SIZE = 50;

export function useContactsList(params: {
  q?: string;
  includeArchived?: boolean;
  sort?: ContactSort;
  limit: number;
  offset: number;
}) {
  return useQuery({
    queryKey: ["contacts", params],
    queryFn: () => fetchContacts(params),
    // Sin esto la tabla parpadea en blanco en cada cambio de página.
    placeholderData: keepPreviousData,
  });
}

export function useContactDetail(id: string) {
  return useQuery({
    queryKey: ["contact", id],
    queryFn: () => fetchContact(id),
    enabled: !!id,
  });
}

/** Guarda el contacto que devolvió la mutación dentro de la ficha ya cacheada.
 *
 *  Invalidar `["contact", id]` NO alcanza: cuando la ficha no está montada (por
 *  ejemplo al archivar desde una fila de la lista), React Query la marca como
 *  vieja pero no la vuelve a pedir, y al entrar muestra primero lo que tenía
 *  guardado. Eso hacía que un cliente recién desarchivado siguiera mostrando el
 *  botón "Desarchivar" arriba a la derecha. Escribiendo la respuesta del PATCH
 *  no queda nada viejo que mostrar.
 *
 *  Deja el resto de la ficha (deals, turnos, facturas) intacto: ninguna de estas
 *  tres mutaciones los toca. */
function writeContactIntoDetail(qc: QueryClient, id: string, contact: Contact) {
  qc.setQueryData<ContactDetail>(["contact", id], (old) =>
    old ? { ...old, contact } : old,
  );
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ContactInput> }) =>
      updateContact(id, data),
    onSuccess: (updated, { id }) => {
      writeContactIntoDetail(qc, id, updated);
      qc.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export function useArchiveContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => archiveContact(id),
    onSuccess: (updated, id) => {
      writeContactIntoDetail(qc, id, updated);
      qc.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export function useUnarchiveContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unarchiveContact(id),
    onSuccess: (updated, id) => {
      writeContactIntoDetail(qc, id, updated);
      qc.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: NewClientInput) => createClient(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });
}

export function useDeleteImpact(id: string | null) {
  return useQuery({
    queryKey: ["contact-delete-impact", id],
    queryFn: () => fetchDeleteImpact(id!),
    enabled: !!id,
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteClientPermanently(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });
}

export function useVinculos(id: string | null) {
  return useQuery({
    queryKey: ["vinculos", id],
    queryFn: () => fetchVinculos(id as string),
    enabled: !!id,
  });
}

/** Vincular o desvincular toca a DOS fichas (la persona y su titular), así que
 *  se invalidan todos los vínculos y todas las fichas, no sólo la de `id`. */
function invalidarFamilia(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["vinculos"] });
  qc.invalidateQueries({ queryKey: ["contact"] });
  qc.invalidateQueries({ queryKey: ["contacts"] });
}

export function useSetTitular() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TitularInput }) => setTitular(id, data),
    onSuccess: () => invalidarFamilia(qc),
  });
}

export function useUnionPreview(id: string, duplicadoId: string | null) {
  return useQuery({
    queryKey: ["union-preview", id, duplicadoId],
    queryFn: () => fetchUnionPreview(id, duplicadoId as string),
    enabled: !!duplicadoId,
    // Es una cuenta del momento: no reusar una vieja.
    gcTime: 0,
  });
}

export function useUnirContactos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, duplicadoId }: { id: string; duplicadoId: string }) =>
      unirContactos(id, duplicadoId),
    onSuccess: () => {
      invalidarFamilia(qc);
      qc.invalidateQueries({ queryKey: ["conversations"] });
      qc.invalidateQueries({ queryKey: ["conversation"] });
    },
  });
}
