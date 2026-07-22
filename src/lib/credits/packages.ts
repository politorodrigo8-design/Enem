import type { CreditPackage } from "@/types";

export type CreditPackageProduct = CreditPackage & {
  productSlug: string;
  priceCents: number;
  highlight?: boolean;
};

export const creditPackageProducts: CreditPackageProduct[] = [
  {
    id: "pack-20",
    productSlug: "creditos-20",
    title: "Reforço pontual",
    credits: 20,
    price: "R$ 19,90",
    priceCents: 1990,
    description: "Para explicações e ajustes extras em semanas de revisão.",
  },
  {
    id: "pack-50",
    productSlug: "creditos-50",
    title: "Reta final",
    credits: 50,
    price: "R$ 39,90",
    priceCents: 3990,
    description: "Para revisar pontos críticos, gerar análises e atualizar o plano.",
    highlight: true,
  },
  {
    id: "pack-100",
    productSlug: "creditos-100",
    title: "Intensivo",
    credits: 100,
    price: "R$ 69,90",
    priceCents: 6990,
    description: "Para uso recorrente dos recursos inteligentes durante a reta final.",
  },
];
