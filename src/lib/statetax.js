// State income & capital-gains tax estimates for the "State Tax Escape" /
// exit-tax calculator. Rates are simplified top-of-scale approximations for an
// educational estimate — not tax advice. Most states tax long-term capital
// gains as ordinary income, so capGainsRate mirrors the top income rate unless
// the state has none.

export const STATES = [
  { code: "CA", name: "California", incomeRate: 0.123, capGainsRate: 0.123, hasTax: true },
  { code: "NY", name: "New York", incomeRate: 0.109, capGainsRate: 0.109, hasTax: true },
  { code: "NJ", name: "New Jersey", incomeRate: 0.1075, capGainsRate: 0.1075, hasTax: true },
  { code: "HI", name: "Hawaii", incomeRate: 0.11, capGainsRate: 0.0725, hasTax: true },
  { code: "OR", name: "Oregon", incomeRate: 0.099, capGainsRate: 0.099, hasTax: true },
  { code: "MN", name: "Minnesota", incomeRate: 0.0985, capGainsRate: 0.0985, hasTax: true },
  { code: "MA", name: "Massachusetts", incomeRate: 0.05, capGainsRate: 0.05, hasTax: true },
  { code: "IL", name: "Illinois", incomeRate: 0.0495, capGainsRate: 0.0495, hasTax: true },
  { code: "CO", name: "Colorado", incomeRate: 0.044, capGainsRate: 0.044, hasTax: true },
  { code: "AZ", name: "Arizona", incomeRate: 0.025, capGainsRate: 0.025, hasTax: true },
  { code: "TX", name: "Texas", incomeRate: 0, capGainsRate: 0, hasTax: false },
  { code: "FL", name: "Florida", incomeRate: 0, capGainsRate: 0, hasTax: false },
  { code: "NV", name: "Nevada", incomeRate: 0, capGainsRate: 0, hasTax: false },
  { code: "WA", name: "Washington", incomeRate: 0, capGainsRate: 0.07, hasTax: false },
  { code: "TN", name: "Tennessee", incomeRate: 0, capGainsRate: 0, hasTax: false },
  { code: "WY", name: "Wyoming", incomeRate: 0, capGainsRate: 0, hasTax: false },
  { code: "SD", name: "South Dakota", incomeRate: 0, capGainsRate: 0, hasTax: false },
  { code: "AK", name: "Alaska", incomeRate: 0, capGainsRate: 0, hasTax: false },
  { code: "NH", name: "New Hampshire", incomeRate: 0, capGainsRate: 0, hasTax: false },
];

export function findState(code) {
  return STATES.find((s) => s.code === code) || STATES[0];
}

// Estimate the cost of leaving a high-tax state for a lower-tax one.
// - oneTimeExitTax: state tax owed if you realize unrealized capital gains
//   while still a resident of the origin state (a common pre-move scenario).
// - annualIncomeTaxSavings: ongoing state income tax you stop paying.
// - lifetimeSavings: annual savings projected over the chosen horizon.
export function exitTaxEstimate({
  fromCode,
  toCode,
  taxableIncome = 0,
  unrealizedGains = 0,
  realizeBeforeMove = true,
  horizonYears = 30,
}) {
  const from = findState(fromCode);
  const to = findState(toCode);

  const oneTimeExitTax = realizeBeforeMove
    ? unrealizedGains * from.capGainsRate
    : unrealizedGains * to.capGainsRate;

  const annualIncomeTaxFrom = taxableIncome * from.incomeRate;
  const annualIncomeTaxTo = taxableIncome * to.incomeRate;
  const annualIncomeTaxSavings = Math.max(annualIncomeTaxFrom - annualIncomeTaxTo, -Infinity);

  const lifetimeSavings = annualIncomeTaxSavings * horizonYears - oneTimeExitTax;

  return {
    from,
    to,
    oneTimeExitTax,
    annualIncomeTaxFrom,
    annualIncomeTaxTo,
    annualIncomeTaxSavings,
    lifetimeSavings,
    horizonYears,
  };
}
