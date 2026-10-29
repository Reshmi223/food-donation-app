"use client";

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  Legend, PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = [
  "oklch(0.4692 0.0994 158.43)",
  "oklch(0.5685 0.1187 154.95)",
  "oklch(0.7346 0.0739 160.9)",
  "oklch(0.83 0.09 90)",
  "oklch(0.62 0.09 45)",
  "oklch(0.55 0.08 250)",
  "oklch(0.68 0.1 330)",
  "oklch(0.75 0.09 200)",
  "oklch(0.6 0.07 130)",
];

export function TrendBarChart({ data, keys, title, description }: {
  data: Array<Record<string, string | number>>;
  keys: { key: string; label: string; color?: string }[];
  title: string;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 155)" />
            <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="oklch(0.55 0.02 155)" />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="oklch(0.55 0.02 155)" />
            <ReTooltip cursor={{ fill: "oklch(0.55 0.02 155 / 0.08)" }} contentStyle={{ borderRadius: 10, fontSize: 12, border: "1px solid oklch(0.9 0.01 155)" }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {keys.map((k, i) => (
              <Bar key={k.key} dataKey={k.key} name={k.label} fill={k.color ?? COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} maxBarSize={36} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function CategoryPieChart({ data, title, description, nameKey = "category" }: {
  data: Array<Record<string, string | number>>;
  title: string;
  description?: string;
  nameKey?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="count" nameKey={nameKey} innerRadius={45} outerRadius={80} paddingAngle={2}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <ReTooltip contentStyle={{ borderRadius: 10, fontSize: 12, border: "1px solid oklch(0.9 0.01 155)" }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function TrendLineChart({ data, keys, title, description }: {
  data: Array<Record<string, string | number>>;
  keys: { key: string; label: string; color?: string }[];
  title: string;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 155)" />
            <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={2} stroke="oklch(0.55 0.02 155)" />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="oklch(0.55 0.02 155)" />
            <ReTooltip contentStyle={{ borderRadius: 10, fontSize: 12, border: "1px solid oklch(0.9 0.01 155)" }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {keys.map((k, i) => (
              <Line key={k.key} type="monotone" dataKey={k.key} name={k.label} stroke={k.color ?? COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function DistrictBarChart({ data, title, description }: {
  data: Array<{ district: string; count: number }>;
  title: string;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 155)" />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} stroke="oklch(0.55 0.02 155)" />
            <YAxis type="category" dataKey="district" width={90} tick={{ fontSize: 11 }} stroke="oklch(0.55 0.02 155)" />
            <ReTooltip cursor={{ fill: "oklch(0.55 0.02 155 / 0.08)" }} contentStyle={{ borderRadius: 10, fontSize: 12, border: "1px solid oklch(0.9 0.01 155)" }} />
            <Bar dataKey="count" name="Listings" fill={COLORS[0]} radius={[0, 4, 4, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
