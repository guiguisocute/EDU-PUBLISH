import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

interface StatRow {
  name: string;
  count: number;
  fullTitle: string;
}

interface StatsChartProps {
  title: string;
  rows: StatRow[];
}

// 使用 shadcn/ui 风格的配色方案
const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--primary) / 0.8)',
  'hsl(var(--primary) / 0.6)',
  'hsl(var(--primary) / 0.4)',
  'hsl(var(--primary) / 0.2)',
];

export const StatsChart: React.FC<StatsChartProps> = React.memo(({ title, rows }) => {
  const data = useMemo(() => rows.map((row) => ({
    name: row.name.length > 18 ? row.name.substring(0, 18) + '...' : row.name,
    count: row.count,
    fullTitle: row.fullTitle,
  })), [rows]);

  const chartMetrics = useMemo(() => {
    const maxCount = data.reduce((max, item) => Math.max(max, item.count), 0);
    const roughStep = Math.max(1, Math.ceil(maxCount / 5));
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
    const normalized = roughStep / magnitude;

    const niceUnit = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
    const tickStep = niceUnit * magnitude;
    const maxTick = Math.max(tickStep, Math.ceil(maxCount / tickStep) * tickStep);

    const ticks: number[] = [];
    for (let value = 0; value <= maxTick; value += tickStep) {
      ticks.push(value);
    }

    return {
      ticks,
      maxTick,
      chartHeight: Math.max(240, data.length * 48),
    };
  }, [data]);

  if (data.length === 0) return null;

  return (
    <Card className="flex flex-col overflow-hidden border-none shadow-none bg-transparent">
      <CardHeader className="p-0 pb-4 space-y-0 flex flex-row items-center gap-2">
        <BarChart3 className="w-4 h-4 text-primary" />
        <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 w-full">
        <ResponsiveContainer width="100%" height={chartMetrics.chartHeight}>
          <BarChart data={data} layout="vertical" margin={{ top: 6, right: 12, left: 12, bottom: 6 }}>
            <CartesianGrid
              strokeDasharray="3 4"
              horizontal={false}
              stroke="hsl(var(--border))"
              opacity={0.9}
            />
            <XAxis 
              type="number"
              domain={[0, chartMetrics.maxTick]}
              ticks={chartMetrics.ticks}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              type="category"
              dataKey="name"
                width={180}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }}
            />
            <Tooltip 
              cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
              contentStyle={{ 
                borderRadius: 'var(--radius)', 
                border: '1px solid hsl(var(--border))', 
                boxShadow: 'var(--shadow-md)',
                backgroundColor: 'hsl(var(--popover))',
                color: 'hsl(var(--popover-foreground))',
                padding: '12px',
                fontSize: '12px'
              }}
              labelStyle={{ fontWeight: 700, marginBottom: '4px' }}
              itemStyle={{ color: 'hsl(var(--primary))', fontWeight: 600 }}
              formatter={(value) => [`${value} 条`, '通知数']}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.fullTitle || ''}
            />
            <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={22}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});
