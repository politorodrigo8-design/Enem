export const legalDocumentTypes = [
  "terms_of_use",
  "privacy_policy",
  "refund_policy",
] as const;

export type LegalDocumentType = (typeof legalDocumentTypes)[number];

export type LegalAcceptanceContext =
  | "signup"
  | "main_checkout"
  | "credit_checkout"
  | "policy_reacceptance";

export type LegalDocumentConfig = {
  type: LegalDocumentType;
  title: string;
  version: string;
  updatedAtLabel: string;
  effectiveAtLabel: string;
  effectiveAt: string;
  contentHash: string;
  href: string;
};

export const legalDocuments = {
  terms_of_use: {
    type: "terms_of_use",
    title: "Termos de Uso",
    version: "2026-07-24",
    updatedAtLabel: "24 de julho de 2026",
    effectiveAtLabel: "24 de julho de 2026",
    effectiveAt: "2026-07-24T00:00:00-03:00",
    contentHash: "50aa8c390912a6142f50722112817f2931dd977a3a3ccf0b854508613c4a69d5",
    href: "/termos",
  },
  privacy_policy: {
    type: "privacy_policy",
    title: "Política de Privacidade",
    version: "2026-07-24",
    updatedAtLabel: "24 de julho de 2026",
    effectiveAtLabel: "24 de julho de 2026",
    effectiveAt: "2026-07-24T00:00:00-03:00",
    contentHash: "32db8163b8428a114c8402c5911ea4f9e8a4a8fe59f05057c653f9475b7e7fb0",
    href: "/privacidade",
  },
  refund_policy: {
    type: "refund_policy",
    title: "Política de Reembolso",
    version: "2026-07-23",
    updatedAtLabel: "23 de julho de 2026",
    effectiveAtLabel: "23 de julho de 2026",
    effectiveAt: "2026-07-23T00:00:00-03:00",
    contentHash: "8c8d2a6e904b91d39eb9a53e9c4e2d8a77f9d2fb00e32b45d9b596f4df9558d1",
    href: "/reembolso",
  },
} satisfies Record<LegalDocumentType, LegalDocumentConfig>;

export const currentLegalDocuments = legalDocumentTypes.map(
  (type) => legalDocuments[type],
);

export const legalContacts = {
  supportEmail: "suporte@pontuaenem.com.br",
  privacyEmail: null as string | null,
};

export const legalEntityConfig = {
  supplierName: null as string | null,
  taxId: null as string | null,
  address: null as string | null,
  privacyOfficer: null as string | null,
};

export function getLegalContactEmail() {
  return legalContacts.privacyEmail ?? legalContacts.supportEmail;
}

export function currentLegalAcceptanceVersions() {
  return {
    terms_of_use: legalDocuments.terms_of_use.version,
    privacy_policy: legalDocuments.privacy_policy.version,
    refund_policy: legalDocuments.refund_policy.version,
  } satisfies Record<LegalDocumentType, string>;
}
