import { enlaceDeGmail, enlaceDeWhatsApp } from "./canal";

/**
 * Lo que va en lugar del cuadro de "Escribí un mensaje…" en una consulta del
 * formulario de la web. Desde el Inbox sólo se responde por WhatsApp, y esta
 * persona no escribió por WhatsApp: se le contesta por fuera.
 */
export function ResponderFueraDelInbox({
  telefono,
  email,
  nombre,
  consulta,
}: {
  telefono: string | null;
  email: string | null;
  nombre: string | null;
  /** Lo último que escribió, para citarlo en el mail. */
  consulta: string | null;
}) {
  const whatsapp = enlaceDeWhatsApp(telefono);
  const boton =
    "rounded-full border border-surface-highest px-3 py-1.5 text-sm hover:bg-surface-high";
  return (
    <div className="border-t border-surface-high p-3">
      <p className="text-sm text-ink-soft">
        Esta consulta llegó por el formulario de la web: no se responde desde acá.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {whatsapp && (
          <a href={whatsapp} target="_blank" rel="noreferrer" className={boton}>
            Responder por WhatsApp
          </a>
        )}
        {email && (
          <a
            href={enlaceDeGmail(email, { nombre, consulta })}
            target="_blank"
            rel="noreferrer"
            className={boton}
          >
            Responder por mail
          </a>
        )}
        {/* Un teléfono que no se pudo convertir en enlace se muestra igual:
            Laura lo puede copiar o llamar. */}
        {!whatsapp && telefono && (
          <span className="text-sm text-ink-soft">Teléfono que dejó: {telefono}</span>
        )}
      </div>
    </div>
  );
}
