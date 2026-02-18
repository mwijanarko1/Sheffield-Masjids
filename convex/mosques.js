import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const mosqueValidator = v.object({
  id: v.string(),
  name: v.string(),
  address: v.string(),
  lat: v.number(),
  lng: v.number(),
  slug: v.string(),
  website: v.optional(v.string()),
  isHidden: v.optional(v.boolean()),
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const mosques = await ctx.db.query("mosques").collect();
    return mosques
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((m) => ({
        id: m.id,
        name: m.name,
        address: m.address,
        lat: m.lat,
        lng: m.lng,
        slug: m.slug,
        website: m.website,
        isHidden: !!m.isHidden,
      }));
  },
});

export const upsert = mutation({
  args: mosqueValidator,
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("mosques")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    const doc = {
      id: args.id,
      name: args.name,
      address: args.address,
      lat: args.lat,
      lng: args.lng,
      slug: args.slug,
      website: args.website,
      isHidden: args.isHidden ?? false,
    };

    if (existing) {
      await ctx.db.patch(existing._id, doc);
      return { updated: existing._id };
    }

    return { inserted: await ctx.db.insert("mosques", doc) };
  },
});
