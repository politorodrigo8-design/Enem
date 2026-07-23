import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { PRODUCT_NAME } from "@/lib/product-config";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type Product = Database["public"]["Tables"]["products"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];

export const DEFAULT_PRODUCT = {
  product_name: PRODUCT_NAME,
  slug: "nexoenem-completo-2026",
  regular_price_cents: 9990,
  sale_price_cents: null,
  sale_starts_at: null,
  sale_ends_at: null,
  access_valid_until: "2026-11-30T23:59:59-03:00",
  active: true,
  launch_ready: true,
  product_kind: "access",
  credit_amount: null,
} satisfies Partial<Product>;

export function getProductCta() {
  return { href: "/checkout", label: "Comprar acesso" };
}

export function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function getMockCheckoutState() {
  return {
    enabled: false,
    message:
      "Créditos avulsos ainda não estão à venda. Esta área mostra como o controle de uso deve funcionar quando os recursos avançados forem liberados.",
  };
}

export function getCurrentProductPrice(product: Pick<
  Product,
  "regular_price_cents" | "sale_price_cents" | "sale_starts_at" | "sale_ends_at" | "active"
>) {
  const now = Date.now();
  const saleStarts = product.sale_starts_at
    ? new Date(product.sale_starts_at).getTime()
    : null;
  const saleEnds = product.sale_ends_at
    ? new Date(product.sale_ends_at).getTime()
    : null;
  const saleActive =
    product.active &&
    product.sale_price_cents &&
    (!saleStarts || saleStarts <= now) &&
    (!saleEnds || saleEnds >= now);

  return saleActive ? product.sale_price_cents ?? product.regular_price_cents : product.regular_price_cents;
}

export async function getPublicProduct(): Promise<Product> {
  if (!isSupabaseConfigured()) {
    return fallbackProduct();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", DEFAULT_PRODUCT.slug)
    .eq("active", true)
    .maybeSingle();

  if (error || !data) {
    return fallbackProduct();
  }

  return withCurrentProductBrand(data);
}

export async function getActiveProductForCheckout(
  supabase: SupabaseClient<Database>,
  slug = DEFAULT_PRODUCT.slug,
): Promise<Product> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Produto ativo não encontrado.");
  }

  return withCurrentProductBrand(data as Product);
}

function withCurrentProductBrand(product: Product): Product {
  if (product.product_kind !== "access") {
    return product;
  }

  return {
    ...product,
    product_name: PRODUCT_NAME,
  };
}

function fallbackProduct(): Product {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    product_name: DEFAULT_PRODUCT.product_name,
    slug: DEFAULT_PRODUCT.slug,
    regular_price_cents: DEFAULT_PRODUCT.regular_price_cents,
    sale_price_cents: null,
    sale_starts_at: null,
    sale_ends_at: null,
    access_valid_until: DEFAULT_PRODUCT.access_valid_until,
    active: true,
    launch_ready: true,
    checkout_provider: "mercado_pago",
    product_kind: "access",
    credit_amount: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
