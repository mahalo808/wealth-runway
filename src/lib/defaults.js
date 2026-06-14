// The single source of truth for the app's state shape.
// IMPORTANT: defaults are intentionally EMPTY so the app always loads as a
// clean slate. No sample numbers are pre-filled.

let counter = 0;
export function uid(prefix = "id") {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter}`;
}

export const ACCOUNT_GROUPS = [
  { id: "cash", label: "Cash" },
  { id: "investment", label: "Investments" },
  { id: "other", label: "Other assets" },
  { id: "liability", label: "Liabilities" },
];

// Tax treatment buckets used by the tax-aware analysis.
export const TAX_TYPES = [
  { id: "taxable", label: "Taxable (brokerage)" },
  { id: "deferred", label: "Tax-deferred (401k/Trad IRA)" },
  { id: "roth", label: "Roth (after-tax)" },
  { id: "hsa", label: "HSA" },
  { id: "cash", label: "Cash / banking" },
  { id: "other", label: "Other" },
];

export function blankAccount(group = "cash") {
  return {
    id: uid("acct"),
    group,
    name: "",
    value: 0,
    ticker: "",
    shares: 0,
    taxType: group === "investment" ? "taxable" : group === "cash" ? "cash" : "other",
  };
}

export function blankGrant() {
  return {
    id: uid("grant"),
    name: "",
    kind: "rsu", // rsu | espp | options
    totalValue: 0,
    shares: 0,
    strike: 0, // options only
    discount: 0.15, // espp only (15% typical)
    startYearOffset: 0,
    vestYears: 4,
    growthRate: 0,
  };
}

export function blankStream() {
  return { id: uid("stream"), label: "", type: "income", amount: 0, startAge: 0, endAge: 0 };
}

export function blankDebt() {
  return { id: uid("debt"), name: "", kind: "mortgage", balance: 0, rate: 0, payment: 0, extraPayment: 0 };
}

export function emptyState() {
  return {
    version: 1,
    profile: { currentAge: 0, retireAge: 0, endAge: 95 },
    fire: {
      mode: "standard",
      boglehead: false,
      annualSpending: 0,
      annualContribution: 0,
      baristaIncome: 0,
      country: "Portugal",
      customFactor: 0.5,
      currency: "USD",
      returnOverride: null,
      inflation: 0.025,
    },
    accounts: [],
    income: { baseSalary: 0, bonus: 0, raiseRate: 0, savingsRate: 0 },
    equity: [],
    streams: [],
    debts: [],
    socialSecurity: { monthlyAtFra: 0, fra: 67, claimAge: 67, colaRate: 0.02 },
    location: { fromState: "CA", toState: "TX", taxableIncome: 0, unrealizedGains: 0, horizonYears: 30 },
  };
}
