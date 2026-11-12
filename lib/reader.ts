import type { Equip, Input, Photo } from "./types";

/** What the photo reader found in the photos. */
export interface Reading {
  subject: "unit" | "site" | "notice" | "none";
  equip: Equip;
  brand: Input["brand"];
  number?: string;
  servicer: Input["servicer"];
  capacity?: string;
  ageGuess?: number;
  sees: string;
}

/** Asks the server-side photo reader (a vision model). Returns null when no reader is connected. */
export async function readPhotos(photos: Photo[], hint: string): Promise<Reading | null> {
  const images = photos.filter((p) => p.url).map((p) => p.url as string).slice(0, 4);
  if (!images.length) return null;
  try {
    const r = await fetch("/api/read", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ images, hint }) });
    if (!r.ok) return null;
    return (await r.json()) as Reading;
  } catch { return null; }
}
