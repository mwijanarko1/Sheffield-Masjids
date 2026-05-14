import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const DEFAULT_CITY = {
  slug: "sheffield",
  name: "Sheffield",
  region: "South Yorkshire",
  countryCode: "GB",
  countryName: "United Kingdom",
  timezone: "Europe/London",
  lat: 53.3811,
  lng: -1.4701,
};

const cityValidator = v.object({
  slug: v.string(),
  name: v.string(),
  region: v.optional(v.string()),
  countryCode: v.string(),
  countryName: v.string(),
  timezone: v.string(),
  lat: v.optional(v.number()),
  lng: v.optional(v.number()),
});

const mosqueValidator = v.object({
  id: v.string(),
  name: v.string(),
  address: v.string(),
  lat: v.number(),
  lng: v.number(),
  slug: v.string(),
  citySlug: v.optional(v.string()),
  cityName: v.optional(v.string()),
  countryCode: v.optional(v.string()),
  countryName: v.optional(v.string()),
  timezone: v.optional(v.string()),
  website: v.optional(v.string()),
  isHidden: v.optional(v.boolean()),
});

function normalizeCitySlug(citySlug) {
  const normalized = citySlug.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
    throw new Error("Invalid citySlug");
  }
  return normalized;
}

function mosqueResponse(m) {
  const citySlug = m.citySlug ?? DEFAULT_CITY.slug;
  const cityName = m.cityName ?? DEFAULT_CITY.name;
  const countryCode = m.countryCode ?? DEFAULT_CITY.countryCode;
  const countryName = m.countryName ?? DEFAULT_CITY.countryName;
  const timezone = m.timezone ?? DEFAULT_CITY.timezone;
  const isHidden = !!m.isHidden;

  return {
    id: m.id,
    name: m.name,
    address: m.address,
    lat: m.lat,
    lng: m.lng,
    slug: m.slug,
    citySlug,
    cityName,
    countryCode,
    countryName,
    timezone,
    website: m.website,
    isHidden,
    // Expo currently accepts snake_case from Convex; keep both during the transition.
    is_hidden: isHidden,
  };
}

function sortMosques(mosques) {
  return mosques.slice().sort((a, b) => {
    const city = a.cityName.localeCompare(b.cityName);
    if (city !== 0) return city;
    return a.name.localeCompare(b.name);
  });
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const mosques = await ctx.db.query("mosques").collect();
    return sortMosques(mosques.map(mosqueResponse));
  },
});

export const listByCity = query({
  args: { citySlug: v.string() },
  handler: async (ctx, args) => {
    const citySlug = normalizeCitySlug(args.citySlug);
    const mosques = await ctx.db.query("mosques").collect();

    return sortMosques(
      mosques
        .map(mosqueResponse)
        .filter((m) => m.citySlug === citySlug)
    );
  },
});

export const listCities = query({
  args: {},
  handler: async (ctx) => {
    const storedCities = await ctx.db.query("cities").collect();
    const bySlug = new Map();

    for (const city of storedCities) {
      bySlug.set(city.slug, city);
    }

    const mosques = await ctx.db.query("mosques").collect();
    for (const mosque of mosques) {
      const m = mosqueResponse(mosque);
      if (!bySlug.has(m.citySlug)) {
        bySlug.set(m.citySlug, {
          slug: m.citySlug,
          name: m.cityName,
          countryCode: m.countryCode,
          countryName: m.countryName,
          timezone: m.timezone,
        });
      }
    }

    return Array.from(bySlug.values()).sort((a, b) => {
      const country = a.countryName.localeCompare(b.countryName);
      if (country !== 0) return country;
      return a.name.localeCompare(b.name);
    });
  },
});

export const upsertCity = mutation({
  args: cityValidator,
  handler: async (ctx, args) => {
    const slug = normalizeCitySlug(args.slug);
    const existing = await ctx.db
      .query("cities")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();

    const doc = { ...args, slug };
    if (existing) {
      await ctx.db.patch(existing._id, doc);
      return { updated: existing._id };
    }

    return { inserted: await ctx.db.insert("cities", doc) };
  },
});

export const upsert = mutation({
  args: mosqueValidator,
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("mosques")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    const citySlug = args.citySlug ? normalizeCitySlug(args.citySlug) : DEFAULT_CITY.slug;
    const doc = {
      id: args.id,
      name: args.name,
      address: args.address,
      lat: args.lat,
      lng: args.lng,
      slug: args.slug,
      citySlug,
      cityName: args.cityName ?? DEFAULT_CITY.name,
      countryCode: args.countryCode ?? DEFAULT_CITY.countryCode,
      countryName: args.countryName ?? DEFAULT_CITY.countryName,
      timezone: args.timezone ?? DEFAULT_CITY.timezone,
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
