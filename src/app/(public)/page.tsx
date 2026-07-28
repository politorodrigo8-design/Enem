import type { Metadata } from "next";
import { LandingBenefits } from "@/components/landing/landing-benefits";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingFinalCta } from "@/components/landing/landing-final-cta";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingHowItWorks } from "@/components/landing/landing-how-it-works";
import { LandingPricing } from "@/components/landing/landing-pricing";
import { LandingProductShowcase } from "@/components/landing/landing-product-showcase";
import {
  getCurrentProductPrice,
  getProductCta,
  getPublicProduct,
} from "@/lib/services/billing";

const title = "Pontua Enem | Saiba o que estudar e organize sua preparação";
const description =
  "Descubra suas prioridades, pratique com questões e simulados, envie redações e acompanhe sua evolução até o ENEM.";

// Nota legal compacta: a landing não promete nota, vaga ou aprovação.
export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title,
    description,
    type: "website",
    url: "/",
    siteName: "Pontua Enem",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default async function HomePage() {
  const product = await getPublicProduct();
  const price = getCurrentProductPrice(product);
  const cta = getProductCta();

  return (
    <main className="bg-white">
      <LandingHero ctaHref={cta.href} />
      <LandingBenefits />
      <LandingHowItWorks />
      <LandingProductShowcase />
      <LandingFeatures />
      <LandingPricing price={price} ctaHref={cta.href} />
      <LandingFaq />
      <LandingFinalCta ctaHref={cta.href} />
    </main>
  );
}
