import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'
import { ChartDataPoint } from '@/types/dashboard'

interface VisibilityBarChartProps {
  data: ChartDataPoint[]
}

export function VisibilityBarChart({ data }: VisibilityBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="hsl(var(--muted))" opacity={0.3} />
        <XAxis 
          dataKey="name" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          tickCount={5}
        />
        <YAxis hide />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px',
            color: 'hsl(var(--foreground))',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
          }}
          cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }}
        />
        <Bar 
          dataKey="value" 
          fill="#3B82F6" 
          radius={[6, 6, 0, 0]}
          maxBarSize={40}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
