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
        <Routes>
          <Route path="/" element={<Navigate to="/pipeline" replace />} />
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/automatizacion" element={<AutomationPage />} />
          <Route path="/automatizacion/llm-config" element={<ConfigureLLMPage />} />
          <Route path="/pipeline" element={<PipelinePage />} />
          <Route path="/contactos" element={<ContactsPage />} />
          <Route path="/contactos/:id" element={<ContactDetailPage />} />
          <Route path="/canales" element={<ChannelsPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
