import type { AreaPerformance, CreditPackage, SubjectPerformance } from "@/types";

export const areaPerformance: AreaPerformance[] = [
  { area: "Matemática", accuracy: 54, answered: 132 },
  { area: "Linguagens", accuracy: 68, answered: 88 },
  { area: "Ciências Humanas", accuracy: 71, answered: 76 },
  { area: "Ciências da Natureza", accuracy: 57, answered: 112 },
  { area: "Redação", accuracy: 63, answered: 20 },
];

export const subjectPerformance: SubjectPerformance[] = [
  { subject: "Interpretação de texto", area: "Linguagens", accuracy: 78, status: "Dominado" },
  { subject: "Cidadania e direitos", area: "Ciências Humanas", accuracy: 74, status: "Dominado" },
  { subject: "Estatística", area: "Matemática", accuracy: 61, status: "Atenção" },
  { subject: "Ecologia", area: "Ciências da Natureza", accuracy: 57, status: "Atenção" },
  { subject: "Razão e proporção", area: "Matemática", accuracy: 42, status: "Crítico" },
  { subject: "Eletricidade", area: "Ciências da Natureza", accuracy: 48, status: "Crítico" },
  { subject: "Estequiometria", area: "Ciências da Natureza", accuracy: 51, status: "Crítico" },
];

export const creditPackages: CreditPackage[] = [
  {
    id: "pack-20",
    title: "Reforço pontual",
    credits: 20,
    price: "R$ 19,90",
    description: "Para análises extras em semanas de revisão.",
  },
  {
    id: "pack-50",
    title: "Reta final",
    credits: 50,
    price: "R$ 39,90",
    description: "Para atualizar plano e revisar pontos críticos.",
  },
  {
    id: "pack-100",
    title: "Intensivo",
    credits: 100,
    price: "R$ 69,90",
    description: "Para uso avançado quando recursos inteligentes forem liberados.",
  },
];
