"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";

const RISK_COLORS: Record<string, string> = {
  LOW: "#16A34A",
  MEDIUM: "#CA8A04",
  HIGH: "#EA580C",
  CRITICAL: "#DC2626",
};

export function RiskTrendChart({
  data,
}: {
  data: { day: string; avgScore: number; count: number; highRiskCount: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4F6BFF" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#4F6BFF" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E3E8F0" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 11, fill: "#64748B" }}
          tickFormatter={(v) => new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          axisLine={false}
          tickLine={false}
        />
        <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} width={32} />
        <Tooltip
          labelFormatter={(v) => new Date(v as string).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E3E8F0" }}
        />
        <Area type="monotone" dataKey="avgScore" name="Avg risk score" stroke="#4F6BFF" fill="url(#scoreGradient)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function RiskDistributionChart({ data }: { data: { level: string; count: number }[] }) {
  const hasData = data.some((d) => d.count > 0);
  if (!hasData) return <div className="h-[220px] flex items-center justify-center text-sm text-canvas-muted">No data yet</div>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="count" nameKey="level" innerRadius={55} outerRadius={85} paddingAngle={2}>
          {data.map((entry) => (
            <Cell key={entry.level} fill={RISK_COLORS[entry.level] ?? "#94A3B8"} />
          ))}
        </Pie>
        <Legend
          formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
          iconType="circle"
          iconSize={8}
        />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E3E8F0" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function BreakdownBarChart({
  data,
  barLabel = "Avg score",
}: {
  data: { key: string; avgScore: number; count: number }[];
  barLabel?: string;
}) {
  if (!data.length) return <div className="h-[220px] flex items-center justify-center text-sm text-canvas-muted">No data yet</div>;
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E3E8F0" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="key"
          tick={{ fontSize: 11, fill: "#334155" }}
          width={130}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E3E8F0" }} />
        <Bar dataKey="avgScore" name={barLabel} fill="#4F6BFF" radius={[0, 4, 4, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TopFactorsChart({ data }: { data: { category: string; count: number }[] }) {
  const labels: Record<string, string> = {
    amount_anomaly: "Amount Anomaly",
    velocity_risk: "Velocity Risk",
    device_risk: "Device Risk",
    location_risk: "Location Risk",
    failed_attempt_risk: "Failed Attempts",
    account_risk: "Account Age",
    behavioral_anomaly: "Behavioral Pattern",
  };
  const chartData = data.map((d) => ({ key: labels[d.category] ?? d.category, count: d.count }));
  if (!chartData.length) return <div className="h-[220px] flex items-center justify-center text-sm text-canvas-muted">No data yet</div>;
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 34)}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E3E8F0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="key" tick={{ fontSize: 11, fill: "#334155" }} width={130} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E3E8F0" }} />
        <Bar dataKey="count" name="Times triggered" fill="#7C8FFF" radius={[0, 4, 4, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}
