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
  archiveContact,
  createClient,
  deleteClientPermanently,
  fetchContact,
  fetchContacts,
  fetchDeleteImpact,
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
