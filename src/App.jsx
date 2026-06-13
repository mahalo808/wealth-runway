import React, { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { project } from "./lib/finance.js";
import { fmtUSD, fmtUSDCompact } from "./lib/format.js";
import { defaultState, uid } from "./lib/sampleData.js";

const STORAGE_KEY = "wealth-runway:v1";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultState(), ...JSON.parse(raw) };
  } catch {
    /* ignore corrupt storage */
  }
  return defaultState();
}

export default function App() {
  const [state, setState] = useState(loadState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage may be unavailable (private mode) */
    }
  }, [state]);

  const { series, summary } = useMemo(() => project(state), [state]);

  // --- generic updaters ---
  const setField = (key, value) => setState((s) => ({ ...s, [key]: value }));
  const setGroup = (group, key, value) =>
    setState((s) => ({ ...s, [group]: { ...s[group], [key]: value } }));

  const setRow = (group, id, key, value) =>
    setState((s) => ({
      ...s,
      [group]: s[group].map((row) =>
        row.id === id ? { ...row, [key]: value } : row
      ),
    }));
  const addRow = (group, blank) =>
    setState((s) => ({ ...s, [group]: [...s[group], { id: uid(), ...blank }] }));
  const removeRow = (group, id) =>
    setState((s) => ({ ...s, [group]: s[group].filter((r) => r.id !== id) }));

  const resetAll = () => {
    if (confirm("Reset all inputs back to the sample scenario?")) {
      setState(defaultState());
    }
  };

  const runwayLabel = summary.neverDepletes
    ? `Funded past ${state.endAge} 🎉`
    : `Funds last to age ${summary.fundedThroughAge}`;

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <h1>Wealth Runway</h1>
            <p className="tagline">
              Track net worth, model stock grants &amp; total comp, and see how
              long your money lasts.
            </p>
          </div>
        </div>
        <button className="ghost" onClick={resetAll}>
          Reset to sample
        </button>
      </header>

      <section className="cards">
        <Card label="Net worth today" value={fmtUSD(summary.currentNetWorth)} accent="cyan" />
        <Card
          label={`Nest egg at ${summary.retirementAge}`}
          value={fmtUSD(summary.nestEgg)}
          accent="indigo"
        />
        <Card
          label="Retirement runway"
          value={runwayLabel}
          sub={
            summary.neverDepletes
              ? `Surplus ${fmtUSD(summary.surplusAtEnd)}`
              : "Before Social Security runs the gap"
          }
          accent={summary.neverDepletes ? "green" : "amber"}
        />
        <Card
          label="Social Security / yr"
          value={fmtUSD(summary.ssAnnualAtClaim)}
          sub={`From age ${state.socialSecurity.claimAge}`}
          accent="cyan"
        />
      </section>

      <section className="panel chart-panel">
        <div className="panel-head">
          <h2>Projected net worth</h2>
          <span className="muted">
            Contributions {fmtUSD(summary.totalContributions)} · Growth{" "}
            {fmtUSD(summary.investmentGrowth)}
          </span>
        </div>
        <div className="chart">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 10, right: 12, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="nw" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
              <XAxis
                dataKey="age"
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={fmtUSDCompact}
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={56}
              />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceLine
                x={summary.retirementAge}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{ value: "Retire", fill: "#f59e0b", fontSize: 11, position: "top" }}
              />
              <Area
                type="monotone"
                dataKey="netWorth"
                stroke="#22d3ee"
                strokeWidth={2.5}
                fill="url(#nw)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid">
        <Panel title="Plan basics">
          <div className="fields">
            <Field label="Current age">
              <NumberInput value={state.currentAge} onChange={(v) => setField("currentAge", v)} />
            </Field>
            <Field label="Retirement age">
              <NumberInput value={state.retirementAge} onChange={(v) => setField("retirementAge", v)} />
            </Field>
            <Field label="Plan through age">
              <NumberInput value={state.endAge} onChange={(v) => setField("endAge", v)} />
            </Field>
            <Field label="Inflation" suffix="%">
              <NumberInput value={state.inflationRate} step={0.1} onChange={(v) => setField("inflationRate", v)} />
            </Field>
          </div>
        </Panel>

        <Panel title="Compensation">
          <div className="fields">
            <Field label="Base salary" prefix="$">
              <NumberInput value={state.comp.baseSalary} step={1000} onChange={(v) => setGroup("comp", "baseSalary", v)} />
            </Field>
            <Field label="Annual bonus" prefix="$">
              <NumberInput value={state.comp.annualBonus} step={1000} onChange={(v) => setGroup("comp", "annualBonus", v)} />
            </Field>
            <Field label="Annual raise" suffix="%">
              <NumberInput value={state.comp.raiseRate} step={0.1} onChange={(v) => setGroup("comp", "raiseRate", v)} />
            </Field>
            <Field label="Savings rate" suffix="%">
              <NumberInput value={state.comp.savingsRate} step={0.5} onChange={(v) => setGroup("comp", "savingsRate", v)} />
            </Field>
            <Field label="Blended return on savings" suffix="%">
              <NumberInput value={state.comp.investReturn} step={0.1} onChange={(v) => setGroup("comp", "investReturn", v)} />
            </Field>
          </div>
          <p className="hint">
            Total comp {fmtUSD(state.comp.baseSalary + state.comp.annualBonus)} ·
            saving {fmtUSD(((state.comp.baseSalary + state.comp.annualBonus) * state.comp.savingsRate) / 100)}/yr
          </p>
        </Panel>

        <Panel title="Retirement spending">
          <div className="fields">
            <Field label="Annual spending (today's $)" prefix="$">
              <NumberInput value={state.retirement.annualSpending} step={1000} onChange={(v) => setGroup("retirement", "annualSpending", v)} />
            </Field>
            <Field label="Return in retirement" suffix="%">
              <NumberInput value={state.retirement.returnRate} step={0.1} onChange={(v) => setGroup("retirement", "returnRate", v)} />
            </Field>
          </div>
          <p className="hint">
            ~{fmtUSD(summary.monthlyRetirementSpend)}/mo before inflation.
          </p>
        </Panel>

        <Panel title="Social Security (USA)">
          <div className="fields">
            <Field label="Est. monthly benefit" prefix="$">
              <NumberInput value={state.socialSecurity.monthlyBenefit} step={50} onChange={(v) => setGroup("socialSecurity", "monthlyBenefit", v)} />
            </Field>
            <Field label="Claim age">
              <NumberInput value={state.socialSecurity.claimAge} onChange={(v) => setGroup("socialSecurity", "claimAge", v)} />
            </Field>
            <Field label="COLA" suffix="%">
              <NumberInput value={state.socialSecurity.colaRate} step={0.1} onChange={(v) => setGroup("socialSecurity", "colaRate", v)} />
            </Field>
          </div>
          <p className="hint">Estimate yours at ssa.gov/myaccount.</p>
        </Panel>
      </div>

      <Panel title="Assets &amp; investments" wide>
        <Table
          columns={["Asset", "Value", "Growth %", "Monthly add", ""]}
          rows={state.assets}
          render={(a) => (
            <>
              <td>
                <TextInput value={a.name} onChange={(v) => setRow("assets", a.id, "name", v)} />
              </td>
              <td>
                <NumberInput value={a.value} step={1000} prefix="$" onChange={(v) => setRow("assets", a.id, "value", v)} />
              </td>
              <td>
                <NumberInput value={a.growthRate} step={0.1} onChange={(v) => setRow("assets", a.id, "growthRate", v)} />
              </td>
              <td>
                <NumberInput value={a.monthlyContribution} step={50} prefix="$" onChange={(v) => setRow("assets", a.id, "monthlyContribution", v)} />
              </td>
              <td className="row-action">
                <button className="icon" onClick={() => removeRow("assets", a.id)} aria-label="Remove">×</button>
              </td>
            </>
          )}
        />
        <button className="add" onClick={() => addRow("assets", { name: "New asset", value: 0, growthRate: 5, monthlyContribution: 0 })}>
          + Add asset
        </button>
      </Panel>

      <Panel title="Stock grants &amp; RSUs" wide>
        <Table
          columns={["Grant", "Total value", "Starts in (yrs)", "Vest years", "Growth %", ""]}
          rows={state.grants}
          render={(g) => (
            <>
              <td>
                <TextInput value={g.name} onChange={(v) => setRow("grants", g.id, "name", v)} />
              </td>
              <td>
                <NumberInput value={g.totalValue} step={1000} prefix="$" onChange={(v) => setRow("grants", g.id, "totalValue", v)} />
              </td>
              <td>
                <NumberInput value={g.startYearOffset} onChange={(v) => setRow("grants", g.id, "startYearOffset", v)} />
              </td>
              <td>
                <NumberInput value={g.vestYears} onChange={(v) => setRow("grants", g.id, "vestYears", v)} />
              </td>
              <td>
                <NumberInput value={g.growthRate} step={0.1} onChange={(v) => setRow("grants", g.id, "growthRate", v)} />
              </td>
              <td className="row-action">
                <button className="icon" onClick={() => removeRow("grants", g.id)} aria-label="Remove">×</button>
              </td>
            </>
          )}
        />
        <button className="add" onClick={() => addRow("grants", { name: "New grant", totalValue: 0, startYearOffset: 0, vestYears: 4, growthRate: 8 })}>
          + Add grant
        </button>
      </Panel>

      <footer className="footer">
        <p>
          Wealth Runway is a planning estimate, not financial advice. Figures are
          nominal unless noted. Your data stays in your browser (localStorage).
        </p>
      </footer>
    </div>
  );
}

