"use client";

import { useEffect, useRef, useState } from "react";

import { isResizeMessage } from "@/lib/embed-messaging";

/**
 * Reference implementation of the host side of the embed.
 *
 * This is what an integrator would copy: listen for the resize message, **verify the origin**,
 * and adjust the iframe. It doubles as proof that the contract in `lib/embed-messaging.ts`
 * actually works across a real document boundary.
 */
export function ResizingEmbed({
  embedUrl,
  embedKey,
  title,
  initialHeight = 620,
  maxHeight = 900,
}: {
  embedUrl: string;
  embedKey: string;
  title: string;
  initialHeight?: number;
  maxHeight?: number;
}) {
  const [height, setHeight] = useState(initialHeight);
  const widgetOrigin = useRef<string>("");

  useEffect(() => {
    try {
      widgetOrigin.current = new URL(embedUrl).origin;
    } catch {
      widgetOrigin.current = "";
    }
  }, [embedUrl]);

  useEffect(() => {
    function handle(event: MessageEvent) {
      // Any frame can post to this window, so the message type proves nothing on its own.
      // Checking the origin is the host's responsibility, and skipping it is the mistake this
      // example exists to not make.
      if (!widgetOrigin.current || event.origin !== widgetOrigin.current) return;
      if (!isResizeMessage(event.data) || event.data.embedKey !== embedKey) return;

      // Clamped: a runaway height from a buggy widget must not take over the host page.
      setHeight(Math.min(Math.max(event.data.height, 240), maxHeight));
    }

    window.addEventListener("message", handle);
    return () => window.removeEventListener("message", handle);
  }, [embedKey, maxHeight]);

  return (
    <iframe
      src={embedUrl}
      title={title}
      width={400}
      height={height}
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
      className="border-border mt-3 rounded-xl border transition-[height] duration-200"
      data-testid="widget-frame"
    />
  );
}
