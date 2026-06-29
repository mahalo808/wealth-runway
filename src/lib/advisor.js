// Local, rule-based portfolio review (no AI required). Produces date-aware
// "real deal" observations about poor allocations. These are heuristics for
// education, not financial advice. The same snapshot feeds the optional LLM.
import { summarizeNetWorth, accountValue } from "./networth.js";
import { num } from "./format.js";

const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Compact snapshot of the user's finances for both heuristics and the LLM.
export function buildSnapshot(state) {
  const nw = summarizeNetWorth(state.accounts);
  const investments = state.accounts.filter((a) => a.group === "investment");
  const positions = investments.map((a) => ({
    name: a.name || "Unnamed",
    ticker: (a.ticker || "").toUpperCase(),
    value: Math.round(accountValue(a)),
    taxType: a.taxType,
  }));
  const cashMonths = state.fire?.annualSpending
    ? (nw.groups.cash / (num(state.fire.annualSpending) / 12)).toFixed(1)
    : null;
  return {
    asOf: new Date().toISOString().slice(0, 10),
    netWorth: Math.round(nw.netWorth),
    assets: Math.round(nw.assets),
    liabilities: Math.round(nw.liabilities),
    cash: Math.round(nw.groups.cash),
    investments: Math.round(nw.groups.investment),
    other: Math.round(nw.groups.other),
    cashMonthsOfSpending: cashMonths,
    age: num(state.profile?.currentAge) || null,
    positions,
    debts: (state.debts || []).map((d) => ({ name: d.name, rate: num(d.rate), balance: num(d.balance) })),
  };
}

// Heuristic findings. Severity: "warn" | "watch" | "good". Date-aware notes
// flag time-sensitive items (e.g. idle cash while short rates are elevated).
export function reviewPortfolio(state) {
  const nw = summarizeNetWorth(state.accounts);
  const findings = [];
  const total = nw.assets || 1;
  const now = new Date();
  const period = `${MONTH[now.getMonth()]} ${now.getFullYear()}`;

  // Concentration in a single position.
  const inv = state.accounts.filter((a) => a.group === "investment");
  for (const a of inv) {
    const v = accountValue(a);
    const pct = v / total;
    if (pct >= 0.2 && v > 0) {
      findings.push({
        severity: "warn",
        title: `Concentrated in ${a.name || a.ticker || "one holding"}`,
        body: `${(pct * 100).toFixed(0)}% of assets sit in a single position. A single-stock blow-up could wipe out years of saving — most planners cap any one stock near 5–10%.`,
      });
    }
  }

  // Cash drag — too much idle cash relative to spending.
  const monthsCash = num(state.fire?.annualSpending) ? nw.groups.cash / (num(state.fire.annualSpending) / 12) : null;
  if (monthsCash !== null && monthsCash > 12) {
    findings.push({
      severity: "warn",
      title: "Large cash pile losing to inflation",
      body: `You hold ~${monthsCash.toFixed(0)} months of expenses in cash. As of ${period}, cash beyond a 3–6 month emergency fund typically lags a diversified portfolio after inflation.`,
    });
  } else if (nw.groups.cash > 0 && nw.groups.cash / total > 0.3) {
    findings.push({
      severity: "watch",
      title: "High cash allocation",
      body: `Cash is ${((nw.groups.cash / total) * 100).toFixed(0)}% of assets. Confirm it's a deliberate buffer and parked in a HYSA/T-bills rather than a 0% checking account.`,
    });
  }

  // Few or no diversified holdings.
  if (inv.length > 0 && inv.length <= 2 && nw.groups.investment > 0) {
    findings.push({
      severity: "watch",
      title: "Thin diversification",
      body: "Only a couple of investment holdings. A broad index fund spreads risk across hundreds of companies for near-zero fees.",
    });
  }

  // High-rate debt vs investing.
  for (const d of state.debts || []) {
    if (num(d.rate) >= 7 && num(d.balance) > 0) {
      findings.push({
        severity: "warn",
        title: `High-rate debt: ${d.name || "loan"}`,
        body: `At ${num(d.rate)}% APR, paying this down is a guaranteed return that likely beats the market. Prioritize over taxable investing.`,
      });
    }
  }

  // Missing retirement tax shelters.
  const hasRoth = state.accounts.some((a) => a.taxType === "roth");
  const hasDeferred = state.accounts.some((a) => a.taxType === "deferred");
  if (nw.groups.investment > 50000 && !hasRoth && !hasDeferred) {
    findings.push({
      severity: "watch",
      title: "No tax-advantaged accounts",
      body: "Investing only in taxable accounts leaves 401(k)/IRA tax breaks on the table. Max those before plain brokerage.",
    });
  }

  if (!findings.length) {
    findings.push({
      severity: "good",
      title: "No major red flags",
      body: "Nothing obvious stands out from the basic checks. Add an AI provider below for a deeper, current-events take.",
    });
  }
  return { period, findings };
}

// Prompt for any LLM. Asks for current, date-aware, blunt suggestions.
export function buildAdvicePrompt(state) {
  const snap = buildSnapshot(state);
  return [
    "You are a blunt, experienced financial coach. Today's date: " + snap.asOf + ".",
    "Review this person's finances and call out which assets/allocations are POOR decisions for the current period, with concrete moves. Be specific and honest, not generic. Note risks tied to the current macro environment. End with a one-line disclaimer that this is educational, not advice.",
    "",
    "Net worth: $" + snap.netWorth + " | Cash: $" + snap.cash + " | Investments: $" + snap.investments + " | Other: $" + snap.other + " | Liabilities: $" + snap.liabilities,
    snap.age ? "Age: " + snap.age : "",
    snap.cashMonthsOfSpending ? "Cash = " + snap.cashMonthsOfSpending + " months of spending" : "",
    "Holdings: " + (snap.positions.map((p) => `${p.name}${p.ticker ? " (" + p.ticker + ")" : ""} $${p.value} [${p.taxType}]`).join("; ") || "none"),
    snap.debts.length ? "Debts: " + snap.debts.map((d) => `${d.name} $${d.balance} @ ${d.rate}%`).join("; ") : "Debts: none",
  ].filter(Boolean).join("\n");
}
