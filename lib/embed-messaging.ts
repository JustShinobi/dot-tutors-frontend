/**
 * The `postMessage` contract between the widget and the host page.
 *
 * Kept in one file because both sides must agree on it and it is public API for integrators:
 * changing the message type silently breaks every site already embedding the widget.
 *
 * Messages are namespaced (`dot-tutor:*`) so a host page listening for its own messages can
 * tell ours apart. The host must also check `event.origin` before trusting anything — any frame
 * can post to a window, so the type alone proves nothing.
 */

export const RESIZE_MESSAGE = "dot-tutor:resize";

export interface ResizeMessage {
  type: typeof RESIZE_MESSAGE;
  /** Content height in CSS pixels, already rounded up. */
  height: number;
  /** Echoed back so a page embedding several tutors can tell the frames apart. */
  embedKey: string;
}

export function isResizeMessage(data: unknown): data is ResizeMessage {
  if (typeof data !== "object" || data === null) return false;

  const message = data as Partial<ResizeMessage>;
  return (
    message.type === RESIZE_MESSAGE &&
    typeof message.height === "number" &&
    Number.isFinite(message.height) &&
    message.height > 0 &&
    typeof message.embedKey === "string"
  );
}
