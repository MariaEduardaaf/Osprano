/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as adminActions from "../adminActions.js";
import type * as billing from "../billing.js";
import type * as demo from "../demo.js";
import type * as events from "../events.js";
import type * as foursquare from "../foursquare.js";
import type * as http from "../http.js";
import type * as leads from "../leads.js";
import type * as lib_compliance from "../lib/compliance.js";
import type * as lib_contrast from "../lib/contrast.js";
import type * as lib_domain from "../lib/domain.js";
import type * as lib_enrich from "../lib/enrich.js";
import type * as lib_env from "../lib/env.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_osm from "../lib/osm.js";
import type * as lib_outreachAi from "../lib/outreachAi.js";
import type * as lib_site from "../lib/site.js";
import type * as lib_stripe from "../lib/stripe.js";
import type * as model_previews from "../model/previews.js";
import type * as model_tenant from "../model/tenant.js";
import type * as model_uploads from "../model/uploads.js";
import type * as model_workspace from "../model/workspace.js";
import type * as osm from "../osm.js";
import type * as outreach from "../outreach.js";
import type * as places from "../places.js";
import type * as previews from "../previews.js";
import type * as scoring from "../scoring.js";
import type * as suppressions from "../suppressions.js";
import type * as whatsapp from "../whatsapp.js";
import type * as workspaces from "../workspaces.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  adminActions: typeof adminActions;
  billing: typeof billing;
  demo: typeof demo;
  events: typeof events;
  foursquare: typeof foursquare;
  http: typeof http;
  leads: typeof leads;
  "lib/compliance": typeof lib_compliance;
  "lib/contrast": typeof lib_contrast;
  "lib/domain": typeof lib_domain;
  "lib/enrich": typeof lib_enrich;
  "lib/env": typeof lib_env;
  "lib/errors": typeof lib_errors;
  "lib/osm": typeof lib_osm;
  "lib/outreachAi": typeof lib_outreachAi;
  "lib/site": typeof lib_site;
  "lib/stripe": typeof lib_stripe;
  "model/previews": typeof model_previews;
  "model/tenant": typeof model_tenant;
  "model/uploads": typeof model_uploads;
  "model/workspace": typeof model_workspace;
  osm: typeof osm;
  outreach: typeof outreach;
  places: typeof places;
  previews: typeof previews;
  scoring: typeof scoring;
  suppressions: typeof suppressions;
  whatsapp: typeof whatsapp;
  workspaces: typeof workspaces;
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
