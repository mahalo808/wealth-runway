// EmberFI projection engine — pure functions, no UI dependencies.

export const SAFE_WITHDRAWAL_RATE = 0.04;

// Boglehead default assumptions: a simple, low-cost, broadly diversified
// index portfolio. Slightly more conservative real return and a 3.5% SWR.
export const BOGLEHEAD_PRESET = {
  realReturn: 0.05, // 5% real (after inflation)
  swr: 0.035, // 3.5% withdrawal rate (more conservative)
  expenseRatio: 0.0003, // 0.03% — total-market index funds
  volatility: 0.12, // lower assumed volatility for a balanced index portfolio
};

export const STANDARD_PRESET = {
  realReturn: 0.07,
  swr: 0.04,
  expenseRatio: 0.005,
  volatility: 0.16,
};

// FIRE number = annual spending / safe withdrawal rate.
export function fireNumber(annualSpending, swr = SAFE_WITHDRAWAL_RATE) {
  if (!annualSpending || swr <= 0) return 0;
  return annualSpending / swr;
}

// Barista FIRE: part-time income covers part of spending, so the portfolio
// only needs to fund the *gap*.
export function baristaFireNumber(annualSpending, baristaIncome, swr = SAFE_WITHDRAWAL_RATE) {
  const gap = Math.max(annualSpending - baristaIncome, 0);
  return fireNumber(gap, swr);
}

// Expat FIRE: spending is scaled by a cost-of-living factor for the target
// country (e.g. 0.6 means living costs 60% of your home-country spending).
export function expatFireNumber(annualSpending, colFactor, swr = SAFE_WITHDRAWAL_RATE) {
  return fireNumber(annualSpending * colFactor, swr);
}

// Coast FIRE number: the amount you need *today* so that, with no further
// contributions, compounding alone reaches your full FIRE target by retireAge.
export function coastFireNumber({ fullTarget, currentAge, retireAge, annualReturn }) {
  const years = Math.max(retireAge - currentAge, 0);
  return fullTarget / Math.pow(1 + annualReturn, years);
}

// Sum the net annual cash flow from custom income/expense streams at a given age.
export function streamsNetAtAge(streams, age) {
  if (!streams || !streams.length) return 0;
  return streams.reduce((sum, s) => {
    const start = s.startAge ?? 0;
    const end = s.endAge ?? 200;
    if (age < start || age > end) return sum;
    const amount = Number(s.amount) || 0;
    return sum + (s.type === "income" ? amount : -amount);
  }, 0);
}

// Project net worth year by year until it reaches the target (or maxYears).
// Supports custom income/expense streams layered on top of the base contribution.
export function projectToFire({
  currentAge,
  startingBalance,
  annualContribution,
  annualReturn,
  target,
  streams = [],
  maxYears = 70,
}) {
  const series = [];
  let balance = startingBalance;
  let totalContrib = startingBalance;
  let reachedYear = null;

  for (let year = 0; year <= maxYears; year++) {
    const age = currentAge + year;
    series.push({
      year,
      age,
      balance: Math.round(balance),
      contributed: Math.round(totalContrib),
      target: Math.round(target),
    });

    if (reachedYear === null && target > 0 && balance >= target) {
      reachedYear = year;
    }

    const streamNet = streamsNetAtAge(streams, age);
    const yearlyAdd = annualContribution + streamNet;

    // Grow, then apply net contributions/streams (end-of-year).
    balance = balance * (1 + annualReturn) + yearlyAdd;
    totalContrib += yearlyAdd;

    if (reachedYear !== null && year >= reachedYear + 2) break;
  }

  return { series, reachedYear };
}

export const MILESTONES = [
  { key: "lean", label: "Lean FIRE", factor: 0.7, color: "#22c55e" },
  { key: "fire", label: "FIRE", factor: 1, color: "#f97316" },
  { key: "fat", label: "Fat FIRE", factor: 1.5, color: "#a855f7" },
];

export function formatCurrency(value, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value || 0);
  } catch {
    return `$${Math.round(value || 0).toLocaleString()}`;
  }
}

export function formatYears(years) {
  if (years === null || years === undefined) return "—";
  if (years === 0) return "Already there!";
  const whole = Math.floor(years);
  return `${whole} year${whole === 1 ? "" : "s"}`;
}
