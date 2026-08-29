"use client";

import { request } from "@/lib/api/request";
import type { Booth } from "@/lib/db/schema/booths";
import type { BoothStats, AudienceMember } from "@/lib/db/queries/relations";

export type { Booth, BoothStats, AudienceMember };

export interface AudienceItem extends Omit<AudienceMember, "createdAt"> {
  createdAt: string;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `request_failed_${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchMyBooth(): Promise<Booth> {
  const res = await request("/api/exhibitor/booth");
  return (await json<{ booth: Booth }>(res)).booth;
}

export type BoothPatch = Partial<
  Pick<
    Booth,
    | "name"
    | "category"
    | "intro"
    | "keywords"
    | "recommendMinutes"
    | "imageUrl"
    | "videoUrl"
    | "ownerName"
    | "ownerRole"
    | "ownerOrg"
    | "ownerContact"
    | "zone"
  >
>;

export async function saveMyBooth(patch: BoothPatch): Promise<Booth> {
  const res = await request("/api/exhibitor/booth", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return (await json<{ booth: Booth }>(res)).booth;
}

export async function fetchStats(): Promise<{ stats: BoothStats; booth: { id: string; name: string } }> {
  const res = await request("/api/exhibitor/stats");
  return json(res);
}

export async function fetchAudience(kind?: string): Promise<AudienceItem[]> {
  const qs = kind ? `?kind=${encodeURIComponent(kind)}` : "";
  const res = await request(`/api/exhibitor/audience${qs}`);
  return (await json<{ audience: AudienceItem[] }>(res)).audience;
}

export async function sendMessage(toUserId: string, body: string): Promise<void> {
  const res = await request("/api/exhibitor/message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ toUserId, body }),
  });
  await json(res);
}
