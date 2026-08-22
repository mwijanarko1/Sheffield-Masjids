/**
 * Mockable push transport boundary for APNs + FCM.
 * Production implementations live in pushProviders node action;
 * tests inject fakes that implement this interface shape.
 */

export type PushPlatform = "ios" | "android";

export type IqamahChangePushPayload = {
  kind: "iqamah_times_changed";
  mosqueSlug: string;
  publishEventId: string;
  mosqueName: string;
};

export type PushSendResult =
  | { status: "ok" }
  | { status: "temporary_failure"; message: string }
  | { status: "permanent_failure"; message: string; reason: "unregistered" | "invalid" | "other" };

export type PushTransport = {
  sendIqamahChangeAlert(
    platform: PushPlatform,
    token: string,
    payload: IqamahChangePushPayload,
  ): Promise<PushSendResult>;
};

export type DeliveryPlanItem = {
  token: string;
  platform: PushPlatform;
  fingerprint: string;
};

export type DeliveryOutcome = {
  fingerprint: string;
  token: string;
  result: PushSendResult;
};

/**
 * Pure orchestration helper: skip already-delivered fingerprints, collect outcomes.
 */
export async function deliverToSubscribers(
  transport: PushTransport,
  items: DeliveryPlanItem[],
  alreadyDelivered: Set<string>,
  payload: IqamahChangePushPayload,
): Promise<DeliveryOutcome[]> {
  const outcomes: DeliveryOutcome[] = [];
  for (const item of items) {
    if (alreadyDelivered.has(item.fingerprint)) continue;
    const result = await transport.sendIqamahChangeAlert(item.platform, item.token, payload);
    outcomes.push({ fingerprint: item.fingerprint, token: item.token, result });
  }
  return outcomes;
}

type PartitionedDeliveryOutcomes = {
  succeeded: DeliveryOutcome[];
  temporary: DeliveryOutcome[];
  permanent: DeliveryOutcome[];
};

export function partitionDeliveryOutcomes(outcomes: DeliveryOutcome[]): PartitionedDeliveryOutcomes {
  const succeeded: DeliveryOutcome[] = [];
  const temporary: DeliveryOutcome[] = [];
  const permanent: DeliveryOutcome[] = [];
  for (const o of outcomes) {
    if (o.result.status === "ok") succeeded.push(o);
    else if (o.result.status === "temporary_failure") temporary.push(o);
    else permanent.push(o);
  }
  return { succeeded, temporary, permanent };
}
