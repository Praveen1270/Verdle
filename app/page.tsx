import { getUser } from "@/actions/get-user";
import { getVerdleDashboard } from "@/actions/get-verdle-dashboard";
import { createUser } from "@/actions/create-user";
import { VerdleLanding } from "@/components/verdle/landing";
import { VerdleHomeGate } from "@/components/verdle/home-gate";

export default async function Home() {
  const userRes = await getUser();

  // Not logged in -> landing page
  if (!userRes.success) {
    return <VerdleLanding />;
  }

  const verdleRes = await getVerdleDashboard();
  if (!verdleRes.success) {
    // Common case: session exists but DB user row doesn't (e.g. older session, failed callback, manual DB reset).
    if (verdleRes.error === "User record not found") {
      const created = await createUser();
      if (created.success) {
        const retry = await getVerdleDashboard();
        if (retry.success) {
          return <VerdleHomeGate data={retry.data} />;
        }
        return (
          <div className="min-h-screen flex items-center justify-center px-4">
            <div className="text-sm text-muted-foreground">
              Internal Server Error: {retry.error}
            </div>
          </div>
        );
      }
    }

    // fallback to a minimal screen (but show the real message)
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-sm text-muted-foreground">
          Internal Server Error: {verdleRes.error}
        </div>
      </div>
    );
  }

  return <VerdleHomeGate data={verdleRes.data} />;
}
