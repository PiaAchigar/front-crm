// src/features/automation/FaqFormModal.tsx
import { useState } from "react";
import type { AutomationFaq, AutomationFaqInput } from "../../api/automationFaqs";
import { useCreateAutomationFaq, useUpdateAutomationFaq } from "./useAutomationFaqs";

export function FaqFormModal({
  faq,
  onClose,
}: {
  faq: AutomationFaq | null;
  onClose: () => void;
}) {
  const create = useCreateAutomationFaq();
  const update = useUpdateAutomationFaq();

  const [question, setQuestion] = useState(faq?.question ?? "");
  const [answer, setAnswer] = useState(faq?.answer ?? "");
  const [keywords, setKeywords] = useState((faq?.keywords ?? []).join(", "));

  const saving = create.isPending || update.isPending;
  const error = create.error ?? update.error;

  const parsedKeywords = keywords
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  const canSave = answer.trim().length > 0 && parsedKeywords.length > 0;

  function save() {
    if (!canSave) return;
    const input: AutomationFaqInput = {
      question: question.trim() || null,
      answer: answer.trim(),
      keywords: parsedKeywords,
      isActive: faq?.isActive ?? true,
    };
    const opts = { onSuccess: onClose };
    if (faq) update.mutate({ id: faq.id, data: input }, opts);
    else create.mutate(input, opts);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-surface-low p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-semibold text-primary">
          {faq ? "Editar FAQ" : "Nueva FAQ"}
        </h2>

        <label className="mb-3 flex flex-col gap-1 text-sm">
          <span className="text-ink-soft">Pregunta (referencia interna, opcional)</span>
          <input
            className="rounded border border-surface-highest bg-surface px-3 py-2 text-sm"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </label>

        <label className="mb-3 flex flex-col gap-1 text-sm">
          <span className="text-ink-soft">Respuesta</span>
          <textarea
            className="rounded border border-surface-highest bg-surface px-3 py-2 text-sm"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />
        </label>

        <label className="mb-4 flex flex-col gap-1 text-sm">
          <span className="text-ink-soft">Palabras clave (separadas por coma)</span>
          <input
            className="rounded border border-surface-highest bg-surface px-3 py-2 text-sm"
            placeholder="hora, horario, abren"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
          />
        </label>

        {error && <p className="mb-2 text-sm text-red-600">{(error as Error).message}</p>}

        <div className="flex justify-end gap-2">
          <button
            className="rounded-full px-4 py-1.5 text-sm text-ink-soft hover:bg-surface-high"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="rounded-full bg-primary px-4 py-1.5 text-sm text-white hover:bg-primary-dark disabled:opacity-50"
            disabled={saving || !canSave}
            onClick={save}
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
