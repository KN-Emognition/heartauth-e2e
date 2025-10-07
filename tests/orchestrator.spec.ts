import { test, expect } from "@playwright/test";
import { createInternalClient } from "../api/internalClient";
import { createAdminClient } from "../api/adminClient";
import { createExternalClient } from "../api/externalClient";

import {
  createApiKey,
  createBearer,
  generateCompleteChallengeRequest,
  generateCompletePairingRequest,
  generateInitPairingRequest,
  generateUuid,
  validateUUIDv4,
} from "../utils/utils";

test("createTenant -> registerUser -> loginUser", async () => {
  console.log("🚀 Starting test: createTenant -> registerUser -> loginUser");
  console.log(process.env.ADMIN_API_KEY);
  // create tenant and get its api key
  const admin = createAdminClient({
    additionalHeaders: createApiKey(process.env.ADMIN_API_KEY!),
  });

  console.log("ADMIN_BASE_URL effective:", process.env.ADMIN_BASE_URL);

  console.log("📡 Sending request: create tenant");
  const createTenantResponse = await admin.POST("/admin/v1/tenants");
  console.log("✅ Tenant created:", createTenantResponse.data);
  expect(createTenantResponse.response.status).toBe(201);
  validateUUIDv4(createTenantResponse.data?.id!);
  validateUUIDv4(createTenantResponse.data?.apiKey!);

  // create pairing for test user
  const internalApiKey = createTenantResponse.data!.apiKey;
  const internal = createInternalClient({
    additionalHeaders: createApiKey(internalApiKey),
  });
  const testUserId = generateUuid();
  console.log("📡 Creating pairing for test user:", testUserId);
  const createPairingResponse = await internal.POST("/internal/v1/pairing", {
    body: {
      userId: testUserId,
      ttlSeconds: 120,
    },
  });
  console.log("✅ Pairing created:", createPairingResponse.data);
  expect(createPairingResponse.response.status).toBe(201);
  expect(createPairingResponse.data?.jwt).not.toBeNull();
  validateUUIDv4(createPairingResponse.data?.jti);

  // verify flow status CREATED
  console.log("🔍 Checking pairing flow status CREATED");
  let flowStatusResponse = await internal.GET(
    "/internal/v1/pairing/status/{jti}",
    { params: { path: { jti: createPairingResponse.data!.jti! } } }
  );
  console.log("ℹ️ Flow status:", flowStatusResponse.data);
  expect(flowStatusResponse?.response.status).toBe(200);
  expect(flowStatusResponse?.data?.status).toBe("CREATED");

  // init pairing
  const pairingJwt = createPairingResponse.data!.jwt!;
  const external = createExternalClient();
  const { initPairingRequest, privateKeyPem } = generateInitPairingRequest();
  console.log("📡 Sending init pairing");
  const initPairingResponse = await external.POST("/external/v1/pairing/init", {
    body: initPairingRequest,
    headers: createBearer(pairingJwt),
  });
  console.log("✅ Init pairing response:", initPairingResponse.response.status);
  expect(initPairingResponse.response.status).toBe(200);

  // verify flow status PENDING
  console.log("🔍 Checking flow status PENDING");
  flowStatusResponse = await internal.GET("/internal/v1/pairing/status/{jti}", {
    params: { path: { jti: createPairingResponse.data!.jti! } },
  });
  console.log("ℹ️ Flow status:", flowStatusResponse.data);
  expect(flowStatusResponse.response.status).toBe(200);
  expect(flowStatusResponse.data?.status).toBe("PENDING");

  // complete pairing
  console.log("📡 Completing pairing");
  const completePairingResponse = await external.POST(
    "/external/v1/pairing/complete",
    {
      body: generateCompletePairingRequest(),
      headers: createBearer(pairingJwt),
    }
  );
  console.log(
    "✅ Complete pairing response:",
    completePairingResponse.response.status
  );
  expect(completePairingResponse.response.status).toBe(204);

  // verify flow status APPROVED
  console.log("🔍 Checking flow status APPROVED");
  flowStatusResponse = await internal.GET("/internal/v1/pairing/status/{jti}", {
    params: { path: { jti: createPairingResponse.data!.jti! } },
  });
  console.log("ℹ️ Flow status:", flowStatusResponse.data);
  expect(flowStatusResponse.response.status).toBe(200);
  expect(flowStatusResponse.data?.status).toBe("APPROVED");

  // create challenge
  console.log("📡 Creating challenge for user:", testUserId);
  const createChallengeResponse = await internal.POST(
    "/internal/v1/challenge",
    {
      body: {
        userId: testUserId,
        ttlSeconds: 120,
      },
    }
  );
  console.log("✅ Challenge created:", createChallengeResponse.data);
  expect(createChallengeResponse.response.status).toBe(201);
  validateUUIDv4(createChallengeResponse.data?.challengeId);

  // verify flow status CREATED
  console.log("🔍 Checking challenge status CREATED");
  flowStatusResponse = await internal.GET(
    "/internal/v1/challenge/status/{id}",
    {
      params: { path: { id: createChallengeResponse.data!.challengeId! } },
    }
  );
  console.log("ℹ️ Challenge status:", flowStatusResponse.data);
  expect(flowStatusResponse.response.status).toBe(200);
  expect(flowStatusResponse.data?.status).toBe("CREATED");

  // complete challenge
  const challengeId = createChallengeResponse.data!.challengeId!;
  console.log("📡 Completing challenge:", challengeId);
  const completeChallengeResponse = await external.POST(
    "/external/v1/challenge/{id}/complete",
    {
      body: generateCompleteChallengeRequest(),
      params: { path: { id: challengeId } },
    }
  );
  console.log(
    "✅ Complete challenge response:",
    completeChallengeResponse.response.status
  );
  expect(completeChallengeResponse.response.status).toBe(204);

  // verify flow status APPROVED
  console.log("🔍 Checking final challenge status APPROVED");
  flowStatusResponse = await internal.GET(
    "/internal/v1/challenge/status/{id}",
    {
      params: { path: { id: challengeId } },
    }
  );
  console.log("🎉 Final challenge status:", flowStatusResponse.data);
  expect(flowStatusResponse.response.status).toBe(200);
  expect(flowStatusResponse.data?.status).toBe("APPROVED");

  console.log("✅ Test finished successfully");
});
