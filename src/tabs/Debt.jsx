import React, { useMemo, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { blankDebt } from "../lib/defaults.js";
import { amortize, summarizeDebts, payoffVsInvest } from "../lib/debt.js";
import { formatCurrency, formatCompact, num } from "../lib/format.js";
import { NumberField, TextField, SelectField, Stat, Section, Button, IconButton } from "../components/ui.jsx";

const KINDS = [
  { value: "mortgage", label: "Mortgage" },
  { value: "auto", label: "Auto loan" },
  { value: "student", label: "Student loan" },
  { value: "card", label: "Credit card" },
  { value: "other", label: "Other" },
];

const tooltipStyle = { background: "#0f1722", border: "1px solid #26313f", borderRadius: 10, color: "#e6edf6" };

export default function Debt({ state, setState, derived }) {
  const { debts } = state;
  const [extra, setExtra] = useState(5000);
  const summary = summarizeDebts(debts);

  const update = (id, k, v) =>
    setState((s) => ({ ...s, debts: s.debts.map((d) => (d.id === id ? { ...d, [k]: v } : d)) }));
  const add = () => setState((s) => ({ ...s, debts: [...s.debts, blankDebt()] }));
  const remove = (id) => setState((s) => ({ ...s, debts: s.debts.filter((d) => d.id !== id) }));

  const highestRate = useMemo(
    () => debts.reduce((m, d) => Math.max(m, num(d.rate)), 0),
    [debts]
  );

  const decision = useMemo(
    () =>
      payoffVsInvest({
        debtRate: highestRate,
        investReturn: derived.annualReturn * 100,
        extra,
        years: 10,
      }),
    [highestRate, derived.annualReturn, extra]
  );

  // Combined payoff schedule (sum of all debt balances per year).
  const chartData = useMemo(() => {
    const perDebt = debts.map((d) => amortize(d).schedule);
    const maxYear = perDebt.reduce((m, sch) => Math.max(m, sch.length ? sch[sch.length - 1].year : 0), 0);
    const out = [];
    for (let y = 0; y <= Math.ceil(maxYear); y++) {
      let bal = 0;
      perDebt.forEach((sch) => {
        const point = [...sch].reverse().find((p) => p.year <= y);
        bal += point ? point.balance : 0;
      });
      out.push({ year: y, balance: Math.round(bal) });
    }
    return out;
  }, [debts]);

  return (
    <div className="stack">
      <div className="stats stats--3">
        <Stat label="Total debt" value={formatCurrency(summary.totalBalance)} accent />
        <Stat label="Monthly payments" value={formatCurrency(summary.totalMonthly)} />
        <Stat
          label="Interest remaining"
          value={Number.isFinite(summary.totalInterest) ? formatCurrency(summary.totalInterest) : "∞"}
          hint={summary.maxMonths ? `Debt-free in ~${Math.ceil(summary.maxMonths / 12)} yrs` : ""}
        />
      </div>

      <Section title="Debts & loans" subtitle="Enter balance, APR and your monthly payment. Add an extra payment to accelerate payoff.">
        <div className="debt-rows">
          {debts.map((d) => {
            const r = amortize(d);
            return (
              <div key={d.id} className="debt-row">
                <TextField value={d.name} onChange={(v) => update(d.id, "name", v)} placeholder="Loan name" />
                <SelectField value={d.kind} onChange={(v) => update(d.id, "kind", v)} options={KINDS} />
                <NumberField prefix="$" step={1000} value={d.balance} onChange={(v) => update(d.id, "balance", v)} />
                <NumberField suffix="%" step={0.1} value={d.rate} onChange={(v) => update(d.id, "rate", v)} />
                <NumberField prefix="$" step={50} value={d.payment} onChange={(v) => update(d.id, "payment", v)} />
                <NumberField prefix="+$" step={50} value={d.extraPayment} onChange={(v) => update(d.id, "extraPayment", v)} />
                <span className="debt-row__payoff">
                  {r.neverPaysOff ? "⚠ never" : r.months ? `${Math.ceil(r.months / 12)}y` : "—"}
                </span>
                <IconButton onClick={() => remove(d.id)} label="Remove debt" />
              </div>
            );
          })}
        </div>
        <div className="equity-legend note">Columns: name · type · balance · APR · payment · extra · payoff</div>
        <Button variant="dashed" onClick={add}>+ Add debt</Button>
      </Section>

      {chartData.length > 1 && summary.totalBalance > 0 && (
        <Section title="Payoff timeline" subtitle="Combined balance across all debts over time.">
          <div className="chart">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData} margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#26313f" />
                <XAxis dataKey="year" stroke="#7d8da3" tickMargin={8} unit="y" />
                <YAxis stroke="#7d8da3" width={64} tickFormatter={formatCompact} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(v)} labelFormatter={(y) => `Year ${y}`} />
                <Line type="monotone" dataKey="balance" stroke="#ef4444" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}

      <Section title="Pay off debt or invest?" subtitle="Compare putting extra money toward your highest-rate debt vs. investing it.">
        <div className="grid">
          <NumberField label="Extra per year" value={extra} onChange={setExtra} prefix="$" step={1000} />
          <NumberField label="Highest debt APR" value={highestRate} onChange={() => {}} suffix="%" step={0.1} />
        </div>
        <div className="verdict">
          <div className={`verdict__card ${decision.winner === "payoff" ? "verdict__card--win" : ""}`}>
            <span>Pay down debt</span>
            <strong>{formatCurrency(decision.payoffValue)}</strong>
            <small>Guaranteed at {highestRate.toFixed(1)}%</small>
          </div>
          <div className={`verdict__card ${decision.winner === "invest" ? "verdict__card--win" : ""}`}>
            <span>Invest instead</span>
            <strong>{formatCurrency(decision.investValue)}</strong>
            <small>At {(derived.annualReturn * 100).toFixed(1)}% expected</small>
          </div>
        </div>
        <p className="note">
          Over 10 years, <strong>{decision.winner === "invest" ? "investing" : "paying off debt"}</strong> comes out
          ahead by about {formatCurrency(decision.edge)} — but debt payoff is guaranteed, while investment returns are not.
        </p>
      </Section>
    </div>
  );
}
