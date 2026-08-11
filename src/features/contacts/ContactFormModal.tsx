import { useState } from "react";
import type { Contact, ContactInput } from "../../api/contacts";

const field =
  "rounded border border-surface-highest bg-surface px-3 py-2 text-sm";

export function ContactFormModal({
  contact,
  onClose,
  onSave,
}: {
  contact: Contact | null;
  onClose: () => void;
  onSave: (data: ContactInput) => void;
}) {
  const [name, setName] = useState(contact?.name ?? "");
  const [phone, setPhone] = useState(contact?.phone ?? "");
  const [email, setEmail] = useState(contact?.email ?? "");
  const [whatsappId, setWhatsappId] = useState(contact?.whatsappId ?? "");
  const [instagramId, setInstagramId] = useState(contact?.instagramId ?? "");
  const [facebookId, setFacebookId] = useState(contact?.facebookId ?? "");
  const [birthdate, setBirthdate] = useState(contact?.birthdate ?? "");
  const [tags, setTags] = useState((contact?.tags ?? []).join(", "));
  const [preferredService, setPreferredService] = useState(contact?.preferredService ?? "");
  const [address, setAddress] = useState(contact?.address ?? "");
  const [city, setCity] = useState(contact?.city ?? "");
  const [postalCode, setPostalCode] = useState(contact?.postalCode ?? "");
  const [country, setCountry] = useState(contact?.country ?? "");
  const [notes, setNotes] = useState(contact?.notes ?? "");

  function handleSubmit() {
    if (!name.trim()) return;
    const clean = (s: string) => s.trim() || undefined;
    const tagList = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    onSave({
      name: name.trim(),
      phone: clean(phone),
      email: clean(email),
      whatsappId: clean(whatsappId),
      instagramId: clean(instagramId),
      facebookId: clean(facebookId),
      birthdate: clean(birthdate),
      tags: tagList.length ? tagList : undefined,
      preferredService: clean(preferredService),
      address: clean(address),
      city: clean(city),
      postalCode: clean(postalCode),
      country: clean(country),
      notes: clean(notes),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-surface-low p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-semibold text-primary">
          {contact ? "Editar contacto" : "Nuevo contacto"}
        </h2>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Datos básicos</p>
            <input className={field} placeholder="Nombre *" value={name} onChange={(e) => setName(e.target.value)} />
            <input className={field} placeholder="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <input className={field} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Canales</p>
            <input className={field} placeholder="WhatsApp ID" value={whatsappId} onChange={(e) => setWhatsappId(e.target.value)} />
            <input className={field} placeholder="Instagram ID" value={instagramId} onChange={(e) => setInstagramId(e.target.value)} />
            <input className={field} placeholder="Facebook ID" value={facebookId} onChange={(e) => setFacebookId(e.target.value)} />
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Extra</p>
            <label className="text-xs text-ink-soft">
              Cumpleaños
              <input type="date" className={`${field} mt-1 w-full`} value={birthdate} onChange={(e) => setBirthdate(e.target.value)} />
            </label>
            <input className={field} placeholder="Tags (separados por coma)" value={tags} onChange={(e) => setTags(e.target.value)} />
            <input className={field} placeholder="Servicio preferido" value={preferredService} onChange={(e) => setPreferredService(e.target.value)} />
            <input className={field} placeholder="Dirección" value={address} onChange={(e) => setAddress(e.target.value)} />
            <div className="flex gap-3">
              <input className={`${field} flex-1`} placeholder="Ciudad" value={city} onChange={(e) => setCity(e.target.value)} />
              <input className={`${field} w-28`} placeholder="CP" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
              <input className={`${field} w-20`} placeholder="País" value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
            <textarea className={`${field} min-h-20`} placeholder="Notas" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button className="rounded-full px-4 py-1.5 text-sm text-ink-soft hover:bg-surface-high" onClick={onClose}>
            Cancelar
          </button>
          <button className="rounded-full bg-primary px-4 py-1.5 text-sm text-white hover:bg-primary-dark" onClick={handleSubmit}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
