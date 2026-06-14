import React from "react";
import { blankGrant, blankStream } from "../lib/defaults.js";
import { totalUnvested } from "../lib/equity.js";
import { formatCurrency, num } from "../lib/format.js";
import { NumberField, TextField, SelectField, Stat, Section, Button, IconButton } from "../components/ui.jsx";

const KINDS = [
  { value: "rsu", label: "RSU" },
  { value: "espp", label: "ESPP" },
  { value: "options", label: "Stock options" },
];

export default function IncomeEquity({ state, setState }) {
  const { income, equity, streams } = state;
  const setIncome = (k, v) => setState((s) => ({ ...s, income: { ...s.income, [k]: v } }));

  const updateGrant = (id, k, v) =>
    setState((s) => ({ ...s, equity: s.equity.map((g) => (g.id === id ? { ...g, [k]: v } : g)) }));
  const addGrant = () => setState((s) => ({ ...s, equity: [...s.equity, blankGrant()] }));
  const removeGrant = (id) => setState((s) => ({ ...s, equity: s.equity.filter((g) => g.id !== id) }));

  const updateStream = (id, k, v) =>
    setState((s) => ({ ...s, streams: s.streams.map((x) => (x.id === id ? { ...x, [k]: v } : x)) }));
  const addStream = () => setState((s) => ({ ...s, streams: [...s.streams, blankStream()] }));
  const removeStream = (id) => setState((s) => ({ ...s, streams: s.streams.filter((x) => x.id !== id) }));

  const totalComp = num(income.baseSalary) + num(income.bonus);
  const annualSaved = (totalComp * num(income.savingsRate)) / 100;
  const unvested = totalUnvested(equity);

  const applySavingsToContribution = () =>
    setState((s) => ({ ...s, fire: { ...s.fire, annualContribution: Math.round(annualSaved) } }));

  return (
    <div className="stack">
      <div className="stats stats--3">
        <Stat label="Total comp" value={formatCurrency(totalComp)} hint="Base + bonus" accent />
        <Stat label="Saving / yr" value={formatCurrency(annualSaved)} hint={`${num(income.savingsRate)}% savings rate`} />
        <Stat label="Unvested equity" value={formatCurrency(unvested)} hint="Across all grants" />
      </div>

      <Section
        title="Compensation"
        subtitle="Your total comp and how much of it you save."
        right={<Button variant="ghost" onClick={applySavingsToContribution}>Use savings as FIRE contribution</Button>}
      >
        <div className="grid">
          <NumberField label="Base salary" value={income.baseSalary} onChange={(v) => setIncome("baseSalary", v)} prefix="$" step={1000} />
          <NumberField label="Annual bonus" value={income.bonus} onChange={(v) => setIncome("bonus", v)} prefix="$" step={1000} />
          <NumberField label="Annual raise" value={income.raiseRate} onChange={(v) => setIncome("raiseRate", v)} suffix="%" step={0.5} />
          <NumberField label="Savings rate" value={income.savingsRate} onChange={(v) => setIncome("savingsRate", v)} suffix="%" step={1} />
        </div>
      </Section>

      <Section title="Stock grants — RSU / ESPP / options" subtitle="Model vesting value. ESPP applies your discount; options use intrinsic value over the strike.">
        <div className="equity-rows">
          {equity.map((g) => (
            <div key={g.id} className="equity-row">
              <TextField value={g.name} onChange={(v) => updateGrant(g.id, "name", v)} placeholder="Grant name" />
              <SelectField value={g.kind} onChange={(v) => updateGrant(g.id, "kind", v)} options={KINDS} />
              <NumberField prefix="$" step={1000} value={g.totalValue} onChange={(v) => updateGrant(g.id, "totalValue", v)} />
              {g.kind === "options" ? (
                <>
                  <NumberField value={g.shares} step={1} onChange={(v) => updateGrant(g.id, "shares", v)} />
                  <NumberField prefix="$" step={1} value={g.strike} onChange={(v) => updateGrant(g.id, "strike", v)} />
                </>
              ) : g.kind === "espp" ? (
                <>
                  <NumberField value={Math.round(num(g.discount) * 100)} suffix="%" step={1} onChange={(v) => updateGrant(g.id, "discount", v / 100)} />
                  <span className="acct-row__spacer" />
                </>
              ) : (
                <>
                  <span className="acct-row__spacer" />
                  <span className="acct-row__spacer" />
                </>
              )}
              <NumberField value={g.startYearOffset} step={1} onChange={(v) => updateGrant(g.id, "startYearOffset", v)} />
              <NumberField value={g.vestYears} step={1} onChange={(v) => updateGrant(g.id, "vestYears", v)} />
              <IconButton onClick={() => removeGrant(g.id)} label="Remove grant" />
            </div>
          ))}
        </div>
        <div className="equity-legend note">
          Columns: name · type · total value · (options: shares, strike / espp: discount) · starts in (yrs) · vest yrs
        </div>
        <Button variant="dashed" onClick={addGrant}>+ Add grant</Button>
      </Section>

      <Section title="Other income & expenses" subtitle="One-off or recurring cash flows layered onto your plan, by age range.">
        <div className="stream-rows">
          {streams.map((x) => (
            <div key={x.id} className="stream-row">
              <TextField value={x.label} onChange={(v) => updateStream(x.id, "label", v)} placeholder="e.g. Rental income, college" />
              <SelectField
                value={x.type}
                onChange={(v) => updateStream(x.id, "type", v)}
                options={[{ value: "income", label: "Income" }, { value: "expense", label: "Expense" }]}
              />
              <NumberField prefix="$" step={1000} value={x.amount} onChange={(v) => updateStream(x.id, "amount", v)} />
              <NumberField value={x.startAge} step={1} onChange={(v) => updateStream(x.id, "startAge", v)} suffix="age" />
              <NumberField value={x.endAge} step={1} onChange={(v) => updateStream(x.id, "endAge", v)} suffix="age" />
              <IconButton onClick={() => removeStream(x.id)} label="Remove stream" />
            </div>
          ))}
        </div>
        <Button variant="dashed" onClick={addStream}>+ Add income / expense</Button>
      </Section>
    </div>
  );
}
