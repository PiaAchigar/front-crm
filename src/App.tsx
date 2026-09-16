import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ContactsPage } from "./features/contacts/ContactsPage";
import { ContactDetailPage } from "./features/contacts/ContactDetailPage";
import { PipelinePage } from "./features/pipeline/PipelinePage";
import { InboxPage } from "./features/inbox/InboxPage";
import { AutomationPage } from "./features/automation/AutomationPage";
import { ChannelsPage } from "./features/channels/ChannelsPage";
import { ConfigureLLMPage } from "./features/ai-config/ConfigureLLMPage";
import { useCrmSession } from "./lib/session";
import { destinoDeArranque, rutaGuardada, useRecordarRuta } from "./lib/ruta-recordada";

/** Una clave por app: el CRM y la agenda no comparten origin, pero sí el hábito. */
const CLAVE_DE_RUTA = "piubella:crm:ruta";

/**
 * La raíz del iframe. Devuelve a la usuaria donde estaba antes de recargar, o
 * al Inbox la primera vez. Ver `lib/ruta-recordada.ts`.
 */
function DondeEstaba() {
  return <Navigate to={destinoDeArranque(rutaGuardada(CLAVE_DE_RUTA), "/inbox")} replace />;
}

/** Las rutas, anotando la pantalla actual a medida que cambia. */
function Rutas() {
  useRecordarRuta(CLAVE_DE_RUTA);
  return (
    <Routes>
      <Route path="/" element={<DondeEstaba />} />
      <Route path="/inbox" element={<InboxPage />} />
      <Route path="/automatizacion" element={<AutomationPage />} />
      <Route path="/automatizacion/llm-config" element={<ConfigureLLMPage />} />
      <Route path="/pipeline" element={<PipelinePage />} />
      <Route path="/contactos" element={<ContactsPage />} />
      <Route path="/contactos/:id" element={<ContactDetailPage />} />
      <Route path="/canales" element={<ChannelsPage />} />
    </Routes>
  );
}

export default function App() {
  const { ready, role } = useCrmSession();

  if (!ready) {
    return (
      <div className="flex h-[100dvh] items-center justify-center text-sm text-ink-soft">
        Conectando con el panel…
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AppShell role={role}>
        <Rutas />
      </AppShell>
    </BrowserRouter>
  );
}
