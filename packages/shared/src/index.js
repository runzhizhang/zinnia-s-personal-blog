import { z } from "zod";

export const visibilityEnum = z.enum(["public", "password", "private"]);
export const postTypeEnum = z.enum(["text", "image", "video", "audio", "link"]);

export const postInputSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  content: z.string().min(1),
  type: postTypeEnum.default("text"),
  visibility: visibilityEnum.default("public"),
  password: z.string().optional(),
  tags: z.array(z.string().min(1).max(30)).default([]),
  location: z.string().max(120).optional(),
  scheduledAt: z.string().datetime().optional(),
  isDraft: z.boolean().default(false)
});

export const searchInputSchema = z.object({
  q: z.string().optional(),
  tag: z.string().optional(),
  before: z.string().datetime().optional(),
  after: z.string().datetime().optional()
});

export function parseSearchSyntax(query = "") {
  const parts = query.split(/\s+/).filter(Boolean);
  const parsed = { q: "", tag: undefined, before: undefined, after: undefined };
  const rest = [];
  for (const part of parts) {
    if (part.startsWith("tag:")) parsed.tag = part.slice(4);
    else if (part.startsWith("before:")) parsed.before = part.slice(7);
    else if (part.startsWith("after:")) parsed.after = part.slice(6);
    else rest.push(part);
  }
  parsed.q = rest.join(" ");
  return parsed;
}
