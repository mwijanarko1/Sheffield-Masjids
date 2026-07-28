import assert from "node:assert/strict";
import test from "node:test";
import {
  deliverToSubscribers,
  partitionDeliveryOutcomes,
  type PushTransport,
  type IqamahChangePushPayload,
} from "./pushTransport";

const payload: IqamahChangePushPayload = {
  kind: "iqamah_times_changed",
  mosqueSlug: "central-mosque",
  publishEventId: "pub_1",
  mosqueName: "Central Mosque",
};

test("skips already delivered fingerprints", async () => {
  const calls: string[] = [];
  const transport: PushTransport = {
    async sendIqamahChangeAlert(_p, token) {
      calls.push(token);
      return { status: "ok" };
    },
  };
  const outcomes = await deliverToSubscribers(
    transport,
    [
      { token: "t1", platform: "ios", fingerprint: "a" },
      { token: "t2", platform: "android", fingerprint: "b" },
    ],
    new Set(["a"]),
    payload,
  );
  assert.deepEqual(calls, ["t2"]);
  assert.equal(outcomes.length, 1);
  assert.equal(outcomes[0].fingerprint, "b");
});

test("partitionDeliveryOutcomes groups statuses", () => {
  const { succeeded, temporary, permanent } = partitionDeliveryOutcomes([
    { fingerprint: "1", token: "a", result: { status: "ok" } },
    {
      fingerprint: "2",
      token: "b",
      result: { status: "temporary_failure", message: "timeout" },
    },
    {
      fingerprint: "3",
      token: "c",
      result: { status: "permanent_failure", message: "gone", reason: "unregistered" },
    },
  ]);
  assert.equal(succeeded.length, 1);
  assert.equal(temporary.length, 1);
  assert.equal(permanent.length, 1);
});
