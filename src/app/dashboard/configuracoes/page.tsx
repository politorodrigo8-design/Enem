import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Notice } from "@/components/ui/notice";
import { getAccessContext } from "@/lib/access";
import { formatAppDateTime } from "@/lib/dates";
import { getProfile } from "@/lib/db/queries";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const profile = await getProfile();
  const access = getAccessContext(profile);

  return (
    <div>
      <DashboardPageHeader
        title="Meu perfil"
        description="Edite seus dados de estudo, rotina, preferências e segurança da conta."
      />

      <Notice tone="info" className="mb-6">
        {access.expiresAt
          ? `Seu acesso à plataforma está liberado até ${formatAppDateTime(access.expiresAt, {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}. Aqui você ajusta seus dados, sua rotina e sua segurança — o acesso vem da sua compra e não é alterado nesta tela.`
          : "Aqui você ajusta seus dados, sua rotina e sua segurança. O acesso à plataforma vem da sua compra e não é alterado nesta tela."}
      </Notice>

      <SettingsClient profile={profile} access={access} />
    </div>
  );
}
