import { faker } from "@faker-js/faker";
import { InternalClient } from "../../api/internalClient";
import { ExternalClient } from "../../api/externalClient";
import { getPublicKey } from "../getPublicKey";
import { generateCompleteChallengeRequest } from "./data";

interface CreateChallengeProps {
  internal: InternalClient;
  testUserId: string;
}
export const createChallenge = async ({
  internal,
  testUserId,
}: CreateChallengeProps) => {
  const createChallengeResponse = await internal.POST(
    "/internal/v1/challenge",
    {
      body: {
        userId: testUserId,
        ttlSeconds: 120,
      },
    }
  );
  return {
    testUserId,
    createChallengeResponse,
  };
};

interface CompleteChallengeProps {
  external: ExternalClient;
  nonce: string;
  testEcg: Array<number>;
  privateKeyPem: string;
  challengeId: string;
}
export const completeChallenge = async ({
  external,
  nonce,
  testEcg,
  privateKeyPem,
  challengeId,
}: CompleteChallengeProps) => {
  const completeChallengeResponse = await external.POST(
    "/external/v1/challenge/{id}/complete",
    {
      body: await generateCompleteChallengeRequest({
        nonce,
        testEcg,
        privateKeyPem,
        recipientPubKey: await getPublicKey(external),
      }),
      params: {
        path: {
          id: challengeId,
        },
      },
    }
  );
  return {
    completeChallengeResponse,
  };
};
