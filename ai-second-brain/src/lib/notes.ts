import { sql } from "./db";

export type Note = {
  id: string;
  owner_id: string;
  stage: string;
  title: string;
  body: string;
  tags: string[];
  created_at: string;
  updated_at: string;
};

const SAMPLE_NOTES = [
  {
    title: "Product principles",
    body: "Ship the smallest useful surface first. Prefer one clear action over five options. Keep the brand visible in every first viewport. Write for the reader, not the database.",
    tags: ["product", "craft"],
  },
  {
    title: "Weekly focus",
    body: "Protect two deep-work blocks before noon. Batch messages after lunch. End the day by capturing three open loops into Second Brain so tomorrow starts clean.",
    tags: ["habits", "focus"],
  },
  {
    title: "Meeting with Sara",
    body: "Sara wants a lightweight capture flow that works from phone. Voice notes later. For v1: title, body, tags, and Ask that cites sources. No folders yet.",
    tags: ["meetings", "roadmap"],
  },
];

export async function listNotes(
  ownerId: string,
  stage: string,
  query?: string,
): Promise<Note[]> {
  const q = query?.trim();
  if (q) {
    const like = `%${q}%`;
    return sql<Note>(
      `select * from notes
       where owner_id = $1 and stage = $2
         and (title ilike $3 or body ilike $3 or array_to_string(tags, ' ') ilike $3)
       order by updated_at desc`,
      [ownerId, stage, like],
    );
  }
  return sql<Note>(
    `select * from notes where owner_id = $1 and stage = $2 order by updated_at desc`,
    [ownerId, stage],
  );
}

export async function getNote(
  id: string,
  ownerId: string,
  stage: string,
): Promise<Note | null> {
  const rows = await sql<Note>(
    `select * from notes where id = $1 and owner_id = $2 and stage = $3`,
    [id, ownerId, stage],
  );
  return rows[0] ?? null;
}

export async function createNote(
  ownerId: string,
  stage: string,
  input: { title: string; body?: string; tags?: string[] },
): Promise<Note> {
  const id = crypto.randomUUID();
  const title = input.title.trim() || "Untitled";
  const body = input.body?.trim() ?? "";
  const tags = (input.tags ?? []).map((t) => t.trim()).filter(Boolean);
  const rows = await sql<Note>(
    `insert into notes (id, owner_id, stage, title, body, tags)
     values ($1, $2, $3, $4, $5, $6)
     returning *`,
    [id, ownerId, stage, title, body, tags],
  );
  return rows[0];
}

export async function updateNote(
  id: string,
  ownerId: string,
  stage: string,
  input: { title?: string; body?: string; tags?: string[] },
): Promise<Note | null> {
  const existing = await getNote(id, ownerId, stage);
  if (!existing) return null;
  const title = input.title?.trim() ?? existing.title;
  const body = input.body ?? existing.body;
  const tags =
    input.tags?.map((t) => t.trim()).filter(Boolean) ?? existing.tags;
  const rows = await sql<Note>(
    `update notes
     set title = $1, body = $2, tags = $3, updated_at = now()
     where id = $4 and owner_id = $5 and stage = $6
     returning *`,
    [title, body, tags, id, ownerId, stage],
  );
  return rows[0] ?? null;
}

export async function deleteNote(
  id: string,
  ownerId: string,
  stage: string,
): Promise<boolean> {
  const rows = await sql<{ id: string }>(
    `delete from notes where id = $1 and owner_id = $2 and stage = $3 returning id`,
    [id, ownerId, stage],
  );
  return rows.length > 0;
}

export async function searchNotesForAsk(
  ownerId: string,
  stage: string,
  question: string,
  limit = 6,
): Promise<Note[]> {
  const tokens = question
    .toLowerCase()
    .split(/[^a-z0-9\u0600-\u06ff]+/i)
    .filter((t) => t.length > 2)
    .slice(0, 8);

  if (tokens.length === 0) {
    return sql<Note>(
      `select * from notes where owner_id = $1 and stage = $2 order by updated_at desc limit $3`,
      [ownerId, stage, limit],
    );
  }

  const patterns = tokens.map((t) => `%${t}%`);
  const clauses = patterns
    .map(
      (_, i) =>
        `(title ilike $${i + 3} or body ilike $${i + 3} or array_to_string(tags, ' ') ilike $${i + 3})`,
    )
    .join(" or ");

  return sql<Note>(
    `select * from notes
     where owner_id = $1 and stage = $2 and (${clauses})
     order by updated_at desc
     limit $${patterns.length + 3}`,
    [ownerId, stage, ...patterns, limit],
  );
}

export async function ensureSampleNotes(
  ownerId: string,
  stage: string,
): Promise<Note[]> {
  const existing = await listNotes(ownerId, stage);
  if (existing.length > 0) return existing;
  const created: Note[] = [];
  for (const sample of SAMPLE_NOTES) {
    created.push(await createNote(ownerId, stage, sample));
  }
  return created;
}

export function serializeNote(note: Note) {
  return {
    id: note.id,
    title: note.title,
    body: note.body,
    tags: note.tags ?? [],
    createdAt: note.created_at,
    updatedAt: note.updated_at,
  };
}
