// Shared formatting helpers.

export function formatCurrency(value, currency = "USD", maximumFractionDigits = 0) {
  const v = Number.isFinite(value) ? value : 0;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits }).format(v);
  } catch {
    return `$${Math.round(v).toLocaleString()}`;
  }
}

export function formatCompact(value) {
  const v = Number.isFinite(value) ? value : 0;
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs)}`;
}

export function formatPercent(fraction, digits = 1) {
  return `${((Number.isFinite(fraction) ? fraction : 0) * 100).toFixed(digits)}%`;
}

export function formatYears(years) {
  if (years === null || years === undefined) return "—";
  if (years <= 0) return "Already there!";
  const whole = Math.floor(years);
  return `${whole} year${whole === 1 ? "" : "s"}`;
}

export function num(value, fallback = 0) {
  const n = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}
