import { ProGate } from "@/components/ProGate";
import { requireOwner } from "@/lib/auth";
import AiHubClient from "./AiHubClient";

export default async function AiHubPage() {
  const { businessId } = await requireOwner();

  return (
    <ProGate businessId={businessId} feature="aiBookingAutopilot">
      <AiHubClient />
    </ProGate>
  );
}
