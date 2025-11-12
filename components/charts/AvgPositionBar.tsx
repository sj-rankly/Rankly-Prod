import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'
import { ChartDataPoint } from '@/types/dashboard'

interface AvgPositionBarProps {
  data: ChartDataPoint[]
}

export function AvgPositionBar({ data }: AvgPositionBarProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
        <XAxis 
          dataKey="name" 
          axisLine={false} 
          tickLine={false} 
          style={{ fontSize: '10px' }}
          stroke="hsl(var(--muted-foreground))"
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
        <Bar dataKey="value" fill="#8B5CF6" radius={[6, 6, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  )
}
