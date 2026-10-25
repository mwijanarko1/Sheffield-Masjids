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
import type * as feedback from "../feedback.js";
import type * as lib_feedbackIntake from "../lib/feedbackIntake.js";
import type * as lib_feedbackLimits from "../lib/feedbackLimits.js";
import type * as lib_iqamahChangeDetect from "../lib/iqamahChangeDetect.js";
import type * as lib_pushTransport from "../lib/pushTransport.js";
import type * as lib_rateLimitBuckets from "../lib/rateLimitBuckets.js";
import type * as lib_readAccess from "../lib/readAccess.js";
import type * as mosques from "../mosques.js";
import type * as prayerTimes from "../prayerTimes.js";
import type * as pushDelivery from "../pushDelivery.js";
import type * as pushProviders from "../pushProviders.js";
import type * as pushSend from "../pushSend.js";
import type * as pushSubscriptions from "../pushSubscriptions.js";
import type * as rateLimits from "../rateLimits.js";
import type * as seed from "../seed.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  feedback: typeof feedback;
  "lib/feedbackIntake": typeof lib_feedbackIntake;
  "lib/feedbackLimits": typeof lib_feedbackLimits;
  "lib/iqamahChangeDetect": typeof lib_iqamahChangeDetect;
  "lib/pushTransport": typeof lib_pushTransport;
  "lib/rateLimitBuckets": typeof lib_rateLimitBuckets;
  "lib/readAccess": typeof lib_readAccess;
  mosques: typeof mosques;
  prayerTimes: typeof prayerTimes;
  pushDelivery: typeof pushDelivery;
  pushProviders: typeof pushProviders;
  pushSend: typeof pushSend;
  pushSubscriptions: typeof pushSubscriptions;
  rateLimits: typeof rateLimits;
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
