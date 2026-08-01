import { useState } from "react";
import { validateAPIKey, type AICredential, type AIProvider } from "../../api/ai-config";
import { ApiError } from "../../api/client";
import { ProviderStatusBadge } from "../../components/ProviderStatusBadge";
import { can } from "../../lib/permissions";
import { useCrmSession } from "../../lib/session";
import { useAICredentialsList, useDeactivateAICredential, useSaveAICredential } from "./useAICredentials";

const PROVIDER_LABELS: Record<AIProvider, string> = {
  anthropic: "Anthropic (Claude)",
  openai: "OpenAI",
};

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Ocurrió un error inesperado";
}

/** Form modal: valida la key contra el proveedor real ANTES de guardar. El
 *  submit encadena validateAPIKey → saveAICredential; si la validación falla
 *  no se guarda nada. */
function CredentialFormModal({ onClose }: { onClose: () => void }) {
  const [provider, setProvider] = useState<AIProvider>("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = useSaveAICredential();

  const busy = validating || save.isPending;

  async function handleSubmit() {
    setError(null);
    if (!apiKey.trim() || !model.trim()) {
      setError("Completá la API key y el modelo");
      return;
    }

    setValidating(true);
    let validation;
    try {
      validation = await validateAPIKey(provider, apiKey.trim(), model.trim());
    } catch (err) {
      setValidating(false);
      setError(errorMessage(err));
      return;
    }
    setValidating(false);

    if (!validation.valid) {
      setError(validation.error ?? "La API key no es válida");
      return;
    }

    save.mutate(
      { provider, api_key: apiKey.trim(), model: model.trim() },
      { onSuccess: onClose, onError: (err) => setError(errorMessage(err)) },
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-surface-low p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-semibold text-primary">Configurar proveedor</h2>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-soft">Proveedor</span>
            <select
              className="rounded border border-surface-highest bg-surface px-3 py-2 text-sm"
              value={provider}
              onChange={(e) => setProvider(e.target.value as AIProvider)}
            >
              <option value="anthropic">{PROVIDER_LABELS.anthropic}</option>
              <option value="openai">{PROVIDER_LABELS.openai}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-soft">API Key</span>
            <input
              type="password"
              autoComplete="off"
              className="rounded border border-surface-highest bg-surface px-3 py-2 text-sm"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-soft">Modelo</span>
            <input
              type="text"
              placeholder="claude-3-5-sonnet"
              className="rounded border border-surface-highest bg-surface px-3 py-2 text-sm"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            className="rounded-full px-4 py-1.5 text-sm text-ink-soft hover:bg-surface-high"
            onClick={onClose}
            disabled={busy}
          >
            Cancelar
          </button>
          <button
            className="rounded-full bg-primary px-4 py-1.5 text-sm text-white hover:bg-primary-dark disabled:opacity-50"
            disabled={busy}
            onClick={() => void handleSubmit()}
          >
            {validating ? "Validando..." : save.isPending ? "Guardando..." : "Validar y guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConfigureLLMPage() {
  const { role } = useCrmSession();
  const canManage = can(role, "crm", "manage");

  const { data: credentials = [], isLoading, isError, error, refetch } = useAICredentialsList();
  const deactivate = useDeactivateAICredential();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Proveedores de IA</h1>
          <p className="text-sm text-ink-soft">
            Credenciales de Anthropic/OpenAI para que la cloud function RAG, los scripts y el
            chatbot de n8n puedan usar el modelo configurado.
          </p>
        </div>
        {canManage && (
          <button
            className="rounded-full bg-primary px-4 py-1.5 text-sm text-white hover:bg-primary-dark"
            onClick={() => setModalOpen(true)}
          >
            + Configurar Proveedor
          </button>
        )}
      </div>

      {(isError || deactivate.isError) && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <span>{errorMessage(deactivate.error ?? error)}</span>
          <button className="underline" onClick={() => void refetch()}>
            Reintentar
          </button>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-ink-soft">Cargando credenciales…</p>
      ) : credentials.length === 0 ? (
        <p className="text-sm text-ink-soft">
          Todavía no hay proveedores configurados. Agregá el primero.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {credentials.map((cred: AICredential) => (
            <div
              key={cred.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-surface-highest bg-surface-low p-3"
            >
              <div>
                <p className="font-medium">
                  {PROVIDER_LABELS[cred.provider as AIProvider] ?? cred.provider}
                </p>
                <p className="text-xs text-ink-soft">Modelo: {cred.model}</p>
              </div>
              <div className="flex items-center gap-3">
                <ProviderStatusBadge is_active={cred.is_active} />
                {canManage && cred.is_active && (
                  <button
                    className="text-xs text-red-600 hover:underline disabled:opacity-50"
                    disabled={deactivate.isPending && deactivate.variables === cred.id}
                    onClick={() => deactivate.mutate(cred.id)}
                  >
                    {deactivate.isPending && deactivate.variables === cred.id
                      ? "Desactivando..."
                      : "Desactivar"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && <CredentialFormModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}
