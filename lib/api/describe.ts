import { ApiError } from "./client";

/**
 * Turn an unknown thrown value into a message worth showing.
 *
 * The backend already returns a user-safe message for every expected failure, so preferring it
 * over a generic string keeps the two repositories telling the same story.
 */
export function describeError(caught: unknown, fallback: string): string {
  if (caught instanceof ApiError) return caught.message;
  return fallback;
}
