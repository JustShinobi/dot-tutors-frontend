import { ChatWidget } from "@/components/chat/ChatWidget";

/** The page loaded by the integrator's `<iframe>`. */
export default async function EmbedPage({ params }: { params: Promise<{ embedKey: string }> }) {
  const { embedKey } = await params;
  return <ChatWidget embedKey={embedKey} />;
}
