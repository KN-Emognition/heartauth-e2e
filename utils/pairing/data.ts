import { faker } from "@faker-js/faker";
import { components } from "../../contract/generated/external";
import { generateP256 } from "../keyGen";
import {
  CompactEncrypt,
  importJWK,
  importPKCS8,
  JWK,
  SignJWT,
} from "jose";
import { createSign } from "crypto";

type InitPairingRequest = components["schemas"]["InitPairingRequest"];
export const generateInitPairingRequest = (): {
  initPairingRequest: InitPairingRequest;
  privateKeyPem: string;
} => {
  const { publicKeyPem, publicKeyRawBase64, publicKeyJwk, privateKeyPem } =
    generateP256();

  const platform = faker.helpers.arrayElement(["IOS", "ANDROID"] as const);

  const osVersion =
    platform === "IOS"
      ? faker.helpers.arrayElement(["17.6", "17.5.1", "16.7.8", "15.8.2"])
      : faker.helpers.arrayElement(["14", "14.1", "13", "12", "11"]);

  const model =
    platform === "IOS"
      ? faker.helpers.arrayElement([
          "iPhone 15 Pro",
          "iPhone 14",
          "iPad Pro 12.9",
        ])
      : faker.helpers.arrayElement(["Pixel 8 Pro", "Galaxy S24", "OnePlus 12"]);

  return {
    initPairingRequest: {
      deviceId: faker.string.uuid(),
      displayName: faker.commerce.productName(),
      fcmToken: faker.string.uuid(),
      platform,
      publicKey: publicKeyPem,
      model,
      osVersion,
    },
    privateKeyPem,
  };
};

type CompletePairingRequest = components["schemas"]["CompletePairingRequest"];
interface GenerateCompletePairingRequestProps {
  nonce: string;
  refEcg: Array<Array<number>>;
  privateKeyPem: string;
  recipientPubKey: components["schemas"]["JwkSet"]["keys"][0];
}

export const generateCompletePairingRequest = async ({
  nonce,
  refEcg,
  privateKeyPem,
  recipientPubKey,
}: GenerateCompletePairingRequestProps): Promise<CompletePairingRequest> => {
  const signingKey = await importPKCS8(privateKeyPem, "ES256");

  const ecdhPubKey = await importJWK(recipientPubKey as JWK, "ECDH-ES");

  const signedJwt = await new SignJWT({ refEcg })
    .setProtectedHeader({ alg: "ES256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(signingKey);

  const jwe = await new CompactEncrypt(new TextEncoder().encode(signedJwt))
    .setProtectedHeader({ alg: "ECDH-ES", enc: "A256GCM" })
    .encrypt(ecdhPubKey);
  const sig = createSign("sha256")
    .update(Buffer.from(nonce, "utf8"))
    .sign({ key: privateKeyPem, dsaEncoding: "ieee-p1363" });

  if (sig.length !== 64) {
    throw new Error(`Expected 64-byte P-1363 signature, got ${sig.length}`);
  }

  const signatureB64url = Buffer.from(sig).toString("base64url");

  return {
    dataToken: jwe,
    signature: signatureB64url,
  };
};
