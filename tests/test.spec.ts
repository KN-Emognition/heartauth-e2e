import { test, expect } from "@playwright/test";
import { createTenant } from "../utils/admin/createTenant";
import { completePairing, createPairing, initPairing } from "../utils/pairing";
import {
  createAdminClientInstance,
  createExternalClientInstance,
  createInternalClientInstance,
} from "../api/clientUtils";
import { completeChallenge, createChallenge } from "../utils/challenge";
import { FetchResponse } from "openapi-fetch";
import { components } from "../contract/generated/external";

// ---------- helpers ----------

function randECG(len: number): number[] {
  return Array.from({ length: len }, () => Math.floor(Math.random() * 256));
}
function zeroECG(len: number): number[] {
  return new Array(len).fill(0);
}

// Narrow the common “openapi-fetch” shape we use here
type AnyOk = FetchResponse<any, any, any> & { response: { status: number } };

function hasHttpStatus(obj: any): obj is AnyOk {
  return !!obj && !!obj.response && typeof obj.response.status === "number";
}

function payloadSaysSuccess(resp: any): boolean {
  // Optional flags in many APIs; all checks are safe/optional
  const data = resp?.data ?? {};
  if (typeof data.authenticated === "boolean") return data.authenticated;
  if (typeof data.match === "boolean") return data.match;
  if (typeof data.success === "boolean") return data.success;
  if (typeof data.result === "string")
    return data.result.toUpperCase() === "SUCCESS";
  // token presence can be a good heuristic
  if (data.sessionToken || data.jwt || data.accessToken) return true;
  return false;
}

function assertLoginSuccess(resp: unknown) {
  expect(hasHttpStatus(resp), "missing HTTP status").toBeTruthy();
  const status = (resp as AnyOk).response.status;
  expect(status, "expected 2xx").toBeGreaterThanOrEqual(200);
  expect(status, "expected 2xx").toBeLessThan(300);

  // If API encodes outcome in body, also assert that
  if ((resp as any)?.data !== undefined) {
    expect(
      payloadSaysSuccess(resp),
      "payload did not indicate success (authenticated/match/success/result)"
    ).toBeTruthy();
  }
}

function assertLoginFailure(resp: unknown) {
  expect(hasHttpStatus(resp), "missing HTTP status").toBeTruthy();
  const status = (resp as AnyOk).response.status;

  // Failure if 4xx/5xx OR body says unsuccessful
  const httpFail = status >= 400 && status < 600;
  const bodyFail =
    (resp as any)?.data !== undefined && payloadSaysSuccess(resp) === false;

  expect(
    httpFail || bodyFail,
    "expected failure (4xx/5xx or body says fail)"
  ).toBeTruthy();
}

// Build a balanced array of booleans (true=positive/success path, false=negative/failure path)
function buildBalancedAttempts(n: number): boolean[] {
  const half = Math.floor(n / 2);
  const arr = [
    ...new Array(half).fill(true),
    ...new Array(n - half).fill(false),
  ];
  // Fisher–Yates shuffle
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---------- test ----------

test.describe
  .parallel("Tenant + multi-user auth flow with random positive/negative logins", () => {
  test("provision K users, then perform N balanced random login attempts", async () => {
    test.setTimeout(120_000);

    const K = 3; // users to provision
    const N = 10; // total attempts (balanced success/failure)
    const ECG_LEN = 5000;

    console.log("🚀 Starting: provision tenant & users");

    const admin = createAdminClientInstance();
    const createTenantResponse = await createTenant({ adminClient: admin });

    expect(createTenantResponse).toBeTruthy();
    expect(createTenantResponse.response.status, "tenant HTTP").toBe(201);
    expect(createTenantResponse.data?.apiKey, "tenant apiKey").toBeTruthy();

    const internalApiKey = createTenantResponse.data!.apiKey;
    const internal = createInternalClientInstance({ internalApiKey });
    const external = createExternalClientInstance();

    const users: Array<{
      testUserId: string;
      pairingJwt: string;
      privateKeyPem: string;
      refEcg: number[];
    }> = [];

    // --- create & pair K users ---
    for (let i = 0; i < K; i++) {
      await test.step(`Create & pair user ${i + 1}/${K}`, async () => {
        const { testUserId, createPairingResponse } = await createPairing({
          internal,
        });
        expect(testUserId, "testUserId").toBeTruthy();
        expect(
          createPairingResponse.response.status,
          "createPairing HTTP"
        ).toBe(201);

        const pairingJwt = createPairingResponse.data!.jwt!;
        expect(pairingJwt, "pairingJwt").toBeTruthy();

        const { initPairingResponse, privateKeyPem } = await initPairing({
          external,
          pairingJwt,
        });
        expect(initPairingResponse.response.status, "initPairing HTTP").toBe(
          200
        );
        const nonce = initPairingResponse.data!.nonce!;
        expect(nonce, "initPairing nonce").toBeTruthy();
        expect(privateKeyPem, "privateKeyPem").toBeTruthy();

        const refEcg = randECG(ECG_LEN);

        const { completePairingResponse } = await completePairing({
          external,
          pairingJwt,
          nonce,
          refEcg: [refEcg],
          privateKeyPem,
        });
        expect(
          completePairingResponse.response.status,
          "completePairing HTTP"
        ).toBe(204);

        users.push({ testUserId, pairingJwt, privateKeyPem, refEcg });
      });
    }

    console.log(
      `✅ Provisioned ${users.length} users. Starting balanced login attempts...`
    );

    // --- balanced randomized attempts ---
    const attempts = buildBalancedAttempts(N);
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < attempts.length; i++) {
      await test.step(`Login attempt ${i + 1}/${attempts.length}`, async () => {
        const user = users[Math.floor(Math.random() * users.length)];
        const positiveAttempt = attempts[i];
        const attemptEcg = positiveAttempt
          ? randECG(ECG_LEN)
          : zeroECG(ECG_LEN);

        const { createChallengeResponse } = await createChallenge({
          internal,
          testUserId: user.testUserId,
        });
        expect(
          createChallengeResponse.response.status,
          "createChallenge HTTP"
        ).toBe(201);

        const challengeId = createChallengeResponse.data!.challengeId!;
        expect(challengeId, "challengeId").toBeTruthy();

        const { completeChallengeResponse } = await completeChallenge({
          external,
          nonce: user.testUserId, // adjust if your API expects a different nonce
          testEcg: attemptEcg,
          privateKeyPem: user.privateKeyPem,
          challengeId,
        });

        expect(
          completeChallengeResponse,
          "completeChallenge response"
        ).toBeTruthy();
        expect(
          typeof completeChallengeResponse.response.status === "number",
          "completeChallenge should include HTTP status"
        ).toBeTruthy();

        if (positiveAttempt) {
          assertLoginSuccess(completeChallengeResponse);
          successCount++;
        } else {
          assertLoginFailure(completeChallengeResponse);
          failureCount++;
        }
      });
    }

    // deterministic sanity thanks to balanced attempts
    expect(successCount, "expected at least one success").toBeGreaterThan(0);
    expect(failureCount, "expected at least one failure").toBeGreaterThan(0);

    console.log(
      `🎯 Done. Successes: ${successCount}, Failures: ${failureCount}, Total: ${N}`
    );
  });
});
