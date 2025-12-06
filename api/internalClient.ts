import createClient from "openapi-fetch";
import type { paths as InternalPaths } from "../contract/generated/tenants";

export type InternalClient = ReturnType<typeof createInternalClient>;

export function createInternalClient(opts?: {
  baseUrl?: string;
  additionalHeaders?: Record<string, string>;
}) {
  const { baseUrl: baseUrlOpt, additionalHeaders = {} } = opts ?? {};

  const baseUrl =
    baseUrlOpt ?? process.env.INTERNAL_BASE_URL ?? "https://api.internal.example";

  return createClient<InternalPaths>({
    baseUrl,
    fetch: globalThis.fetch,
    headers: {
      "content-type": "application/json",
      ...additionalHeaders,
    },
  });
}
