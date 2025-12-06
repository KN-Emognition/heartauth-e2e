import { faker } from "@faker-js/faker";
import { InternalClient } from "../../api/internalClient";
import { ExternalClient } from "../../api/externalClient";
import { createBearer } from "../../api/clientUtils";
import {
  generateCompletePairingRequest,
  generateInitPairingRequest,
} from "./data";
import { getPublicKey } from "../getPublicKey";

interface CreatePairingProps {
  internal: InternalClient;
}
export const createPairing = async ({ internal }: CreatePairingProps) => {
  const testUserId = faker.string.uuid();
  const createPairingResponse = await internal.POST("/tenants/v1/pairing", {
    body: {
      userId: testUserId,
      username: `testuser_${testUserId}`,
      ttlSeconds: 120,
    },
  });
  return {
    testUserId,
    createPairingResponse,
  };
};

interface InitPairingProps {
  external: ExternalClient;
  pairingJwt: string;
}
export const initPairing = async ({
  external,
  pairingJwt,
}: InitPairingProps) => {
  const { initPairingRequest, privateKeyPem } = generateInitPairingRequest();
  const initPairingResponse = await external.POST("/mobile/v1/pairing/init", {
    body: initPairingRequest,
    headers: createBearer(pairingJwt),
  });
  return {
    initPairingResponse,
    privateKeyPem,
  };
};

interface CompletePairingProps {
  external: ExternalClient;
  pairingJwt: string;
  nonce: string;
  refEcg: Array<Array<number>>;
  privateKeyPem: string;
}
export const completePairing = async ({
  external,
  pairingJwt,
  nonce,
  refEcg,
  privateKeyPem,
}: CompletePairingProps) => {
  const completePairingResponse = await external.POST(
    "/mobile/v1/pairing/complete",
    {
      body: await generateCompletePairingRequest({
        nonce,
        refEcg,
        privateKeyPem,
        recipientPubKey: await getPublicKey(external),
      }),
      headers: createBearer(pairingJwt),
    }
  );
  return {
    completePairingResponse,
  };
};
