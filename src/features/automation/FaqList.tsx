// src/features/automation/FaqList.tsx
import { useState } from "react";
import type { AutomationFaq } from "../../api/automationFaqs";
import { FaqFormModal } from "./FaqFormModal";
import { useAutomationFaqs, useDeleteAutomationFaq, useUpdateAutomationFaq } from "./useAutomationFaqs";

export function FaqList({ canManage }: { canManage: boolean }) {
  const { data: faqs = [], isLoading, isError } = useAutomationFaqs();
  const update = useUpdateAutomationFaq();
  const remove = useDeleteAutomationFaq();
  const [editing, setEditing] = useState<AutomationFaq | null>(null);
  const [creating, setCreating] = useState(false);

  if (isLoading) return <p className="text-sm text-ink-soft">Cargando FAQs…</p>;
  if (isError) return <p className="text-sm text-red-600">No pudimos cargar las FAQs.</p>;

  return (
    <div className="flex flex-col gap-2">
      {canManage && (
        <div className="flex justify-end">
          <button
            className="rounded-full bg-primary px-4 py-1.5 text-sm text-white hover:bg-primary-dark"
            onClick={() => setCreating(true)}
          >
            + Nueva FAQ
          </button>
        </div>
      )}

      {faqs.length === 0 ? (
        <p className="text-sm text-ink-soft">Todavía no hay FAQs. Creá la primera.</p>
      ) : (
        faqs.map((f) => (
          <div
            key={f.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-surface-highest bg-surface-low p-3"
          >
            <div>
              <p className="font-medium">{f.question ?? f.answer ?? "—"}</p>
              <p className="text-xs text-ink-soft">
                {(f.keywords ?? []).map((k) => `#${k}`).join(" ")}
              </p>
            </div>
            {canManage && (
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-ink-soft">
                  <input
                    type="checkbox"
                    checked={f.isActive ?? false}
                    onChange={(e) =>
                      update.mutate({
                        id: f.id,
                        data: {
                          question: f.question ?? null,
                          answer: f.answer ?? "",
                          keywords: f.keywords ?? [],
                          isActive: e.target.checked,
                        },
                      })
                    }
                  />
                  Activa
                </label>
                <button className="text-xs text-primary hover:underline" onClick={() => setEditing(f)}>
                  Editar
                </button>
                <button
                  className="text-xs text-red-600 hover:underline"
                  onClick={() => remove.mutate(f.id)}
                >
                  Borrar
                </button>
              </div>
            )}
          </div>
        ))
      )}

      {(creating || editing) && (
        <FaqFormModal
          faq={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
