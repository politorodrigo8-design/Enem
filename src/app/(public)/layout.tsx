import { Nunito_Sans } from "next/font/google";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import { RevealController } from "@/components/ui/reveal-controller";
import { getPublicViewer } from "@/lib/db/queries";
import { getSupplierIdentificationLines } from "@/lib/legal/config";
import { getProductCta } from "@/lib/services/billing";

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
});

export default async function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cta = getProductCta();
  const viewer = await getPublicViewer();
  const supplierLines = getSupplierIdentificationLines();

  return (
    <div className={nunitoSans.className}>
      <RevealController />
      <LandingHeader ctaHref={cta.href} viewer={viewer} />
      {children}
      <LandingFooter supplierLines={supplierLines} />
    </div>
  );
}
