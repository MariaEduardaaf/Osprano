import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { runOsmSearch } from "./osm";
import { runPlacesSearch } from "./places";

/**
 * Descoberta operada pela CLI, sem sessão de navegador, em nome de uma org
 * (`npx convex run --prod adminActions:discover '{"orgId":"user_...","source":"osm",...}'`).
 * Mesma cota, mesma dedupe e mesmo scoring das buscas feitas pela tela.
 */
export const discover = internalAction({
  args: {
    orgId: v.string(),
    source: v.union(v.literal("osm"), v.literal("places")),
    countryCode: v.string(),
    category: v.string(),
    city: v.string(),
    max: v.optional(v.number()),
  },
  handler: async (ctx, { orgId, source, ...args }) => {
    return source === "osm" ? await runOsmSearch(ctx, orgId, args) : await runPlacesSearch(ctx, orgId, args);
  },
});
