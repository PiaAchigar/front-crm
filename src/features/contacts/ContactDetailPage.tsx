import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { ContactInput } from "../../api/contacts";
import { ApiError } from "../../api/client";
import { useArchiveContact, useContactDetail, useUpdateContact } from "./useContacts";
import { ContactFormModal } from "./ContactFormModal";
import { formatDate, formatDateTimeToDate } from "../../lib/format";

function money(v: string | null): string {
  return v == null ? "—" : `$${v}`;
}
// createdAt/appointmentStart son instantes UTC; birthdate es una fecha pura
// ("YYYY-MM-DD") que no se debe convertir de zona o muestra el día anterior.
const dateShort = formatDateTimeToDate;
const dateOnly = formatDate;

export function ContactDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useContactDetail(id);
  const update = useUpdateContact();
  const archive = useArchiveContact();
  const [editing, setEditing] = useState(false);

  if (isLoading) return <p className="text-ink-soft">Cargando...</p>;
  if (isError || !data) {
    const isNotFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="flex flex-col gap-3">
        <p className="text-ink-soft">
          {isNotFound
            ? "No encontramos este contacto. Puede que haya sido eliminado."
            : "No pudimos cargar la ficha. Hubo un problema del servidor — probá recargar en un momento."}
        </p>
        <Link to="/contactos" className="text-primary hover:underline">← Contactos</Link>
      </div>
    );
  }

  const { contact, customer, deals, appointments } = data;

  function handleSave(input: ContactInput) {
    update.mutate({ id, data: input }, { onSuccess: () => setEditing(false) });
  }

  function handleArchive() {
    if (!confirm("¿Archivar este contacto? Se ocultará de la lista (no se borra).")) return;
    archive.mutate(id, { onSuccess: () => navigate("/contactos") });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link to="/contactos" className="text-xs text-primary hover:underline">← Contactos</Link>
          <h1 className="mt-1 text-2xl font-semibold text-primary">{contact.name}</h1>
          {contact.isArchived && (
            <div className="mt-1 flex items-center gap-2 text-sm text-ink-soft">
              <span className="rounded-full bg-surface-high px-2 py-0.5">Archivado</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button className="rounded-full bg-primary px-4 py-1.5 text-sm text-white hover:bg-primary-dark" onClick={() => setEditing(true)}>
            Editar
          </button>
          {!contact.isArchived && (
            <button className="rounded-full border border-surface-highest px-4 py-1.5 text-sm text-ink-soft hover:bg-surface-high" onClick={handleArchive}>
              Archivar
            </button>
          )}
        </div>
      </div>

      {/* Datos */}
      <section className="rounded-xl border border-surface-high bg-surface-low p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-soft">Datos</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div><dt className="text-ink-soft">Teléfono</dt><dd>{contact.phone ?? "—"}</dd></div>
          <div><dt className="text-ink-soft">Email</dt><dd>{contact.email ?? "—"}</dd></div>
          <div><dt className="text-ink-soft">WhatsApp</dt><dd>{contact.whatsappId ?? "—"}</dd></div>
          <div><dt className="text-ink-soft">Instagram</dt><dd>{contact.instagramId ?? "—"}</dd></div>
          <div><dt className="text-ink-soft">Facebook</dt><dd>{contact.facebookId ?? "—"}</dd></div>
          <div><dt className="text-ink-soft">Cumpleaños</dt><dd>{dateOnly(contact.birthdate)}</dd></div>
          <div><dt className="text-ink-soft">Servicio preferido</dt><dd>{contact.preferredService ?? "—"}</dd></div>
          <div><dt className="text-ink-soft">Dirección</dt><dd>{contact.address ?? "—"}</dd></div>
          <div><dt className="text-ink-soft">Ciudad</dt><dd>{[contact.city, contact.postalCode, contact.country].filter(Boolean).join(", ") || "—"}</dd></div>
          <div className="col-span-2"><dt className="text-ink-soft">Tags</dt><dd>{contact.tags?.length ? contact.tags.join(", ") : "—"}</dd></div>
          <div className="col-span-2"><dt className="text-ink-soft">Notas</dt><dd className="whitespace-pre-wrap">{contact.notes ?? "—"}</dd></div>
        </dl>
      </section>

      {/* Cuenta (solo si es cliente) */}
      {customer && (
        <section className="rounded-xl border border-surface-high bg-surface-low p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-soft">Cuenta de cliente</h2>
          <dl className="grid grid-cols-3 gap-x-6 text-sm">
            <div><dt className="text-ink-soft">Saldo a favor</dt><dd className="font-medium">{money(customer.creditBalance)}</dd></div>
            <div><dt className="text-ink-soft">DNI</dt><dd>{customer.dni ?? "—"}</dd></div>
            <div><dt className="text-ink-soft">CUIT</dt><dd>{customer.cuit ?? "—"}</dd></div>
          </dl>
        </section>
      )}

      {/* Deals */}
      <section className="rounded-xl border border-surface-high bg-surface-low p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-soft">Deals</h2>
        {deals.length === 0 ? (
          <p className="text-sm text-ink-soft">Sin oportunidades.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-ink-soft">
              <tr><th className="py-1">Servicio</th><th className="py-1">Etapa</th><th className="py-1">Seña</th><th className="py-1">Total</th><th className="py-1">Fecha</th></tr>
            </thead>
            <tbody>
              {deals.map((d) => (
                <tr key={d.id} className={`border-t border-surface-high ${d.cancelled ? "text-ink-soft line-through" : ""}`}>
                  <td className="py-1">{d.title ?? d.serviceName ?? "—"}</td>
                  <td className="py-1">{d.stage}</td>
                  <td className="py-1">{money(d.seniaAmount)}</td>
                  <td className="py-1">{money(d.totalAmount ?? d.servicePrice)}</td>
                  <td className="py-1">{dateShort(d.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Turnos */}
      <section className="rounded-xl border border-surface-high bg-surface-low p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-soft">Turnos</h2>
        {appointments.length === 0 ? (
          <p className="text-sm text-ink-soft">Sin turnos.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-ink-soft">
              <tr><th className="py-1">Servicio</th><th className="py-1">Fecha</th><th className="py-1">Estado</th><th className="py-1">Precio</th></tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a.id} className="border-t border-surface-high">
                  <td className="py-1">{a.serviceName ?? "—"}</td>
                  <td className="py-1">{dateShort(a.appointmentStart)}</td>
                  <td className="py-1">{a.status ?? "—"}</td>
                  <td className="py-1">{money(a.servicePrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-xl border border-surface-high bg-surface-low p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-soft">
          Suscripciones
        </h2>
        {data.subscriptions.length === 0 ? (
          <p className="text-sm text-ink-soft">Sin suscripciones.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-ink-soft">
              <tr>
                <th className="py-1">Estado</th>
                <th className="py-1">Cuota</th>
                <th className="py-1">Desde</th>
              </tr>
            </thead>
            <tbody>
              {data.subscriptions.map((s) => (
                <tr key={s.id} className="border-t border-surface-high">
                  <td className="py-1">{s.status ?? "—"}</td>
                  <td className="py-1">{money(s.monthlyAmount)}</td>
                  <td className="py-1">{formatDate(s.subscriptionStartDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-xl border border-surface-high bg-surface-low p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-soft">
          Facturas
        </h2>
        {data.invoices.length === 0 ? (
          <p className="text-sm text-ink-soft">Sin facturas.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-ink-soft">
              <tr>
                <th className="py-1">Fecha</th>
                <th className="py-1">Número</th>
                <th className="py-1">Estado</th>
                <th className="py-1">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.invoices.map((i) => (
                <tr key={i.id} className="border-t border-surface-high">
                  <td className="py-1">{formatDateTimeToDate(i.invoiceDate)}</td>
                  <td className="py-1">{i.invoiceNumber ?? "—"}</td>
                  <td className="py-1">{i.status ?? "—"}</td>
                  <td className="py-1">{money(i.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {editing && (
        <ContactFormModal contact={contact} onClose={() => setEditing(false)} onSave={handleSave} />
      )}
    </div>
  );
}
