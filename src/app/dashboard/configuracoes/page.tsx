import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Notice } from "@/components/ui/notice";
import { getAccessContext } from "@/lib/access";
import { getProfile, getReferralAccountSummary } from "@/lib/db/queries";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const [profile, referral] = await Promise.all([
    getProfile(),
    getReferralAccountSummary(),
  ]);
  const access = getAccessContext(profile);

  return (
    <div>
      <DashboardPageHeader
        title="Meu perfil"
        description="Edite seus dados de estudo, rotina, preferências e segurança da conta."
      />

      <Notice tone="info" className="mb-6">
        O nível de acesso, permissões beta e classificações editoriais não podem ser
        alterados por alunos.
      </Notice>

      <SettingsClient profile={profile} access={access} referralCode={referral.referralCode} />
    </div>
  );
}
