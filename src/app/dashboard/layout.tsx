import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getDashboardIdentity } from "@/lib/db/queries";
import { getMissingCurrentLegalAcceptances } from "@/lib/legal/acceptances";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const identity = await getDashboardIdentity();
  const pendingLegalDocuments = await getMissingCurrentLegalAcceptances(identity.userId);

  return (
    <DashboardShell
      fullName={identity.fullName}
      email={identity.email}
      accessLevel={identity.accessLevel}
      profilePhotoUrl={identity.profilePhotoUrl}
      pendingLegalDocuments={pendingLegalDocuments}
    >
      {children}
    </DashboardShell>
  );
}
