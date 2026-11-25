"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const tooltipStyle = {
  backgroundColor: "var(--tooltip-bg, #18181b)",
  border: "none",
  borderRadius: 10,
  color: "#fafafa",
  fontSize: 12,
};

export function WeeklyTrendChart({ data }: { data: { label: string; pct: number | null }[] }) {
  if (data.every((d) => d.pct === null)) {
    return <p className="muted py-8 text-center text-sm">Aún no hay datos suficientes.</p>;
  }
  return (
    <div className="h-56 w-full" role="img" aria-label="Tendencia semanal del porcentaje de cumplimiento">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "currentColor" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={16} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "currentColor" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={{ color: "#a1a1aa" }}
            formatter={(v) => [`${v}%`, "Cumplimiento"]}
            labelFormatter={(l) => `Semana del ${l}`}
          />
          <Line
            type="monotone"
            dataKey="pct"
            stroke="#10b981"
            strokeWidth={2.5}
            dot={{ r: 2.5, fill: "#10b981" }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WeekdayChart({
  data,
}: {
  data: { label: string; pct: number | null; highlight: "best" | "worst" | null }[];
}) {
  if (data.every((d) => d.pct === null)) {
    return <p className="muted py-8 text-center text-sm">Aún no hay datos suficientes.</p>;
  }
  return (
    <div className="h-48 w-full" role="img" aria-label="Porcentaje de cumplimiento por día de la semana">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "currentColor" }} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "currentColor" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "currentColor", fillOpacity: 0.05 }} formatter={(v) => [`${v}%`, "Cumplimiento"]} />
          <Bar dataKey="pct" radius={[6, 6, 0, 0]}>
            {data.map((d) => (
              <Cell
                key={d.label}
                fill={d.highlight === "best" ? "#059669" : d.highlight === "worst" ? "#f43f5e" : "#a1a1aa"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
