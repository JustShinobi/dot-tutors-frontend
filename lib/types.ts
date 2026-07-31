/**
 * Types mirroring the backend schemas.
 *
 * Kept hand-written rather than generated from the OpenAPI document: the surface is small, and
 * an explicit file makes the contract between the two repositories visible to a reader.
 */

export type TutorStatus = "active" | "inactive";
export type SourceKind = "url" | "inline_text";
export type MessageRole = "user" | "assistant" | "system";

export interface Source {
  id: string;
  kind: SourceKind;
  label: string;
  url: string | null;
  max_bytes: number;
  is_active: boolean;
  created_at: string;
}

export interface ModelSettings {
  model?: string | null;
  temperature?: number | null;
  max_tool_calls?: number | null;
  max_output_tokens?: number | null;
}

/** A source as the agent sees it, rather than as it was typed in. */
export interface SourceStatus {
  source_id: string;
  label: string;
  kind: SourceKind;
  url: string | null;
  characters: number;
  section_count: number;
  available: boolean;
  error: string | null;
}

export interface Tutor {
  id: string;
  title: string;
  slug: string;
  description: string;
  system_instructions: string;
  greeting: string | null;
  status: TutorStatus;
  model_settings: ModelSettings;
  sources: Source[];
  created_at: string;
  updated_at: string;
}

export interface TutorSummary {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: TutorStatus;
  created_at: string;
  updated_at: string;
}

export interface TutorPage {
  items: TutorSummary[];
  total: number;
  page: number;
  size: number;
}

export interface EmbedKey {
  id: string;
  tutor_id: string;
  public_key: string;
  label: string;
  allowed_origins: string[];
  is_active: boolean;
  created_at: string;
  revoked_at: string | null;
  last_used_at: string | null;
}

export interface EmbedSnippet {
  tutor_id: string;
  tutor_title: string;
  public_key: string;
  embed_url: string;
  iframe_html: string;
  allowed_origins: string[];
  notes: string[];
}

export interface AdminProfile {
  id: string;
  email: string;
  role: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// --- embed runtime ---------------------------------------------------------

export interface TutorPublicProfile {
  id: string;
  title: string;
  description: string;
  greeting: string | null;
}

export interface Citation {
  source_id: string;
  label: string;
  url: string | null;
  snippet: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  citations: Citation[] | null;
  created_at: string;
}

export interface EmbedSession {
  session_token: string;
  token_type: string;
  expires_in: number;
  tutor: TutorPublicProfile;
  history: ChatMessage[];
}

// --- payloads --------------------------------------------------------------

export interface SourceInput {
  kind: SourceKind;
  label: string;
  url?: string;
  content?: string;
}

export interface TutorInput {
  title: string;
  description?: string;
  system_instructions: string;
  greeting?: string | null;
  sources?: SourceInput[];
}
