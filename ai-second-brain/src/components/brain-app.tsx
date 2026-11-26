"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { FormEvent } from "react";
import type { ClientNote } from "@/lib/types";

type Mode = "capture" | "library" | "ask";

function messageText(parts: { type: string; text?: string }[] | undefined) {
  if (!parts) return "";
  return parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text)
    .join("\n");
}

export function BrainApp() {
  const [mode, setMode] = useState<Mode>("capture");
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [viewerName, setViewerName] = useState("You");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [captureTitle, setCaptureTitle] = useState("");
  const [captureBody, setCaptureBody] = useState("");
  const [captureTags, setCaptureTags] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editTags, setEditTags] = useState("");
  const [askInput, setAskInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  const selected = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? null,
    [notes, selectedId],
  );

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat" }),
    [],
  );

  const { messages, sendMessage, status, setMessages } = useChat({
    transport,
  });

  const asking = status === "submitted" || status === "streaming";

  async function refresh(seed = false, q?: string) {
    setError(null);
    const params = new URLSearchParams();
    if (seed) params.set("seed", "1");
    if (q?.trim()) params.set("q", q.trim());
    const res = await fetch(`/api/notes?${params.toString()}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      setError("Could not load notes.");
      setLoading(false);
      return;
    }
    const data = (await res.json()) as {
      notes: ClientNote[];
      viewer?: { name?: string };
    };
    setNotes(data.notes);
    if (data.viewer?.name) setViewerName(data.viewer.name);
    if (!selectedId && data.notes[0]) setSelectedId(data.notes[0].id);
    setLoading(false);
  }

  useEffect(() => {
    void refresh(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mode !== "library") return;
    const handle = setTimeout(() => {
      startTransition(() => {
        void refresh(false, query);
      });
    }, 220);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, mode]);

  useEffect(() => {
    if (!selected) {
      setEditTitle("");
      setEditBody("");
      setEditTags("");
      return;
    }
    setEditTitle(selected.title);
    setEditBody(selected.body);
    setEditTags(selected.tags.join(", "));
  }, [selected]);

  async function onCapture(e: FormEvent) {
    e.preventDefault();
    if (!captureTitle.trim() && !captureBody.trim()) return;
    setError(null);
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: captureTitle.trim() || undefined,
        body: captureBody,
        tags: captureTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      }),
    });
    if (!res.ok) {
      setError("Could not save the note.");
      return;
    }
    const data = (await res.json()) as { note: ClientNote };
    setNotes((prev) => [data.note, ...prev.filter((n) => n.id !== data.note.id)]);
    setSelectedId(data.note.id);
    setCaptureTitle("");
    setCaptureBody("");
    setCaptureTags("");
    setMode("library");
  }

  async function onSaveSelected(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError(null);
    const res = await fetch(`/api/notes/${selected.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: editTitle,
        body: editBody,
        tags: editTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      }),
    });
    if (!res.ok) {
      setError("Could not update the note.");
      return;
    }
    const data = (await res.json()) as { note: ClientNote };
    setNotes((prev) => prev.map((n) => (n.id === data.note.id ? data.note : n)));
  }

  async function onDeleteSelected() {
    if (!selected) return;
    const res = await fetch(`/api/notes/${selected.id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Could not delete the note.");
      return;
    }
    const next = notes.filter((n) => n.id !== selected.id);
    setNotes(next);
    setSelectedId(next[0]?.id ?? null);
  }

  async function onAsk(e: FormEvent) {
    e.preventDefault();
    const text = askInput.trim();
    if (!text || asking) return;
    setAskInput("");
    await sendMessage({ text });
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="atmosphere" aria-hidden />
      <div className="grain" aria-hidden />

      <header className="relative z-10 flex items-center justify-between gap-4 px-5 py-4 md:px-8">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-xl text-moss-deep"
            style={{ fontVariationSettings: '"SOFT" 40, "WONK" 0.35' }}
          >
            Second Brain
          </Link>
          <span className="hidden text-sm text-ink-soft/70 sm:inline">
            for {viewerName}
          </span>
        </div>
        <nav className="flex items-center gap-1 rounded-full border border-[var(--line)] bg-white/50 p-1 backdrop-blur">
          {(
            [
              ["capture", "Capture"],
              ["library", "Library"],
              ["ask", "Ask"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={`rounded-full px-3.5 py-1.5 text-sm transition ${
                mode === id
                  ? "bg-moss text-white"
                  : "text-ink-soft hover:bg-mist/70"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 pb-10 pt-2 md:px-8">
        {error ? (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        {mode === "capture" ? (
          <section className="animate-rise mx-auto w-full max-w-2xl">
            <h1
              className="font-[family-name:var(--font-display)] text-4xl text-moss-deep md:text-5xl"
              style={{ fontVariationSettings: '"SOFT" 55, "WONK" 0.55' }}
            >
              Capture
            </h1>
            <p className="mt-2 text-ink-soft">
              Drop a thought before it fades. Tags optional.
            </p>
            <form onSubmit={onCapture} className="panel mt-8 space-y-4 rounded-3xl p-5 md:p-7">
              <input
                className="input-shell font-[family-name:var(--font-display)] text-2xl"
                placeholder="Title"
                value={captureTitle}
                onChange={(e) => setCaptureTitle(e.target.value)}
                style={{ fontVariationSettings: '"SOFT" 30' }}
              />
              <textarea
                className="input-shell min-h-48 resize-y leading-relaxed"
                placeholder="What do you want to remember?"
                value={captureBody}
                onChange={(e) => setCaptureBody(e.target.value)}
              />
              <input
                className="input-shell"
                placeholder="Tags — product, meetings, ideas"
                value={captureTags}
                onChange={(e) => setCaptureTags(e.target.value)}
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-ink-soft/80">
                  {notes.length} notes in your mind
                </p>
                <button type="submit" className="btn btn-primary">
                  Save note
                </button>
              </div>
            </form>
          </section>
        ) : null}

        {mode === "library" ? (
          <section className="animate-rise grid flex-1 gap-5 lg:grid-cols-[0.95fr_1.35fr]">
            <div className="panel flex min-h-[28rem] flex-col rounded-3xl p-4 md:p-5">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <h1
                    className="font-[family-name:var(--font-display)] text-3xl text-moss-deep"
                    style={{ fontVariationSettings: '"SOFT" 50, "WONK" 0.45' }}
                  >
                    Library
                  </h1>
                  <p className="text-sm text-ink-soft">
                    {pending ? "Searching…" : `${notes.length} notes`}
                  </p>
                </div>
              </div>
              <input
                className="input-shell mb-3"
                placeholder="Search titles, bodies, tags"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="scroll-thin flex-1 space-y-1 overflow-y-auto pr-1">
                {loading ? (
                  <p className="p-3 text-sm text-ink-soft">Loading…</p>
                ) : notes.length === 0 ? (
                  <p className="p-3 text-sm text-ink-soft">
                    No notes yet. Capture one to begin.
                  </p>
                ) : (
                  notes.map((note) => (
                    <button
                      key={note.id}
                      type="button"
                      className="note-row w-full rounded-2xl px-3 py-3 text-left"
                      data-active={note.id === selectedId}
                      onClick={() => setSelectedId(note.id)}
                    >
                      <p className="font-semibold text-ink">{note.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-ink-soft">
                        {note.body || "Empty note"}
                      </p>
                      {note.tags.length > 0 ? (
                        <p className="mt-2 text-xs tracking-wide text-moss">
                          {note.tags.join(" · ")}
                        </p>
                      ) : null}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="panel rounded-3xl p-4 md:p-6">
              {selected ? (
                <form onSubmit={onSaveSelected} className="flex h-full flex-col gap-4">
                  <input
                    className="input-shell font-[family-name:var(--font-display)] text-2xl"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                  />
                  <textarea
                    className="input-shell min-h-64 flex-1 resize-y leading-relaxed"
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                  />
                  <input
                    className="input-shell"
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    placeholder="Tags"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => void onDeleteSelected()}
                    >
                      Delete
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Save changes
                    </button>
                  </div>
                </form>
              ) : (
                <p className="text-ink-soft">Select a note to edit.</p>
              )}
            </div>
          </section>
        ) : null}

        {mode === "ask" ? (
          <section className="animate-rise mx-auto flex w-full max-w-3xl flex-1 flex-col">
            <h1
              className="font-[family-name:var(--font-display)] text-4xl text-moss-deep md:text-5xl"
              style={{ fontVariationSettings: '"SOFT" 55, "WONK" 0.55' }}
            >
              Ask
            </h1>
            <p className="mt-2 text-ink-soft">
              Questions are answered from your notes. Sample mode works without
              a live model key.
            </p>

            <div className="panel mt-6 flex min-h-[26rem] flex-1 flex-col rounded-3xl p-4 md:p-6">
              <div className="scroll-thin flex-1 space-y-4 overflow-y-auto pr-1">
                {messages.length === 0 ? (
                  <div className="rounded-2xl bg-mist/60 p-4 text-sm text-ink-soft">
                    Try: “What did Sara want for v1?” or “What are my product
                    principles?”
                    <div className="mt-3 flex flex-wrap gap-2">
                      {[
                        "What are my product principles?",
                        "What did Sara want?",
                        "How should I protect focus?",
                      ].map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          className="rounded-full border border-[var(--line)] bg-white/70 px-3 py-1.5 text-left text-xs text-ink-soft hover:border-moss/40"
                          onClick={() => {
                            setAskInput(prompt);
                          }}
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((message) => {
                    const text = messageText(message.parts);
                    const mine = message.role === "user";
                    return (
                      <div
                        key={message.id}
                        className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                          mine
                            ? "ml-auto bg-moss text-white"
                            : "bg-white/75 text-ink"
                        }`}
                      >
                        {text || (asking && !mine ? "Thinking…" : "")}
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={onAsk} className="mt-4 flex gap-2">
                <input
                  className="input-shell"
                  placeholder="Ask your Second Brain…"
                  value={askInput}
                  onChange={(e) => setAskInput(e.target.value)}
                />
                <button
                  type="submit"
                  className="btn btn-primary shrink-0"
                  disabled={asking || !askInput.trim()}
                >
                  {asking ? "…" : "Ask"}
                </button>
              </form>
              {messages.length > 0 ? (
                <button
                  type="button"
                  className="mt-3 self-start text-xs text-ink-soft underline-offset-2 hover:underline"
                  onClick={() => setMessages([])}
                >
                  Clear conversation
                </button>
              ) : null}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
