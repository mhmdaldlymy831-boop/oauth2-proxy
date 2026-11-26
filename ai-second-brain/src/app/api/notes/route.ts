import {
  createNote,
  ensureSampleNotes,
  listNotes,
  serializeNote,
} from "@/lib/notes";
import { requireViewer } from "@/lib/viewer";

export async function GET(request: Request) {
  const viewer = await requireViewer(request);
  if (viewer instanceof Response) return viewer;

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? undefined;
  const seed = url.searchParams.get("seed") === "1";

  const notes = seed
    ? await ensureSampleNotes(viewer.sub, viewer.stage)
    : await listNotes(viewer.sub, viewer.stage, q);

  return Response.json(
    { notes: notes.map(serializeNote), viewer: { name: viewer.name } },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function POST(request: Request) {
  const viewer = await requireViewer(request);
  if (viewer instanceof Response) return viewer;

  let body: { title?: string; body?: string; tags?: string[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.title?.trim() && !body.body?.trim()) {
    return Response.json(
      { error: "Title or body is required" },
      { status: 400 },
    );
  }

  const note = await createNote(viewer.sub, viewer.stage, {
    title: body.title?.trim() || body.body!.trim().slice(0, 72),
    body: body.body ?? "",
    tags: body.tags,
  });

  return Response.json(
    { note: serializeNote(note) },
    { status: 201, headers: { "cache-control": "private, no-store" } },
  );
}
