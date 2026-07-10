/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as leads from "../leads.js";
import type * as lib_domain from "../lib/domain.js";
import type * as lib_enrich from "../lib/enrich.js";
import type * as model_tenant from "../model/tenant.js";
import type * as places from "../places.js";
import type * as previews from "../previews.js";
import type * as scoring from "../scoring.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  leads: typeof leads;
  "lib/domain": typeof lib_domain;
  "lib/enrich": typeof lib_enrich;
  "model/tenant": typeof model_tenant;
  places: typeof places;
  previews: typeof previews;
  scoring: typeof scoring;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
