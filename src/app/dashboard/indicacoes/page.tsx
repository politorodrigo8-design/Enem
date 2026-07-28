import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { ReferralProgramSection } from "@/components/dashboard/referrals/referral-program-section";
import { getReferralPageData } from "@/lib/db/queries";
import { getSiteUrl } from "@/lib/supabase/config";
import { referralProgramCopy } from "@/lib/referrals/constants";

export const dynamic = "force-dynamic";

export default async function ReferralsPage() {
  const referrals = await getReferralPageData();

  return (
    <div>
      <DashboardPageHeader
        title={referralProgramCopy.title}
        description={referralProgramCopy.dashboardDescription}
      />

      <ReferralProgramSection data={referrals} siteUrl={getSiteUrl()} />
    </div>
  );
}
