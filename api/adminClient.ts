import createClient from "openapi-fetch";
import type { paths as AdminPaths } from "../contract/generated/admin";

export type AdminClient = ReturnType<typeof createAdminClient>;

export function createAdminClient(opts?: {
  baseUrl?: string;
  additionalHeaders?: Record<string, string>;
}) {
  const { baseUrl: baseUrlOpt, additionalHeaders = {} } = opts ?? {};

  const baseUrl =
    baseUrlOpt ?? process.env.ADMIN_BASE_URL ?? "https://api.admin.example";

  return createClient<AdminPaths>({
    baseUrl,
    fetch: globalThis.fetch,
    headers: {
      "content-type": "application/json",
      ...additionalHeaders,
    },
  });
}
