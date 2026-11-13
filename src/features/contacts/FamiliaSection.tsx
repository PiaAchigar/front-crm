import { useState } from "react";
import { Link } from "react-router-dom";
import type { Contact } from "../../api/contacts";
import { DesvincularModal } from "./DesvincularModal";
import { ParentescoModal } from "./ParentescoModal";
import { etiquetaDeParentesco } from "./parentescos";
import { UnirContactoModal } from "./UnirContactoModal";
import { useSetTitular, useVinculos } from "./useContacts";

export function FamiliaSection({ contact }: { contact: Contact }) {
  const { data } = useVinculos(contact.id);
  const setTitular = useSetTitular();
  const [vinculando, setVinculando] = useState<{ id: string; name: string | null } | null>(null);
  const [uniendo, setUniendo] = useState(false);
  const [desvinculando, setDesvinculando] = useState<{ id: string; name: string | null } | null>(null);

  const nombre = contact.name ?? "esta persona";
  const numero = contact.whatsappId ?? contact.phone ?? "";

  return (
    <section className="rounded-xl border border-surface-high bg-surface-low p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-soft">
        WhatsApp y familia
      </h2>

      <div className="flex flex-col gap-3 text-sm">
        {data?.titular && (
          <div className="flex flex-wrap items-center gap-2">
            <p>
              <Link to={`/contactos/${data.titular.id}`} className="text-primary hover:underline">
                {data.titular.name ?? "Sin nombre"}
              </Link>{" "}
              está a cargo de {contact.name ?? "Sin nombre"} ({contact.name ?? "Sin nombre"} es su{" "}
              {etiquetaDeParentesco(data.titular.relationship, data.titular.relationshipOther).toLowerCase()}
              ) · usa su WhatsApp
            </p>
            <button
              className="text-xs text-ink-soft underline hover:text-ink"
              disabled={setTitular.isPending}
              onClick={() => setDesvinculando({ id: contact.id, name: contact.name })}
            >
              Desvincular
            </button>
          </div>
        )}

        {data && data.aCargo.length > 0 && (
          <div>
            <p>Titular de {numero}</p>
            <p className="mt-1 text-ink-soft">Está a cargo de:</p>
            <ul className="mt-1 flex flex-col gap-1">
              {data.aCargo.map((p) => (
                <li key={p.id} className="flex items-center gap-2">
                  <span>
                    <Link to={`/contactos/${p.id}`} className="text-primary hover:underline">
                      {p.name ?? "Sin nombre"}
                    </Link>{" "}
                    ({etiquetaDeParentesco(p.relationship, p.relationshipOther)})
                  </span>
                  <button
                    className="text-xs text-ink-soft underline hover:text-ink"
                    disabled={setTitular.isPending}
                    onClick={() => setDesvinculando({ id: p.id, name: p.name })}
                  >
                    Desvincular
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {data && data.compartenNumero.length > 0 && (
          <div>
            <p className="text-ink-soft">Comparten este número</p>
            <ul className="mt-1 flex flex-col gap-1">
              {data.compartenNumero.map((p) => (
                <li key={p.id} className="flex items-center gap-2">
                  <Link to={`/contactos/${p.id}`} className="text-primary hover:underline">
                    {p.name ?? "Sin nombre"}
                  </Link>
                  {/* Si esta ficha ya tiene titular (el titular está a cargo de ella), no puede ser titular de otra (la API lo rechaza). */}
                  {!data.titular && (
                    <button
                      className="rounded-full border border-surface-highest px-3 py-0.5 text-xs hover:bg-surface-high"
                      onClick={() => setVinculando(p)}
                    >
                      Vincular
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {data && !data.titular && data.aCargo.length === 0 && data.compartenNumero.length === 0 && (
          <p className="text-ink-soft">Usa su propio WhatsApp. No comparte el número con nadie.</p>
        )}

        <div>
          <button
            className="rounded-full border border-surface-highest px-4 py-1.5 text-sm text-ink-soft hover:bg-surface-high"
            onClick={() => setUniendo(true)}
          >
            Unir con otro contacto
          </button>
        </div>
      </div>

      {vinculando && (
        <ParentescoModal
          titulo={`¿Qué es ${vinculando.name ?? "esta persona"} de ${nombre}?`}
          isPending={setTitular.isPending}
          error={setTitular.error ? (setTitular.error as Error).message : null}
          onClose={() => {
            setVinculando(null);
            setTitular.reset();
          }}
          // La persona vinculada pasa a usar el WhatsApp de ESTA ficha.
          onConfirm={(elegido) =>
            setTitular.mutate(
              { id: vinculando.id, data: { holderContactId: contact.id, ...elegido } },
              { onSuccess: () => setVinculando(null) },
            )
          }
        />
      )}
      {desvinculando && (
        <DesvincularModal
          nombre={desvinculando.name ?? "esta persona"}
          isPending={setTitular.isPending}
          error={setTitular.error ? (setTitular.error as Error).message : null}
          onClose={() => {
            setDesvinculando(null);
            setTitular.reset();
          }}
          onConfirm={(telefonoPropio) =>
            setTitular.mutate(
              { id: desvinculando.id, data: { holderContactId: null, telefonoPropio } },
              { onSuccess: () => setDesvinculando(null) },
            )
          }
        />
      )}
      {uniendo && <UnirContactoModal contact={contact} onClose={() => setUniendo(false)} />}
    </section>
  );
}
