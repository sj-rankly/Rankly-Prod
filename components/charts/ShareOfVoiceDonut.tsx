import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { ChartDataPoint } from '@/types/dashboard'
import { useState } from 'react'

interface ShareOfVoiceDonutProps {
  data: ChartDataPoint[]
}

const COLORS = [
  '#3B82F6', // Blue
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#10B981', // Green
  '#8B5CF6'  // Purple
]

export function ShareOfVoiceDonut({ data }: ShareOfVoiceDonutProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart margin={{ top: 5, right: 5, left: 5, bottom: 15 }}>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={30}
          outerRadius={45}
          paddingAngle={2}
          dataKey="value"
          strokeWidth={2}
          stroke="hsl(var(--background))"
          onMouseEnter={(data, index) => {
            setActiveIndex(index)
          }}
          onMouseLeave={() => {
            setActiveIndex(-1)
          }}
        >
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={COLORS[index % COLORS.length]}
              stroke={activeIndex === index ? '#fff' : 'none'}
              strokeWidth={activeIndex === index ? 2 : 0}
              style={{
                filter: activeIndex === index ? 'brightness(1.1)' : 'none'
              }}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px',
            color: 'hsl(var(--foreground))',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
          }}
        />
        <Legend 
          wrapperStyle={{ fontSize: '9px', color: 'hsl(var(--muted-foreground))' }}
          iconType="circle"
          iconSize={6}
          layout="horizontal"
          verticalAlign="bottom"
          height={15}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
