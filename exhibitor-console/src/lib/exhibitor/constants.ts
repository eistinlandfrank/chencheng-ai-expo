// Client-safe constants shared across exhibitor UI (no drizzle/server imports).
export const BOOTH_CATEGORY_KEYS = ["robot", "ai", "chip", "hardware", "software", "service"] as const;
export type BoothCategory = (typeof BOOTH_CATEGORY_KEYS)[number];
export const RELATION_KIND_KEYS = ["interest", "itinerary", "reserve", "checkin"] as const;
