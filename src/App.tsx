import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ContactsPage } from "./features/contacts/ContactsPage";
import { PipelinePage } from "./features/pipeline/PipelinePage";

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/pipeline" replace />} />
          <Route path="/contactos" element={<ContactsPage />} />
          <Route path="/pipeline" element={<PipelinePage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
