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
import { components } from "../contract/generated/internal";

test("createTenant -> registerUser -> loginUser", async () => {
  // create tenant and get its api key
  const admin = createAdminClient({
    additionalHeaders: createApiKey(process.env.ADMIN_API_KEY!),
  });
  const createTenantResponse = await admin.POST("/admin/v1/tenants");
  expect(createTenantResponse.response.status).toBe(201);
  validateUUIDv4(createTenantResponse.data?.id!);
  validateUUIDv4(createTenantResponse.data?.apiKey!);

  // create pairing for test user
  const internalApiKey = createTenantResponse.data!.apiKey;
  const internal = createInternalClient({
    additionalHeaders: createApiKey(internalApiKey),
  });
  const testUserId = generateUuid();
  const createPairingResponse = await internal.POST("/internal/v1/pairing", {
    body: {
      userId: testUserId,
      ttlSeconds: 120,
    },
  });
  expect(createPairingResponse.response.status).toBe(201);
  expect(createPairingResponse.data?.jwt).not.toBeNull();
  validateUUIDv4(createPairingResponse.data?.jti);

  // verify flow status CREATED
  let flowStatusResponse = await internal.GET(
    "/internal/v1/pairing/status/{jti}",
    {
      params: { path: { jti: createPairingResponse.data!.jti! } },
    }
  );
  expect(flowStatusResponse?.response.status).toBe(200);
  expect(flowStatusResponse?.data?.status).toBe("CREATED");

  // init pairing
  const pairingJwt = createPairingResponse.data!.jwt!;
  const external = createExternalClient();
  const { initPairingRequest, privateKeyPem } = generateInitPairingRequest();
  const initPairingResponse = await external.POST("/external/v1/pairing/init", {
    body: initPairingRequest,
    headers: createBearer(pairingJwt),
  });
  expect(initPairingResponse.response.status).toBe(200);

  // verify flow status PENDING
  flowStatusResponse = await internal.GET("/internal/v1/pairing/status/{jti}", {
    params: { path: { jti: createPairingResponse.data!.jti! } },
  });
  expect(flowStatusResponse.response.status).toBe(200);
  expect(flowStatusResponse.data?.status).toBe("PENDING");

  // complete pairing
  const completePairingResponse = await external.POST(
    "/external/v1/pairing/complete",
    {
      body: generateCompletePairingRequest(),
      headers: createBearer(pairingJwt),
    }
  );
  expect(completePairingResponse.response.status).toBe(204);

    // verify flow status PENDING
  flowStatusResponse = await internal.GET("/internal/v1/pairing/status/{jti}", {
    params: { path: { jti: createPairingResponse.data!.jti! } },
  });
  expect(flowStatusResponse.response.status).toBe(200);
  expect(flowStatusResponse.data?.status).toBe("APPROVED");

  // create challenge
  const createChallengeResponse = await internal.POST(
    "/internal/v1/challenge",
    {
      body: {
        userId: testUserId,
        ttlSeconds: 120,
      },
    }
  );
  expect(createChallengeResponse.response.status).toBe(201);
  validateUUIDv4(createChallengeResponse.data?.challengeId);

  // verify flow status CREATED
  flowStatusResponse = await internal.GET("/internal/v1/challenge/status/{id}", {
    params: { path: { id: createChallengeResponse.data!.challengeId! } },
  });
  expect(flowStatusResponse.response.status).toBe(200);
  expect(flowStatusResponse.data?.status).toBe("CREATED");

  // complete challenge
  const challengeId = createChallengeResponse.data!.challengeId!;
  const completeChallengeResponse = await external.POST(
    "/external/v1/challenge/{id}/complete",
    {
      body: generateCompleteChallengeRequest(),
      params: {
        path: {
          id: challengeId,
        },
      },
    }
  );
  expect(completeChallengeResponse.response.status).toBe(204);

    // verify flow status APPROVED
  flowStatusResponse = await internal.GET("/internal/v1/challenge/status/{id}", {
    params: { path: { id: createChallengeResponse.data!.challengeId! } },
  });
  expect(flowStatusResponse.response.status).toBe(200);
  expect(flowStatusResponse.data?.status).toBe("APPROVED");
});
