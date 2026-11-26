import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
} from "ai";
import { searchNotesForAsk, serializeNote } from "@/lib/notes";
import { requireViewer } from "@/lib/viewer";

export const maxDuration = 60;

function lastUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== "user") continue;
    const parts = message.parts ?? [];
    const text = parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("\n")
      .trim();
    if (text) return text;
  }
  return "";
}

function sampleAnswer(
  question: string,
  sources: ReturnType<typeof serializeNote>[],
) {
  if (sources.length === 0) {
    return `I searched your Second Brain for “${question}” but found no matching notes yet. Capture a thought first, then ask again.`;
  }
  const lines = sources.map(
    (n, i) =>
      `${i + 1}. ${n.title} — ${n.body.slice(0, 160)}${n.body.length > 160 ? "…" : ""}`,
  );
  return [
    `Sample mode — live model answers unlock once AI Gateway is connected.\n`,
    `Here is what I found related to “${question}”:\n`,
    ...lines,
    `\nRefine with a name, tag, or project, or capture the missing piece next.`,
  ].join("\n");
}

export async function POST(request: Request) {
  const viewer = await requireViewer(request);
  if (viewer instanceof Response) return viewer;

  let payload: { messages?: UIMessage[] };
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const messages = payload.messages ?? [];
  const question = lastUserText(messages);
  if (!question) {
    return Response.json({ error: "Empty question" }, { status: 400 });
  }

  const hits = await searchNotesForAsk(viewer.sub, viewer.stage, question);
  const sources = hits.map(serializeNote);
  const sourceHeader = JSON.stringify(
    sources.map((s) => ({ id: s.id, title: s.title })),
  );
  const context = sources
    .map(
      (n) =>
        `### ${n.title}\nTags: ${(n.tags ?? []).join(", ") || "none"}\n${n.body}`,
    )
    .join("\n\n");

  const hasGateway = Boolean(process.env.AI_GATEWAY_API_KEY?.trim());

  if (!hasGateway) {
    const text = sampleAnswer(question, sources);
    const stream = createUIMessageStream({
      execute({ writer }) {
        const id = crypto.randomUUID();
        writer.write({ type: "text-start", id });
        writer.write({ type: "text-delta", id, delta: text });
        writer.write({ type: "text-end", id });
      },
    });
    return createUIMessageStreamResponse({
      stream,
      headers: {
        "x-second-brain-mode": "sample",
        "x-second-brain-sources": sourceHeader,
        "cache-control": "private, no-store",
      },
    });
  }

  const result = streamText({
    model: "openai/gpt-5-mini",
    system: [
      "You are Second Brain, a calm personal knowledge assistant.",
      "Answer only from the user's notes below. If the notes are insufficient, say what is missing.",
      "Cite note titles inline when you use them. Be concise and concrete.",
      "Never invent facts that are not in the notes.",
      "",
      "Notes:",
      context || "(no matching notes)",
    ].join("\n"),
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({
    headers: {
      "x-second-brain-sources": sourceHeader,
      "cache-control": "private, no-store",
    },
  });
}
