const trustedFetchSites = new Set(["same-origin", "same-site", "none"]);
const localHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

export function canCreateMercadoPagoCheckout(product) {
  return Boolean(
    product?.active &&
      product?.launch_ready &&
      product?.checkout_provider === "mercado_pago",
  );
}

export function getMercadoPagoCredentialProblem({ accessToken, publicKey }) {
  const cleanAccessToken = String(accessToken || "").trim();
  const cleanPublicKey = String(publicKey || "").trim();

  if (!cleanAccessToken) return "missing_access_token";
  if (isStripeSecretKeyPrefix(cleanAccessToken)) {
    return "stripe_secret_key_used_as_mercado_pago_access_token";
  }
  if (!isMercadoPagoAccessTokenPrefix(cleanAccessToken)) {
    return "unexpected_access_token_prefix";
  }
  if (cleanPublicKey && cleanPublicKey === cleanAccessToken) {
    return "public_key_matches_access_token";
  }

  return null;
}

export function getMercadoPagoCredentialAudit({
  accessToken,
  accessTokenVariable = "MERCADO_PAGO_ACCESS_TOKEN",
  sandbox,
  notificationUrl,
}) {
  const cleanAccessToken = String(accessToken || "").trim();

  return {
    accessTokenVariable,
    accessTokenPrefix: safeCredentialPrefix(cleanAccessToken),
    accessTokenLooksLikeMercadoPago: isMercadoPagoAccessTokenPrefix(cleanAccessToken),
    accessTokenLooksLikeStripe: isStripeSecretKeyPrefix(cleanAccessToken),
    sandboxEnabled: sandbox === true,
    hasNotificationUrl: Boolean(String(notificationUrl || "").trim()),
  };
}

export function safeCredentialPrefix(value) {
  const clean = String(value || "").trim();
  return clean ? clean.slice(0, 8) : "<empty>";
}

export function isTrustedCheckoutOrigin({
  origin,
  secFetchSite,
  siteUrl,
  nodeEnv = process.env.NODE_ENV,
}) {
  const trustedOrigin = normalizeOrigin(siteUrl);
  const requestOrigin = normalizeOrigin(origin);

  if (!trustedOrigin) return false;
  if (secFetchSite && !trustedFetchSites.has(secFetchSite)) return false;
  if (!requestOrigin) return nodeEnv !== "production";

  return requestOrigin === trustedOrigin;
}

export function isPaymentSiteUrlSafe(siteUrl, nodeEnv = process.env.NODE_ENV) {
  const parsed = parseUrl(siteUrl);
  if (!parsed) return false;

  if (nodeEnv === "production") {
    return parsed.protocol === "https:" && !localHosts.has(parsed.hostname);
  }

  if (parsed.protocol === "https:") return true;
  return parsed.protocol === "http:" && localHosts.has(parsed.hostname);
}

function normalizeOrigin(value) {
  const parsed = parseUrl(value);
  return parsed?.origin ?? "";
}

function parseUrl(value) {
  try {
    return new URL(String(value || ""));
  } catch {
    return null;
  }
}

function isMercadoPagoAccessTokenPrefix(value) {
  return value.startsWith("APP_USR-") || value.startsWith("TEST-");
}

function isStripeSecretKeyPrefix(value) {
  return value.startsWith("sk_live_") || value.startsWith("sk_test_");
}
