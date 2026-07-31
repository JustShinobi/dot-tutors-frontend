/** Administrative API calls (all require a JWT). */

import type {
  AdminProfile,
  EmbedKey,
  EmbedSnippet,
  SourceInput,
  TokenResponse,
  Tutor,
  TutorInput,
  TutorPage,
  TutorStatus,
} from "@/lib/types";

import { apiFetch } from "./client";

export function login(email: string, password: string): Promise<TokenResponse> {
  return apiFetch<TokenResponse>("/api/v1/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export function getProfile(token: string): Promise<AdminProfile> {
  return apiFetch<AdminProfile>("/api/v1/auth/me", { token });
}

export interface ListTutorsQuery {
  q?: string;
  status?: TutorStatus | "";
  page?: number;
  size?: number;
}

export function listTutors(token: string, query: ListTutorsQuery = {}): Promise<TutorPage> {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.status) params.set("status", query.status);
  params.set("page", String(query.page ?? 1));
  params.set("size", String(query.size ?? 20));

  return apiFetch<TutorPage>(`/api/v1/tutors?${params.toString()}`, { token });
}

export function getTutor(token: string, tutorId: string): Promise<Tutor> {
  return apiFetch<Tutor>(`/api/v1/tutors/${tutorId}`, { token });
}

export function createTutor(token: string, payload: TutorInput): Promise<Tutor> {
  return apiFetch<Tutor>("/api/v1/tutors", { method: "POST", body: payload, token });
}

export function updateTutor(
  token: string,
  tutorId: string,
  payload: Partial<TutorInput>,
): Promise<Tutor> {
  return apiFetch<Tutor>(`/api/v1/tutors/${tutorId}`, { method: "PATCH", body: payload, token });
}

export function setTutorStatus(
  token: string,
  tutorId: string,
  status: TutorStatus,
): Promise<Tutor> {
  const action = status === "active" ? "activate" : "deactivate";
  return apiFetch<Tutor>(`/api/v1/tutors/${tutorId}/${action}`, { method: "POST", token });
}

export function deleteTutor(token: string, tutorId: string): Promise<void> {
  return apiFetch<void>(`/api/v1/tutors/${tutorId}`, { method: "DELETE", token });
}

export function addSource(token: string, tutorId: string, payload: SourceInput): Promise<unknown> {
  return apiFetch(`/api/v1/tutors/${tutorId}/sources`, {
    method: "POST",
    body: payload,
    token,
  });
}

export function removeSource(token: string, tutorId: string, sourceId: string): Promise<void> {
  return apiFetch<void>(`/api/v1/tutors/${tutorId}/sources/${sourceId}`, {
    method: "DELETE",
    token,
  });
}

// --- embed keys ------------------------------------------------------------

export function listEmbedKeys(token: string, tutorId: string): Promise<EmbedKey[]> {
  return apiFetch<EmbedKey[]>(`/api/v1/tutors/${tutorId}/embed-keys`, { token });
}

export function createEmbedKey(
  token: string,
  tutorId: string,
  payload: { label?: string; allowed_origins: string[] },
): Promise<EmbedKey> {
  return apiFetch<EmbedKey>(`/api/v1/tutors/${tutorId}/embed-keys`, {
    method: "POST",
    body: payload,
    token,
  });
}

export function revokeEmbedKey(token: string, keyId: string): Promise<EmbedKey> {
  return apiFetch<EmbedKey>(`/api/v1/embed-keys/${keyId}/revoke`, { method: "POST", token });
}

export function getEmbedSnippet(
  token: string,
  tutorId: string,
  keyId: string,
): Promise<EmbedSnippet> {
  return apiFetch<EmbedSnippet>(
    `/api/v1/tutors/${tutorId}/embed-snippet?key_id=${encodeURIComponent(keyId)}`,
    { token },
  );
}
