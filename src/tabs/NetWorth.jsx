import React, { useState } from "react";
import { ACCOUNT_GROUPS, TAX_TYPES, blankAccount } from "../lib/defaults.js";
import { summarizeNetWorth, accountValue } from "../lib/networth.js";
import { fetchQuotes } from "../lib/quotes.js";
import { formatCurrency } from "../lib/format.js";
import { NumberField, TextField, SelectField, Stat, Section, Button, IconButton } from "../components/ui.jsx";

const taxOptions = TAX_TYPES.map((t) => ({ value: t.id, label: t.label }));

export default function NetWorth({ state, setState }) {
  const [pricing, setPricing] = useState(false);
  const [priceMsg, setPriceMsg] = useState("");
  const nw = summarizeNetWorth(state.accounts);

  const addAccount = (group) =>
    setState((s) => ({ ...s, accounts: [...s.accounts, blankAccount(group)] }));
  const updateAccount = (id, key, value) =>
    setState((s) => ({
      ...s,
      accounts: s.accounts.map((a) => (a.id === id ? { ...a, [key]: value } : a)),
    }));
  const removeAccount = (id) =>
    setState((s) => ({ ...s, accounts: s.accounts.filter((a) => a.id !== id) }));

  const refreshPrices = async () => {
    const tickers = state.accounts
      .filter((a) => a.ticker && Number(a.shares) > 0)
      .map((a) => a.ticker);
    if (!tickers.length) {
      setPriceMsg("Add a ticker and share count to a holding first.");
      return;
    }
    setPricing(true);
    setPriceMsg("Fetching live prices…");
    const quotes = await fetchQuotes(tickers);
    const found = Object.keys(quotes).length;
    setState((s) => ({
      ...s,
      accounts: s.accounts.map((a) => {
        const key = String(a.ticker || "").trim().toUpperCase();
        if (quotes[key]) {
          return { ...a, price: quotes[key], value: Number(a.shares) * quotes[key] };
        }
        return a;
      }),
    }));
    setPricing(false);
    setPriceMsg(
      found
        ? `Updated ${found} holding${found === 1 ? "" : "s"} at ${new Date().toLocaleTimeString()}.`
        : "No prices returned (the free quote feed may be blocked by your network/CORS). Enter values manually."
    );
  };

  return (
    <div className="stack">
      <div className="stats stats--4">
        <Stat label="Net worth" value={formatCurrency(nw.netWorth)} accent />
        <Stat label="Assets" value={formatCurrency(nw.assets)} />
        <Stat label="Liabilities" value={formatCurrency(nw.liabilities)} />
        <Stat label="Investable" value={formatCurrency(nw.investable)} hint="Cash + investments" />
      </div>

      <Section
        title="Accounts"
        subtitle="Add every account, asset and debt. Tag investments with a ticker to pull live prices."
        right={
          <div className="row-actions">
            <Button onClick={refreshPrices} variant="ghost" disabled={pricing}>
              {pricing ? "Refreshing…" : "↻ Refresh prices"}
            </Button>
          </div>
        }
      >
        {priceMsg && <p className="note">{priceMsg}</p>}

        {ACCOUNT_GROUPS.map((g) => {
          const rows = state.accounts.filter((a) => a.group === g.id);
          const subtotal = rows.reduce((s, a) => s + accountValue(a), 0);
          return (
            <div key={g.id} className="group">
              <div className="group__head">
                <h3>{g.label}</h3>
                <span className={g.id === "liability" ? "neg" : ""}>{formatCurrency(subtotal)}</span>
              </div>
              <div className="acct-rows">
                {rows.map((a) => (
                  <div key={a.id} className="acct-row">
                    <TextField
                      value={a.name}
                      onChange={(v) => updateAccount(a.id, "name", v)}
                      placeholder={`${g.label} account`}
                    />
                    <NumberField
                      prefix="$"
                      step={100}
                      value={a.value}
                      onChange={(v) => updateAccount(a.id, "value", v)}
                    />
                    {g.id === "investment" ? (
                      <>
                        <TextField
                          value={a.ticker}
                          onChange={(v) => updateAccount(a.id, "ticker", v)}
                          placeholder="Ticker"
                        />
                        <NumberField
                          value={a.shares}
                          step={1}
                          onChange={(v) => updateAccount(a.id, "shares", v)}
                        />
                      </>
                    ) : (
                      <>
                        <span className="acct-row__spacer" />
                        <span className="acct-row__spacer" />
                      </>
                    )}
                    {g.id !== "liability" ? (
                      <SelectField
                        value={a.taxType}
                        onChange={(v) => updateAccount(a.id, "taxType", v)}
                        options={taxOptions}
                      />
                    ) : (
                      <span className="acct-row__spacer" />
                    )}
                    <IconButton onClick={() => removeAccount(a.id)} label="Remove account" />
                  </div>
                ))}
              </div>
              <Button onClick={() => addAccount(g.id)} variant="dashed">
                + Add {g.label.toLowerCase()}
              </Button>
            </div>
          );
        })}
      </Section>

      <Section title="Tax-aware breakdown" subtitle="Where your assets sit for tax purposes — useful for withdrawal planning.">
        <div className="taxgrid">
          {TAX_TYPES.map((t) => {
            const amount = nw.byTax[t.id] || 0;
            if (!amount) return null;
            const pct = nw.assets ? (amount / nw.assets) * 100 : 0;
            return (
              <div key={t.id} className="taxgrid__item">
                <div className="taxgrid__bar">
                  <span style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
                <div className="taxgrid__meta">
                  <span>{t.label}</span>
                  <strong>{formatCurrency(amount)}</strong>
                </div>
              </div>
            );
          })}
          {!Object.keys(nw.byTax).length && <p className="note">Add accounts to see your tax breakdown.</p>}
        </div>
      </Section>
    </div>
  );
}
