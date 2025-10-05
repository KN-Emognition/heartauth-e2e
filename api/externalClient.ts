import createClient from "openapi-fetch";
import type { paths as ExternalPaths } from "../contract/generated/external";

export type ExternalClient = ReturnType<typeof createExternalClient>;

export function createExternalClient(opts?: {
  baseUrl?: string;
  additionalHeaders?: Record<string, string>;
}) {
  const { baseUrl: baseUrlOpt, additionalHeaders = {} } = opts ?? {};

  const baseUrl =
    baseUrlOpt ?? process.env.EXTERNAL_BASE_URL ?? "https://api.external.example";

  return createClient<ExternalPaths>({
    baseUrl,
    fetch: globalThis.fetch,
    headers: {
      "content-type": "application/json",
      ...additionalHeaders,
    },
  });
}
