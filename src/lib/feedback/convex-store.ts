import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import type { AttemptResult, FeedbackReport, SubmitResult } from "../../../convex/lib/feedbackIntake";
import type { FeedbackStore } from "./intake";

const consumeAttemptRef = makeFunctionReference<
  "mutation",
  { intakeSecret: string; clientKey: string },
  AttemptResult
>("feedback:consumeAttempt");

const submitRef = makeFunctionReference<
  "mutation",
  { intakeSecret: string; clientKey: string; fingerprint: string; report: FeedbackReport },
  SubmitResult
>("feedback:submit");

const recordRejectionRef = makeFunctionReference<
  "mutation",
  { intakeSecret: string; reason: string },
  null
>("feedback:recordRejection");

/**
 * Convex-backed store. Returns null when the deployment URL or intake secret is
 * missing, which intake reports as unavailable rather than accepting reports.
 */
export function createConvexFeedbackStore(env: Record<string, string | undefined>): FeedbackStore | null {
  const url = env.CONVEX_URL?.trim();
  const intakeSecret = env.FEEDBACK_INTAKE_SECRET?.trim();
  if (!url || !intakeSecret) return null;

  const client = new ConvexHttpClient(url);
  return {
    consumeAttempt: (clientKey) => client.mutation(consumeAttemptRef, { intakeSecret, clientKey }),
    submit: ({ report, fingerprint, clientKey }) =>
      client.mutation(submitRef, { intakeSecret, clientKey, fingerprint, report }),
    recordRejection: async (reason) => {
      await client.mutation(recordRejectionRef, { intakeSecret, reason });
    },
  };
}
