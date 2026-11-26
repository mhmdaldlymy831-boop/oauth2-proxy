import { deleteNote, getNote, serializeNote, updateNote } from "@/lib/notes";
import { requireViewer } from "@/lib/viewer";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const viewer = await requireViewer(request);
  if (viewer instanceof Response) return viewer;
  const { id } = await params;
  const note = await getNote(id, viewer.sub, viewer.stage);
  if (!note) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(
    { note: serializeNote(note) },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function PATCH(request: Request, { params }: Params) {
  const viewer = await requireViewer(request);
  if (viewer instanceof Response) return viewer;
  const { id } = await params;

  let body: { title?: string; body?: string; tags?: string[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const note = await updateNote(id, viewer.sub, viewer.stage, body);
  if (!note) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(
    { note: serializeNote(note) },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function DELETE(request: Request, { params }: Params) {
  const viewer = await requireViewer(request);
  if (viewer instanceof Response) return viewer;
  const { id } = await params;
  const ok = await deleteNote(id, viewer.sub, viewer.stage);
  if (!ok) return Response.json({ error: "Not found" }, { status: 404 });
  return new Response(null, {
    status: 204,
    headers: { "cache-control": "private, no-store" },
  });
}
