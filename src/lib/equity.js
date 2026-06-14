// Equity compensation modeling: RSUs, ESPP, and stock options (feature 8).
// Produces an annual vesting income stream over a horizon.
import { num } from "./format.js";

// Returns an array of { yearOffset, value } describing pre-tax value vesting in
// each future year for a single grant.
export function grantSchedule(grant, horizon = 10) {
  const out = [];
  const start = Math.max(0, Math.round(num(grant.startYearOffset)));
  const vest = Math.max(1, Math.round(num(grant.vestYears, 1)));
  const growth = num(grant.growthRate) / 100;

  let baseAnnual;
  if (grant.kind === "options") {
    // Intrinsic value only: max(0, (current value per share - strike)) * shares.
    // We approximate "totalValue" as current underlying value of the shares.
    const perShare = num(grant.shares) > 0 ? num(grant.totalValue) / num(grant.shares) : 0;
    const intrinsic = Math.max(0, perShare - num(grant.strike)) * num(grant.shares);
    baseAnnual = intrinsic / vest;
  } else if (grant.kind === "espp") {
    // Discounted purchase: immediate gain = discount * amount contributed.
    const gross = num(grant.totalValue);
    baseAnnual = (gross * (1 + num(grant.discount))) / vest;
  } else {
    // RSUs: straight-line vest of total grant value.
    baseAnnual = num(grant.totalValue) / vest;
  }

  for (let i = 0; i < horizon; i++) {
    const yearOffset = i + 1;
    if (yearOffset > start && yearOffset <= start + vest) {
      out.push({ yearOffset, value: baseAnnual * Math.pow(1 + growth, i) });
    }
  }
  return out;
}

// Total annual equity income for a given year offset, summed across grants.
export function equityIncomeAtYear(grants = [], yearOffset, horizon = 40) {
  return grants.reduce((sum, g) => {
    const sched = grantSchedule(g, horizon);
    const hit = sched.find((s) => s.yearOffset === yearOffset);
    return sum + (hit ? hit.value : 0);
  }, 0);
}

// Total remaining unvested value across all grants.
export function totalUnvested(grants = [], horizon = 40) {
  return grants.reduce(
    (sum, g) => sum + grantSchedule(g, horizon).reduce((s, x) => s + x.value, 0),
    0
  );
}
