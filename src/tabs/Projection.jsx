import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { monteCarlo, sequenceStressTest } from "../lib/montecarlo.js";
import { num } from "../lib/format.js";
import { formatCurrency, formatCompact } from "../lib/format.js";
import { Stat, Section, Button } from "../components/ui.jsx";

const tooltipStyle = {
  background: "#0f1722",
  border: "1px solid #26313f",
  borderRadius: 10,
  color: "#e6edf6",
};

export default function Projection({ state, derived }) {
  const [showMC, setShowMC] = useState(false);
  const { series, target, fireAge, annualReturn, volatility, startingBalance, annualContribution, streams } = derived;
  const currentAge = num(state.profile.currentAge);
  const years = Math.max(1, num(state.profile.endAge, 95) - currentAge);

  const mc = useMemo(() => {
    if (!showMC) return null;
    return monteCarlo({
      currentAge,
      startingBalance,
      annualContribution,
      meanReturn: annualReturn,
      volatility,
      target,
      streams,
      years,
      runs: 600,
    });
  }, [showMC, currentAge, startingBalance, annualContribution, annualReturn, volatility, target, streams, years]);

  const stress = useMemo(
    () =>
      sequenceStressTest({
        currentAge,
        startingBalance,
        annualContribution,
        annualReturn,
        target,
        streams,
      }),
    [currentAge, startingBalance, annualContribution, annualReturn, target, streams]
  );

  return (
    <div className="stack">
      <div className="stats stats--3">
        <Stat
          label="Years to FIRE"
          value={derived.reachedYear === null ? "—" : `${derived.reachedYear} yrs`}
          hint={fireAge ? `Around age ${fireAge}` : "Increase savings/contributions"}
          accent
        />
        <Stat label="FIRE number" value={formatCurrency(target)} hint={`${(derived.swr * 100).toFixed(1)}% SWR`} />
        <Stat
          label="Crash stress test"
          value={stress.delay === null ? "—" : stress.delay === 0 ? "No delay" : `+${stress.delay} yrs`}
          hint="A −20% market in years 1–3"
        />
      </div>

      <Section
        title="Projection"
        subtitle="Deterministic growth of your investable assets vs. your FIRE target."
        right={
          <Button variant={showMC ? "primary" : "ghost"} onClick={() => setShowMC((v) => !v)}>
            {showMC ? "Hide Monte Carlo" : "Run Monte Carlo"}
          </Button>
        }
      >
        <div className="chart">
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={series} margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#26313f" />
              <XAxis dataKey="age" stroke="#7d8da3" tickMargin={8} />
              <YAxis stroke="#7d8da3" width={64} tickFormatter={formatCompact} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(v)} labelFormatter={(a) => `Age ${a}`} />
              <ReferenceLine y={target} stroke="#f97316" strokeDasharray="4 4" label={{ value: "FIRE", fill: "#f97316", position: "insideTopRight" }} />
              <Line type="monotone" dataKey="balance" stroke="#fbbf24" strokeWidth={3} dot={false} name="Portfolio" />
              <Line type="monotone" dataKey="contributed" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="Contributed" />
            </LineChart>
          </ResponsiveContainer>
          <div className="legend">
            <span><i style={{ background: "#fbbf24" }} /> Portfolio value</span>
            <span><i style={{ background: "#3b82f6" }} /> Total contributed</span>
            <span><i style={{ background: "#f97316" }} /> FIRE target</span>
          </div>
        </div>
      </Section>

      {showMC && mc && (
        <Section
          title="Monte Carlo"
          subtitle={`${(mc.successProbability * 100).toFixed(0)}% of 600 simulated market paths reach your FIRE number within ${years} years.`}
        >
          <div className="stats stats--3" style={{ marginBottom: 14 }}>
            <Stat label="Success probability" value={`${(mc.successProbability * 100).toFixed(0)}%`} accent />
            <Stat label="Median (P50) end" value={formatCurrency(mc.bands[mc.bands.length - 1].p50)} />
            <Stat label="Pessimistic (P10) end" value={formatCurrency(mc.bands[mc.bands.length - 1].p10)} />
          </div>
          <div className="chart">
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={mc.bands} margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="band" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#26313f" />
                <XAxis dataKey="age" stroke="#7d8da3" tickMargin={8} />
                <YAxis stroke="#7d8da3" width={64} tickFormatter={formatCompact} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(v)} labelFormatter={(a) => `Age ${a}`} />
                <ReferenceLine y={target} stroke="#f97316" strokeDasharray="4 4" />
                <Area type="monotone" dataKey="p90" stroke="none" fill="url(#band)" name="P90" />
                <Line type="monotone" dataKey="p50" stroke="#fbbf24" strokeWidth={2.5} dot={false} name="Median" />
                <Line type="monotone" dataKey="p10" stroke="#ef4444" strokeWidth={1.5} dot={false} name="P10" />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="legend">
              <span><i style={{ background: "#fbbf24" }} /> Median outcome</span>
              <span><i style={{ background: "#ef4444" }} /> Pessimistic (P10)</span>
              <span><i style={{ background: "#f97316" }} /> FIRE target</span>
            </div>
          </div>
        </Section>
      )}
    </div>
  );
}
