// Pure financial projection engine for Wealth Runway.
// All functions are side-effect free so they are easy to test and reason about.

/** Coerce any input into a finite number, falling back when invalid. */
export function num(value, fallback = 0) {
  const n = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

const pct = (value) => num(value) / 100;

/**
 * Project net worth year-by-year through an accumulation phase (working years)
 * and a drawdown phase (retirement), accounting for assets, stock grants,
 * compensation savings, and U.S. Social Security.
 *
 * @returns {{ series: Array, summary: Object }}
 */
export function project(inputs) {
  const currentAge = Math.round(num(inputs.currentAge, 30));
  const retirementAge = Math.round(num(inputs.retirementAge, 65));
  const endAge = Math.max(retirementAge, Math.round(num(inputs.endAge, 95)));
  const inflation = pct(inputs.inflationRate);

  const comp = inputs.comp || {};
  const baseComp = num(comp.baseSalary) + num(comp.annualBonus);
  const raise = pct(comp.raiseRate);
  const savingsRate = pct(comp.savingsRate);
  const investReturn = pct(comp.investReturn);

  const retirement = inputs.retirement || {};
  const retReturn = pct(retirement.returnRate);
  const annualSpendToday = num(retirement.annualSpending);

  const ss = inputs.socialSecurity || {};
  const ssMonthly = num(ss.monthlyBenefit);
  const claimAge = Math.round(num(ss.claimAge, retirementAge));
  const cola = pct(ss.colaRate);

  // Mutable per-bucket state for the accumulation phase.
  const assetState = (inputs.assets || []).map((a) => ({
    value: num(a.value),
    growth: pct(a.growthRate),
    contrib: num(a.monthlyContribution) * 12,
  }));
  const grantState = (inputs.grants || []).map((g) => ({
    bucket: 0,
    total: num(g.totalValue),
    start: Math.max(0, Math.round(num(g.startYearOffset))),
    vest: Math.max(1, Math.round(num(g.vestYears, 1))),
    growth: pct(g.growthRate),
  }));
  let compSavings = 0;

  const accumulationNetWorth = () =>
    assetState.reduce((s, a) => s + a.value, 0) +
    grantState.reduce((s, g) => s + g.bucket, 0) +
    compSavings;

  const series = [];
  const years = endAge - currentAge;
  let pot = null; // single retirement pot, created at the retirement boundary
  let nestEgg = null;
  let depletionAge = null;
  let totalContrib = 0;
  let lifetimeSS = 0;

  // t = 0 is "today": record raw current values before any growth.
  series.push({
    t: 0,
    age: currentAge,
    netWorth: round(accumulationNetWorth()),
    contributions: 0,
    socialSecurity: 0,
    phase: "now",
  });

  for (let t = 1; t <= years; t++) {
    const age = currentAge + t;

    if (age < retirementAge) {
      // --- Accumulation: grow buckets and add savings ---
      assetState.forEach((a) => {
        a.value = a.value * (1 + a.growth) + a.contrib;
        totalContrib += a.contrib;
      });
      grantState.forEach((g) => {
        g.bucket *= 1 + g.growth;
        if (t > g.start && t <= g.start + g.vest) {
          g.bucket += g.total / g.vest;
        }
      });
      const grossComp = baseComp * Math.pow(1 + raise, t);
      const saved = grossComp * savingsRate;
      compSavings = compSavings * (1 + investReturn) + saved;
      totalContrib += saved;

      series.push({
        t,
        age,
        netWorth: round(accumulationNetWorth()),
        contributions: round(totalContrib),
        socialSecurity: 0,
        phase: "accumulate",
      });
    } else {
      // --- Retirement: collapse to a single pot, then draw down ---
      if (pot === null) {
        nestEgg = accumulationNetWorth();
        pot = nestEgg;
      }
      const spend = annualSpendToday * Math.pow(1 + inflation, t);
      const ssIncome =
        age >= claimAge
          ? ssMonthly * 12 * Math.pow(1 + cola, Math.max(0, age - claimAge))
          : 0;
      lifetimeSS += ssIncome;
      const netDraw = Math.max(0, spend - ssIncome);

      pot = pot * (1 + retReturn) - netDraw;
      if (pot <= 0 && depletionAge === null) {
        pot = 0;
        depletionAge = age;
      }

      series.push({
        t,
        age,
        netWorth: round(Math.max(0, pot)),
        contributions: round(totalContrib),
        socialSecurity: round(ssIncome),
        spend: round(spend),
        netDraw: round(netDraw),
        phase: "retire",
      });
    }
  }

  // If retirement age is beyond the horizon, nest egg is the final value.
  if (nestEgg === null) nestEgg = accumulationNetWorth();

  const finalPot = series[series.length - 1].netWorth;
  const hasRetirementPhase = endAge > retirementAge;

  const summary = {
    currentNetWorth: series[0].netWorth,
    nestEgg: round(nestEgg),
    retirementAge,
    totalContributions: round(totalContrib),
    investmentGrowth: round(nestEgg - series[0].netWorth - totalContrib),
    ssAnnualAtClaim: round(ssMonthly * 12),
    lifetimeSS: round(lifetimeSS),
    monthlyRetirementSpend: round(annualSpendToday / 12),
    depletionAge,
    fundedThroughAge: depletionAge ?? endAge,
    surplusAtEnd: depletionAge ? 0 : round(finalPot),
    neverDepletes: hasRetirementPhase && depletionAge === null,
    hasRetirementPhase,
  };

  return { series, summary };
}

function round(n) {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}
