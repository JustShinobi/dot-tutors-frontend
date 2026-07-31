import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Tutor",
  robots: { index: false, follow: false },
};

/**
 * Layout of the widget surface.
 *
 * Deliberately bare: the PRD (4.2.1) asks for a route that renders *only* the chat. No header,
 * no navigation, no link back to the admin — this page runs inside someone else's site, and
 * anything extra would be both visual noise and an information leak.
 *
 * `h-full` all the way down is what makes the widget fill the iframe exactly, so the message
 * list scrolls internally instead of the iframe growing a scrollbar of its own.
 */
export default function EmbedLayout({ children }: { children: ReactNode }) {
  return <div className="bg-background h-full">{children}</div>;
}
