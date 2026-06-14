// Net-worth aggregation from the account list (feature: net-worth tracker +
// tax-aware buckets).
import { num } from "./format.js";

export function accountValue(a) {
  // If a ticker + share count + cached price exist, prefer market value.
  if (a.ticker && a.price && num(a.shares) > 0) {
    return num(a.shares) * num(a.price);
  }
  return num(a.value);
}

export function summarizeNetWorth(accounts = []) {
  const groups = { cash: 0, investment: 0, other: 0, liability: 0 };
  const byTax = {};

  for (const a of accounts) {
    const v = accountValue(a);
    if (a.group === "liability") {
      groups.liability += v;
    } else {
      groups[a.group] = (groups[a.group] || 0) + v;
      byTax[a.taxType] = (byTax[a.taxType] || 0) + v;
    }
  }

  const assets = groups.cash + groups.investment + groups.other;
  const liabilities = groups.liability;
  const netWorth = assets - liabilities;

  // "Investable" assets exclude illiquid 'other' (e.g. home equity, points)
  // and cash buffers are partially investable — we treat cash + investments.
  const investable = groups.cash + groups.investment;

  return { groups, byTax, assets, liabilities, netWorth, investable };
}
