import { AdminClient } from "../../api/adminClient";

interface CreatePairingProps {
  adminClient: AdminClient;
}

export const createTenant = async ({ adminClient }: CreatePairingProps) => {
  const createTenantResponse = await adminClient.POST("/admin/v1/tenants");
  return createTenantResponse;
};
