// Robinhood guidance + a paste-import. This is a static client-side app, so it
// can't hold a live Robinhood connection (that needs OAuth + a backend). Instead
// we (1) explain how to best use Robinhood's agentic AI ("Cortex") and the
// Robinhood Gold Card AI, and (2) let users paste holdings to import them.
import { blankAccount } from "./defaults.js";
import { num } from "./format.js";

// "Best uses" for Robinhood's AI tools — shown as actionable tips, not advice.
export const RH_AGENT_TIPS = [
  {
    title: "Robinhood Cortex (agentic AI)",
    body: "Use Cortex for market context and trade analysis, not blind orders. Ask it to explain WHY a position moved and what could break the thesis, then sanity-check that against your concentration limits here.",
  },
  {
    title: "Let the agent draft, you approve",
    body: "Keep agentic trading in 'review' mode: have it propose orders, but require manual confirmation. Pair it with this app's concentration and cash-drag checks before approving.",
  },
  {
    title: "Gold Card AI (banking/credit)",
    body: "Route recurring spend through the card for 3% cash back, but auto-sweep balances to brokerage so rewards get invested. Never carry a balance — card APR dwarfs expected market returns.",
  },
  {
    title: "Cash sweep & 30-day exports",
    body: "Enable Gold cash sweep for idle cash, and export positions monthly to paste here. A current snapshot is what makes the date-aware review accurate.",
  },
];

// Parse pasted holdings. Accepts loose lines like:
//   "Brokerage - 6787  $125,447.79"
//   "AAPL 50 $9,000"
//   "VTI, 320.5"
function moneyToNum(s) {
  return num(String(s).replace(/[^0-9.\-]/g, ""));
}

export function parseRobinhood(text) {
  const out = [];
  for (const raw of String(text).split(/\n+/)) {
    const line = raw.trim();
    if (!line) continue;
    const dollars = [...line.matchAll(/\$\s?[\d,]+(?:\.\d+)?/g)].map((m) => moneyToNum(m[0]));
    const value = dollars.length ? Math.max(...dollars) : 0;
    const tickerMatch = line.match(/\b[A-Z]{1,5}\b/);
    const name = line.replace(/\$\s?[\d,]+(?:\.\d+)?/g, "").trim().replace(/[,\-]+$/, "") || (tickerMatch ? tickerMatch[0] : "Holding");
    if (value <= 0) continue;
    const acct = blankAccount("investment");
    out.push({ ...acct, name, ticker: tickerMatch ? tickerMatch[0] : "", value, taxType: "taxable" });
  }
  return out;
}
