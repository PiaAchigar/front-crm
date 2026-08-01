import { apiFetch } from "./client";

export type AIProvider = "anthropic" | "openai";

export type AICredential = {
  id: string;
  provider: string;
  model: string;
  is_active: boolean;
  created_at: string;
};

export type AICredentialCreate = {
  provider: AIProvider;
  api_key: string;
  model: string;
};

export type ValidateApiKeyResult = {
  valid: boolean;
  error?: string;
};

export function getAICredentials(): Promise<AICredential[]> {
  return apiFetch("/api/ai-config/credentials");
}

export function saveAICredential(credential: AICredentialCreate): Promise<AICredential> {
  return apiFetch("/api/ai-config/credentials", {
    method: "POST",
    body: JSON.stringify(credential),
  });
}

export function deactivateCredential(id: string): Promise<AICredential> {
  return apiFetch(`/api/ai-config/credentials/${id}/deactivate`, {
    method: "PATCH",
  });
}

export function validateAPIKey(
  provider: AIProvider,
  api_key: string,
  model: string,
): Promise<ValidateApiKeyResult> {
  return apiFetch("/api/ai-config/validate", {
    method: "POST",
    body: JSON.stringify({ provider, api_key, model }),
  });
}
