// Central wiring: turn the full app state into projection inputs and outputs.
import {
  fireNumber,
  baristaFireNumber,
  expatFireNumber,
  projectToFire,
  BOGLEHEAD_PRESET,
  STANDARD_PRESET,
} from "./fire.js";
import { summarizeNetWorth } from "./networth.js";
import { grantSchedule } from "./equity.js";
import { benefitMultiplier } from "./socialsecurity.js";
import { num } from "./format.js";

const EXPAT_FACTORS = {
  Portugal: 0.55, Mexico: 0.5, Thailand: 0.4, Spain: 0.6,
  Vietnam: 0.38, "Costa Rica": 0.6, Greece: 0.58,
};

export function colFactor(fire) {
  if (fire.country === "Custom") return num(fire.customFactor, 1);
  return EXPAT_FACTORS[fire.country] ?? 1;
}

// Convert equity grants + custom streams + Social Security into a unified list
// of { type, amount, startAge, endAge } streams for the projection.
export function buildStreams(state) {
  const { profile, equity, streams, socialSecurity } = state;
  const currentAge = num(profile.currentAge);
  const out = [];

  // Custom income/expense streams (already age-based).
  for (const s of streams || []) {
    out.push({ type: s.type, amount: num(s.amount), startAge: num(s.startAge), endAge: num(s.endAge) });
  }

  // Equity vesting → income streams (one per grant, using average annual vest).
  for (const g of equity || []) {
    const sched = grantSchedule(g, 40);
    if (!sched.length) continue;
    const avg = sched.reduce((a, b) => a + b.value, 0) / sched.length;
    const startAge = currentAge + sched[0].yearOffset;
    const endAge = currentAge + sched[sched.length - 1].yearOffset;
    out.push({ type: "income", amount: avg, startAge, endAge });
  }

  // Social Security as inflation-naive income from claim age onward.
  const ss = socialSecurity || {};
  if (num(ss.monthlyAtFra) > 0) {
    const monthly = num(ss.monthlyAtFra) * benefitMultiplier(num(ss.claimAge, 67), num(ss.fra, 67));
    out.push({ type: "income", amount: monthly * 12, startAge: num(ss.claimAge, 67), endAge: num(profile.endAge, 95) });
  }

  return out;
}

export function deriveProjection(state) {
  const { fire, profile } = state;
  const preset = fire.boglehead ? BOGLEHEAD_PRESET : STANDARD_PRESET;
  const annualReturn = fire.returnOverride ?? preset.realReturn;
  const swr = preset.swr;

  let target;
  if (fire.mode === "barista") target = baristaFireNumber(fire.annualSpending, fire.baristaIncome, swr);
  else if (fire.mode === "expat") target = expatFireNumber(fire.annualSpending, colFactor(fire), swr);
  else target = fireNumber(fire.annualSpending, swr);

  const nw = summarizeNetWorth(state.accounts);
  const startingBalance = nw.investable;
  const annualContribution = num(fire.annualContribution);
  const streams = buildStreams(state);

  const { series, reachedYear } = projectToFire({
    currentAge: num(profile.currentAge),
    startingBalance,
    annualContribution,
    annualReturn,
    target,
    streams,
    maxYears: Math.max(1, num(profile.endAge, 95) - num(profile.currentAge)),
  });

  const fireAge = reachedYear !== null ? num(profile.currentAge) + reachedYear : null;

  return {
    preset,
    annualReturn,
    volatility: preset.volatility,
    swr,
    target,
    netWorth: nw,
    startingBalance,
    annualContribution,
    streams,
    series,
    reachedYear,
    fireAge,
  };
}
