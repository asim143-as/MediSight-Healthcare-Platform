"use client"

import { useMemo } from "react"
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

export interface ShapFeature {
  feature: string
  value: string | number
  impact: number
}

interface ShapWaterfallChartProps {
  data: ShapFeature[]
}

export function ShapWaterfallChart({ data }: ShapWaterfallChartProps) {
  const chartData = useMemo(() => {
    // Sort by absolute impact (largest impact first)
    return [...data]
      .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
      .slice(0, 10) // Show top 10 features
      .map(item => ({
        ...item,
        label: `${item.feature} (${item.value})`,
        positive: item.impact > 0 ? item.impact : 0,
        negative: item.impact < 0 ? item.impact : 0,
      }))
  }, [data])

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
          <XAxis type="number" hide />
          <YAxis 
            dataKey="label" 
            type="category" 
            width={150} 
            tick={{ fontSize: 12 }} 
            axisLine={false} 
            tickLine={false}
          />
          <Tooltip 
            formatter={(value: number, name: string, props: any) => {
              const impact = props.payload.impact
              return [
                `${impact > 0 ? '+' : ''}${impact.toFixed(3)}`, 
                'Impact on Risk'
              ]
            }}
            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
          />
          <Bar dataKey="impact" radius={[4, 4, 4, 4]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.impact > 0 ? '#ef4444' : '#22c55e'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-6 mt-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>Increases Risk</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Decreases Risk</span>
        </div>
      </div>
    </div>
  )
}
