import { MercadoPagoConfig, Preference, Payment, MerchantOrder } from 'mercadopago';

/**
 * Cliente Mercado Pago — server only.
 * Lee MP_ACCESS_TOKEN del entorno (NO usar en componentes cliente).
 *
 * SDK v3: la API es por recurso (new Preference(client).create({...})), no
 * más mp.preferences.create() del v1.
 */
function getClient() {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('Falta MP_ACCESS_TOKEN en el entorno');
  }
  return new MercadoPagoConfig({
    accessToken,
    options: { timeout: 10_000 },
  });
}

export function getPreferenceClient() {
  return new Preference(getClient());
}

export function getPaymentClient() {
  return new Payment(getClient());
}

export function getMerchantOrderClient() {
  return new MerchantOrder(getClient());
}
