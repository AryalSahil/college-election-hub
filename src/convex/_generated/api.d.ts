/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activity from "../activity.js";
import type * as adminAuth from "../adminAuth.js";
import type * as auth from "../auth.js";
import type * as auth_emailOtp from "../auth/emailOtp.js";
import type * as candidates from "../candidates.js";
import type * as display from "../display.js";
import type * as election from "../election.js";
import type * as helpers from "../helpers.js";
import type * as http from "../http.js";
import type * as images from "../images.js";
import type * as notifications from "../notifications.js";
import type * as officeBearers from "../officeBearers.js";
import type * as posts from "../posts.js";
import type * as resets from "../resets.js";
import type * as settings from "../settings.js";
import type * as users from "../users.js";
import type * as voting from "../voting.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activity: typeof activity;
  adminAuth: typeof adminAuth;
  auth: typeof auth;
  "auth/emailOtp": typeof auth_emailOtp;
  candidates: typeof candidates;
  display: typeof display;
  election: typeof election;
  helpers: typeof helpers;
  http: typeof http;
  images: typeof images;
  notifications: typeof notifications;
  officeBearers: typeof officeBearers;
  posts: typeof posts;
  resets: typeof resets;
  settings: typeof settings;
  users: typeof users;
  voting: typeof voting;
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
