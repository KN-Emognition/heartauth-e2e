import { createAdminClient } from "./adminClient";
import { createExternalClient } from "./externalClient";
import { createInternalClient } from "./internalClient";

export const createBearer = (token: string) => ({
  Authorization: `Bearer ${token}`,
});
export const createApiKey = (key: string) => ({
  "X-API-Key": key,
});

export const createAdminClientInstance = () => {
  return createAdminClient({
    additionalHeaders: createApiKey(process.env.ADMIN_API_KEY!),
  });
};

interface CreateInternalClientProps {
  internalApiKey: string;
}
export const createInternalClientInstance = ({
  internalApiKey,
}: CreateInternalClientProps) => {
  return createInternalClient({
    additionalHeaders: createApiKey(internalApiKey),
  });
};

export const createExternalClientInstance = () => {
  return createExternalClient();
};
