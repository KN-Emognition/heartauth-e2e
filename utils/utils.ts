import { test, expect } from "@playwright/test";
import { validate as uuidValidate, version as uuidVersion } from "uuid";
import { faker } from "@faker-js/faker";
import { components } from "../contract/generated/external";
import { generateP256 } from "./keyGen";

export const validateUUIDv4 = (uuid: string | undefined) => {
  expect(uuid).toBeDefined();
  expect(typeof uuid).toBe("string");
  expect(uuidValidate(uuid as string)).toBe(true);
  expect(uuidVersion(uuid as string)).toBe(4);
};
export const createBearer = (token: string) => ({
  Authorization: `Bearer ${token}`,
});
export const createApiKey = (key: string) => ({
  "X-API-Key": key,
});
export const generateUuid = () => faker.string.uuid();

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
      fcmToken: generateFcmToken(),
      platform,
      publicKey: publicKeyPem,
      model,
      osVersion,
    },
    privateKeyPem,
  };
};
const generateFcmToken = (): string => {
  const body = faker.string.alphanumeric({ length: 180 });
  return `APA91b${body}`;
};

type CompletePairingRequest = components["schemas"]["CompletePairingRequest"];

export const generateCompletePairingRequest = (): CompletePairingRequest => {
  return {
    dataToken: generateFcmToken(),
    signature: generateFcmToken(),
  };
};

export const generateCompleteChallengeRequest =
  (): components["schemas"]["CompleteChallengeRequest"] => {
    return {
      dataToken: generateFcmToken(),
      signature: generateFcmToken(),
    };
  };
