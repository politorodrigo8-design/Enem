import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getDashboardIdentity } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const identity = await getDashboardIdentity();

  return (
    <DashboardShell
      fullName={identity.fullName}
      email={identity.email}
      accessLevel={identity.accessLevel}
      betaTester={identity.betaTester}
    >
      {children}
    </DashboardShell>
  );
}
