import { ExternalClient } from "../api/externalClient";

export const getPublicKey = async (external: ExternalClient) => {
  const response = await external.GET("/.well-known/jwks.json");
  return response.data?.keys[0]!;
};
