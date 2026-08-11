import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { can, type Role } from "../lib/permissions";

const TABS: { to: string; label: string; icon: string }[] = [
  { to: "/inbox", label: "Inbox", icon: "📥" },
  { to: "/automatizacion", label: "Automatización", icon: "⚙️" },
  { to: "/pipeline", label: "Pipeline", icon: "📊" },
  { to: "/contactos", label: "Clientes", icon: "👥" },
  { to: "/canales", label: "Canales", icon: "🔌" },
];

export function AppShell({
  children,
  role,
}: {
  children: ReactNode;
  role: Role | null;
}) {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm transition-colors ${
      isActive ? "bg-primary text-white" : "text-ink-soft hover:bg-surface-high"
    }`;

  const showNav = can(role, "crm", "view");

  return (
    <div className="flex h-[100dvh] flex-col">
      {/* pt-6: offset superior para cuando el CRM va embebido en el iframe del dashboard */}
      <header className="shrink-0 border-b border-surface-high bg-surface-low/90 pt-6 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 pb-3">
          <div>
            <h1 className="text-3xl font-semibold leading-none text-primary">PiuBella</h1>
            <p className="text-[11px] uppercase tracking-[0.25em] text-ink-soft">CRM</p>
          </div>
          {showNav && (
            <nav className="flex flex-wrap gap-2">
              {TABS.map((tab) => (
                <NavLink key={tab.to} to={tab.to} className={linkClass}>
                  <span aria-hidden>{tab.icon}</span>
                  {tab.label}
                </NavLink>
              ))}
            </nav>
          )}
        </div>
      </header>
      <main className="mx-auto min-h-0 w-full max-w-6xl flex-1 overflow-y-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
