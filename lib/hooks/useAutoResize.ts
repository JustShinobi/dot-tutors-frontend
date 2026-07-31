"use client";

import { useEffect, useRef, type RefObject } from "react";

import { RESIZE_MESSAGE, type ResizeMessage } from "@/lib/embed-messaging";

/**
 * Reports the widget's *natural* content height to the host page.
 *
 * The measurement is not `document.documentElement.scrollHeight`, which is the obvious choice
 * and the wrong one here: the widget fills the iframe (`h-full`) and scrolls internally, so the
 * document height equals the iframe height and never changes. Reporting it produces a resize
 * message that is always the size the host already chose — a feature that looks implemented and
 * does nothing.
 *
 * What the host actually needs is the height the conversation *would* occupy: the header, the
 * unconstrained message content, and the composer. The scroll container's inner wrapper grows
 * freely, so a `ResizeObserver` on it fires exactly when the answer grows.
 *
 * Two details that matter:
 *
 * * The target origin is `"*"`. That looks careless and is not: the widget genuinely does not
 *   know which site embedded it, and the payload is a number the host already knows. Nothing
 *   secret is sent. The *host* is the side that must verify `event.origin`, which is what the
 *   integration guide tells it to do.
 * * Identical heights are not re-sent. A host that resizes its iframe in response would
 *   otherwise change the content box and feed back into an endless loop.
 */
export function useAutoResize({
  embedKey,
  contentRef,
  chromeRefs,
  enabled = true,
}: {
  embedKey: string;
  /** Wrapper inside the scroll container; its height is the unconstrained conversation height. */
  contentRef: RefObject<HTMLElement | null>;
  /** Fixed parts around the scroll area (header, composer). */
  chromeRefs: RefObject<HTMLElement | null>[];
  enabled?: boolean;
}): void {
  const lastHeight = useRef(0);

  useEffect(() => {
    if (!enabled || window.parent === window) return;

    const content = contentRef.current;
    if (content === null) return;

    const post = () => {
      const chrome = chromeRefs.reduce((total, ref) => total + (ref.current?.offsetHeight ?? 0), 0);
      const natural = Math.ceil(content.scrollHeight + chrome);

      if (natural <= 0 || natural === lastHeight.current) return;
      lastHeight.current = natural;

      const message: ResizeMessage = { type: RESIZE_MESSAGE, height: natural, embedKey };
      window.parent.postMessage(message, "*");
    };

    post();

    const observer = new ResizeObserver(post);
    observer.observe(content);
    for (const ref of chromeRefs) {
      if (ref.current) observer.observe(ref.current);
    }

    return () => observer.disconnect();
    // `chromeRefs` is a stable literal from the caller; the refs themselves never change identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedKey, enabled, contentRef]);
}
