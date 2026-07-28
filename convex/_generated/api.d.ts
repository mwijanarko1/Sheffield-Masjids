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
import type * as lib_iqamahChangeDetect from "../lib/iqamahChangeDetect.js";
import type * as lib_pushTransport from "../lib/pushTransport.js";
import type * as mosques from "../mosques.js";
import type * as prayerTimes from "../prayerTimes.js";
import type * as pushDelivery from "../pushDelivery.js";
import type * as pushProviders from "../pushProviders.js";
import type * as pushSend from "../pushSend.js";
import type * as pushSubscriptions from "../pushSubscriptions.js";
import type * as seed from "../seed.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  "lib/iqamahChangeDetect": typeof lib_iqamahChangeDetect;
  "lib/pushTransport": typeof lib_pushTransport;
  mosques: typeof mosques;
  prayerTimes: typeof prayerTimes;
  pushDelivery: typeof pushDelivery;
  pushProviders: typeof pushProviders;
  pushSend: typeof pushSend;
  pushSubscriptions: typeof pushSubscriptions;
  seed: typeof seed;
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
