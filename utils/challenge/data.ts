import { createSign } from "crypto";
import { importPKCS8, importJWK, JWK, SignJWT, CompactEncrypt } from "jose";
import { components } from "../../contract/generated/external";

type CompleteChallengeRequest =
  components["schemas"]["CompleteChallengeRequest"];
interface GenerateCompleteChallengeRequestProps {
  nonce: string;
  testEcg: Array<number>;
  privateKeyPem: string;
  recipientPubKey: components["schemas"]["JwkSet"]["keys"][0];
}

export const generateCompleteChallengeRequest = async ({
  nonce,
  testEcg,
  privateKeyPem,
  recipientPubKey,
}: GenerateCompleteChallengeRequestProps): Promise<CompleteChallengeRequest> => {
  const signingKey = await importPKCS8(privateKeyPem, "ES256");

  const ecdhPubKey = await importJWK(recipientPubKey as JWK, "ECDH-ES");

  const signedJwt = await new SignJWT({ testEcg })
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
