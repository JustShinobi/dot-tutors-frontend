/** Shape of the backend's error envelope. */

export interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
    request_id?: string | null;
    details?: {
      fields?: { field: string; message: string }[];
      retry_after_seconds?: number;
    };
  };
}
