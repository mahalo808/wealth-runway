// Currency options for Expat mode. Approximate USD conversion factors used only
// for display of the FIRE number in a local currency (static, offline-safe).
export const CURRENCIES = [
  { code: "USD", label: "US Dollar", perUsd: 1 },
  { code: "EUR", label: "Euro", perUsd: 0.92 },
  { code: "GBP", label: "British Pound", perUsd: 0.79 },
  { code: "MXN", label: "Mexican Peso", perUsd: 17.2 },
  { code: "THB", label: "Thai Baht", perUsd: 36.5 },
  { code: "VND", label: "Vietnamese Dong", perUsd: 25400 },
  { code: "CRC", label: "Costa Rican Colón", perUsd: 515 },
  { code: "JPY", label: "Japanese Yen", perUsd: 156 },
];

export function findCurrency(code) {
  return CURRENCIES.find((c) => c.code === code) || CURRENCIES[0];
}
