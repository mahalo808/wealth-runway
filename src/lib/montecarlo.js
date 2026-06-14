// Monte Carlo simulation + sequence-of-returns stress test.
import { streamsNetAtAge } from "./fire.js";

// Box–Muller transform: standard normal random sample.
function randNormal() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Run N simulated accumulation paths with random annual returns drawn from a
// normal distribution. Returns percentile bands over time and the probability
// of reaching the FIRE target by the final modelled year.
export function monteCarlo({
  currentAge,
  startingBalance,
  annualContribution,
  meanReturn,
  volatility,
  target,
  streams = [],
  years = 40,
  runs = 600,
}) {
  const balancesByYear = Array.from({ length: years + 1 }, () => []);
  let successes = 0;

  for (let run = 0; run < runs; run++) {
    let balance = startingBalance;
    let reached = false;
    for (let y = 0; y <= years; y++) {
      balancesByYear[y].push(balance);
      if (!reached && target > 0 && balance >= target) {
        reached = true;
      }
      const r = meanReturn + volatility * randNormal();
      const add = annualContribution + streamsNetAtAge(streams, currentAge + y);
      balance = Math.max(balance * (1 + r) + add, 0);
    }
    if (reached) successes += 1;
  }

  const percentile = (arr, p) => {
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
    return sorted[idx];
  };

  const bands = balancesByYear.map((vals, y) => ({
    age: currentAge + y,
    p10: Math.round(percentile(vals, 10)),
    p50: Math.round(percentile(vals, 50)),
    p90: Math.round(percentile(vals, 90)),
    target: Math.round(target),
  }));

  return {
    bands,
    successProbability: runs ? successes / runs : 0,
  };
}

// Sequence-of-returns stress test: apply a market crash in the first few years
// of an otherwise steady-return path and report the dollar/age impact.
export function sequenceStressTest({
  currentAge,
  startingBalance,
  annualContribution,
  annualReturn,
  target,
  streams = [],
  crashYears = 3,
  crashReturn = -0.2,
  maxYears = 70,
}) {
  const run = (crash) => {
    let balance = startingBalance;
    let reachedYear = null;
    for (let y = 0; y <= maxYears; y++) {
      if (reachedYear === null && target > 0 && balance >= target) reachedYear = y;
      const r = crash && y < crashYears ? crashReturn : annualReturn;
      const add = annualContribution + streamsNetAtAge(streams, currentAge + y);
      balance = Math.max(balance * (1 + r) + add, 0);
    }
    return reachedYear;
  };

  const baseline = run(false);
  const stressed = run(true);
  const delay = baseline !== null && stressed !== null ? stressed - baseline : null;
  return { baseline, stressed, delay };
}
