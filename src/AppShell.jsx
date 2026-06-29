import React, { useEffect, useMemo, useState } from "react";
import { emptyState } from "./lib/defaults.js";
import { deriveProjection } from "./lib/compute.js";
import { summarizeNetWorth } from "./lib/networth.js";
import { readStateFromHash } from "./lib/share.js";
import { formatCurrency } from "./lib/format.js";
import NetWorth from "./tabs/NetWorth.jsx";
import FirePlan from "./tabs/FirePlan.jsx";
import Projection from "./tabs/Projection.jsx";
import IncomeEquity from "./tabs/IncomeEquity.jsx";
import Debt from "./tabs/Debt.jsx";
import Optimize from "./tabs/Optimize.jsx";
import Scenarios from "./tabs/Scenarios.jsx";
import Advisor from "./tabs/Advisor.jsx";

const TABS = [
  { id: "networth", label: "Net Worth", Comp: NetWorth },
  { id: "fire", label: "FIRE Plan", Comp: FirePlan },
  { id: "projection", label: "Projection", Comp: Projection },
  { id: "income", label: "Income & Equity", Comp: IncomeEquity },
  { id: "debt", label: "Debt", Comp: Debt },
  { id: "optimize", label: "Optimize", Comp: Optimize },
  { id: "advisor", label: "Advisor", Comp: Advisor },
  { id: "scenarios", label: "Scenarios", Comp: Scenarios },
];

// Deep-merge a partial saved/shared state onto a fresh empty state so every
// key always exists (forward-compatible with older saved plans).
function hydrate(partial) {
  const base = emptyState();
  if (!partial || typeof partial !== "object") return base;
  const out = { ...base, ...partial };
  for (const key of ["profile", "fire", "income", "socialSecurity", "location"]) {
    out[key] = { ...base[key], ...(partial[key] || {}) };
  }
  for (const key of ["accounts", "equity", "streams", "debts"]) {
    out[key] = Array.isArray(partial[key]) ? partial[key] : base[key];
  }
  return out;
}

export default function AppShell() {
  // Clean slate on every load — unless a share link is present in the URL hash.
  const [state, setState] = useState(() => {
    const shared = readStateFromHash();
    return shared ? hydrate(shared) : emptyState();
  });
  const [tab, setTab] = useState("networth");

  // If we loaded from a share link, strip the hash so a plain refresh is clean.
  useEffect(() => {
    if (location.hash.includes("s=")) {
      history.replaceState(null, "", location.pathname + location.search);
    }
  }, []);

  const derived = useMemo(() => deriveProjection(state), [state]);
  const nw = useMemo(() => summarizeNetWorth(state.accounts), [state.accounts]);

  const loadState = (incoming) => {
    setState(hydrate(incoming));
    setTab("networth");
  };

  const resetAll = () => {
    if (confirm("Clear all inputs and start fresh? Saved scenarios are kept.")) {
      setState(emptyState());
      setTab("networth");
    }
  };

  const ActiveComp = TABS.find((t) => t.id === tab)?.Comp || NetWorth;

  return (
    <div className="app">
      <header className="hero">
        <div className="hero__row">
          <div className="hero__brand">
            <img src="/favicon.svg" alt="" width="34" height="34" />
            <h1>
              Wealth<span> Runway</span>
            </h1>
          </div>
          <div className="hero__right">
            <div className="nw-pill">
              <span>Net worth</span>
              <strong>{formatCurrency(nw.netWorth)}</strong>
            </div>
            <button className="btn btn--ghost" onClick={resetAll}>Reset</button>
          </div>
        </div>
        <p className="hero__tag">
          A free, no-signup money command center — net worth, FIRE, equity comp, debt,
          taxes &amp; Social Security. Your data stays in your browser.
        </p>
      </header>

      <nav className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`tab ${tab === t.id ? "tab--active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="tabpanel">
        <ActiveComp
          state={state}
          setState={setState}
          derived={derived}
          onLoadState={loadState}
        />
      </main>

      <footer className="footer">
        <p>
          Wealth Runway is an educational tool, not financial advice. Projections assume
          steady returns and simplified taxes — real markets and tax codes are messier.
          Nothing you enter leaves your device; there are no accounts and no servers.
        </p>
      </footer>
    </div>
  );
}
