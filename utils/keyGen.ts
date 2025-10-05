import { generateKeyPairSync, createPublicKey } from "node:crypto";

type EcKeyPair = {
  publicKeyPem: string; // -----BEGIN PUBLIC KEY-----
  privateKeyPem: string; // -----BEGIN PRIVATE KEY-----
  publicKeyJwk: JsonWebKey; // { kty:"EC", crv:"P-256", x, y }
  publicKeyRawBase64: string; // 65 bytes (0x04 || x || y), base64
};

export function generateP256(): EcKeyPair {
  const { publicKey, privateKey } = generateKeyPairSync("ec", {
    namedCurve: "P-256",
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  const jwk = createPublicKey(publicKey).export({
    format: "jwk",
  }) as JsonWebKey;
  const x = Buffer.from(jwk.x!, "base64url");
  const y = Buffer.from(jwk.y!, "base64url");
  const rawUncompressedB64 = Buffer.concat([
    Buffer.from([0x04]),
    x,
    y,
  ]).toString("base64");

  return {
    publicKeyPem: publicKey,
    privateKeyPem: privateKey,
    publicKeyJwk: jwk,
    publicKeyRawBase64: rawUncompressedB64,
  };
}