/* ---------- presentational components ---------- */

function Card({ label, value, sub, accent = "cyan" }) {
  return (
    <div className={`card card-${accent}`}>
      <span className="card-label">{label}</span>
      <span className="card-value">{value}</span>
      {sub && <span className="card-sub">{sub}</span>}
    </div>
  );
}

function Panel({ title, children, wide }) {
  return (
    <section className={`panel ${wide ? "panel-wide" : ""}`}>
      <div className="panel-head">
        <h2 dangerouslySetInnerHTML={{ __html: title }} />
      </div>
      {children}
    </section>
  );
}

function Field({ label, prefix, suffix, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <div className="input-wrap">
        {prefix && <span className="affix">{prefix}</span>}
        {children}
        {suffix && <span className="affix affix-suffix">{suffix}</span>}
      </div>
    </label>
  );
}

function NumberInput({ value, onChange, step = 1, prefix, suffix }) {
  const input = (
    <input
      type="number"
      inputMode="decimal"
      value={value}
      step={step}
      onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      onFocus={(e) => e.target.select()}
    />
  );
  if (!prefix && !suffix) return input;
  return (
    <div className="input-wrap inline">
      {prefix && <span className="affix">{prefix}</span>}
      {input}
      {suffix && <span className="affix affix-suffix">{suffix}</span>}
    </div>
  );
}

function TextInput({ value, onChange }) {
  return <input type="text" value={value} onChange={(e) => onChange(e.target.value)} />;
}

function Table({ columns, rows, render }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>{render(row)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className="tooltip">
      <div className="tooltip-age">Age {d.age}</div>
      <div className="tooltip-row">
        <span>Net worth</span>
        <strong>{fmtUSD(d.netWorth)}</strong>
      </div>
      {d.phase === "retire" && d.socialSecurity > 0 && (
        <div className="tooltip-row muted">
          <span>Social Security</span>
          <span>{fmtUSD(d.socialSecurity)}/yr</span>
        </div>
      )}
    </div>
  );
}
