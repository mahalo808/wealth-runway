import React, { useMemo } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { optimizeClaim } from "../lib/socialsecurity.js";
import { STATES, exitTaxEstimate } from "../lib/statetax.js";
import { formatCurrency, formatCompact, num } from "../lib/format.js";
import { NumberField, SelectField, Stat, Section } from "../components/ui.jsx";

const tooltipStyle = { background: "#0f1722", border: "1px solid #26313f", borderRadius: 10, color: "#e6edf6" };
const stateOptions = STATES.map((s) => ({ value: s.code, label: s.name }));

export default function Optimize({ state, setState }) {
  const { socialSecurity: ss, location: loc, profile } = state;
  const setSS = (k, v) => setState((s) => ({ ...s, socialSecurity: { ...s.socialSecurity, [k]: v } }));
  const setLoc = (k, v) => setState((s) => ({ ...s, location: { ...s.location, [k]: v } }));

  const claim = useMemo(
    () =>
      optimizeClaim({
        monthlyAtFra: ss.monthlyAtFra,
        fra: ss.fra,
        colaRate: ss.colaRate,
        lifeExpectancy: Math.max(num(profile.endAge, 90), 71),
      }),
    [ss.monthlyAtFra, ss.fra, ss.colaRate, profile.endAge]
  );

  const tax = useMemo(
    () =>
      exitTaxEstimate({
        fromCode: loc.fromState,
        toCode: loc.toState,
        taxableIncome: num(loc.taxableIncome),
        unrealizedGains: num(loc.unrealizedGains),
        horizonYears: num(loc.horizonYears, 30),
      }),
    [loc.fromState, loc.toState, loc.taxableIncome, loc.unrealizedGains, loc.horizonYears]
  );

  return (
    <div className="stack">
      <Section
        title="Social Security claim-age optimizer"
        subtitle="When should you claim? Claiming later means bigger checks but fewer years of them. Optimum maximizes lifetime payout to your planning age."
      >
        <div className="grid">
          <NumberField label="Est. monthly benefit at FRA (67)" value={ss.monthlyAtFra} onChange={(v) => setSS("monthlyAtFra", v)} prefix="$" step={50} />
          <NumberField label="Annual COLA" value={Math.round(num(ss.colaRate) * 100)} onChange={(v) => setSS("colaRate", v / 100)} suffix="%" step={0.5} />
        </div>

        {num(ss.monthlyAtFra) > 0 ? (
          <>
            <div className="stats stats--3" style={{ margin: "8px 0 14px" }}>
              <Stat label="Best claim age" value={`${claim.bestAge}`} hint="Maximizes lifetime payout" accent />
              <Stat label="Lifetime at best age" value={formatCurrency(claim.bestLifetime)} />
              <Stat
                label="Monthly at best age"
                value={formatCurrency(claim.rows.find((r) => r.claimAge === claim.bestAge)?.monthly || 0)}
              />
            </div>
            <div className="chart">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={claim.rows} margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#26313f" />
                  <XAxis dataKey="claimAge" stroke="#7d8da3" tickMargin={8} />
                  <YAxis stroke="#7d8da3" width={64} tickFormatter={formatCompact} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(v)} labelFormatter={(a) => `Claim at ${a}`} />
                  <Bar dataKey="lifetime" radius={[6, 6, 0, 0]}>
                    {claim.rows.map((r) => (
                      <Cell key={r.claimAge} fill={r.claimAge === claim.bestAge ? "#f97316" : "#3b82f6"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="legend">
                <span><i style={{ background: "#f97316" }} /> Optimal age</span>
                <span><i style={{ background: "#3b82f6" }} /> Lifetime payout by claim age</span>
              </div>
            </div>
          </>
        ) : (
          <p className="note">Enter your estimated monthly benefit (from ssa.gov/myaccount) to see the optimizer.</p>
        )}
      </Section>

      <Section
        title="State tax escape"
        subtitle="Estimate the savings from relocating to a lower-tax state — including a one-time tax on gains realized before you move."
      >
        <div className="grid">
          <SelectField label="Current state" value={loc.fromState} onChange={(v) => setLoc("fromState", v)} options={stateOptions} />
          <SelectField label="Move to" value={loc.toState} onChange={(v) => setLoc("toState", v)} options={stateOptions} />
          <NumberField label="Taxable income" value={loc.taxableIncome} onChange={(v) => setLoc("taxableIncome", v)} prefix="$" step={1000} />
          <NumberField label="Unrealized gains" value={loc.unrealizedGains} onChange={(v) => setLoc("unrealizedGains", v)} prefix="$" step={1000} />
        </div>
        <div className="stats stats--3" style={{ marginTop: 8 }}>
          <Stat
            label={`${num(loc.horizonYears, 30)}-yr net savings`}
            value={formatCurrency(tax.lifetimeSavings)}
            hint={tax.lifetimeSavings >= 0 ? "In your favor" : "Costs more"}
            accent
          />
          <Stat label="Annual income-tax savings" value={formatCurrency(tax.annualIncomeTaxSavings)} hint={`${tax.from.name} → ${tax.to.name}`} />
          <Stat label="One-time exit tax" value={formatCurrency(tax.oneTimeExitTax)} hint="On gains realized before moving" />
        </div>
        <p className="note">Simplified top-of-scale estimates — not tax advice. Consult a CPA before relocating.</p>
      </Section>
    </div>
  );
}
