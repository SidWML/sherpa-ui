/** Mock backend: one JSON file on disk (.data/db.json). It holds the whole demo state so data is kept between reloads and shared
 *  between browser windows. Nothing here is real: no auth, no database. Delete the file or press "Reset demo data" to start over. */
import { promises as fs } from "fs";
import path from "path";

const FILE = path.join(process.cwd(), ".data", "db.json");
type Db = { rev: number; state: unknown };

async function read(): Promise<Db | null> {
  try { return JSON.parse(await fs.readFile(FILE, "utf8")) as Db; } catch { return null; }
}
const noStore = { headers: { "cache-control": "no-store" } };

export async function GET(req: Request) {
  void req.headers; // reading the request keeps this route dynamic
  return Response.json((await read()) ?? { rev: 0, state: null }, noStore);
}

export async function PUT(req: Request) {
  let body: { state?: unknown };
  try { body = await req.json(); } catch { return Response.json({ error: "bad json" }, { status: 400 }); }
  if (!body.state || typeof body.state !== "object") return Response.json({ error: "no state" }, { status: 400 });
  const rev = ((await read())?.rev ?? 0) + 1;
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify({ rev, state: body.state }));
  return Response.json({ rev }, noStore);
}

export async function DELETE(req: Request) {
  void req.headers;
  try { await fs.unlink(FILE); } catch { /* already gone */ }
  return Response.json({ ok: true }, noStore);
}
