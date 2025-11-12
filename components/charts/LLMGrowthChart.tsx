 "use client"

import { TrendingUp } from "lucide-react"

const platforms = [
  {
    name: "ChatGPT",
    favicon: "https://chat.openai.com/favicon.ico",
    color: "#10a37f",
    sessions: "22.7k",
    revenue: "$12.5k"
  },
  {
    name: "Perplexity", 
    favicon: "https://www.google.com/s2/favicons?domain=perplexity.ai&sz=32",
    color: "#8b5cf6",
    sessions: "15.2k",
    revenue: "$8.9k"
  },
  {
    name: "Gemini",
    favicon: "https://www.google.com/s2/favicons?domain=gemini.google.com&sz=32", 
    color: "#4285f4",
    sessions: "11.8k",
    revenue: "$6.1k"
  },
  {
    name: "Claude",
    favicon: "https://claude.ai/favicon.ico",
    color: "#ff6b35", 
    sessions: "8.4k",
    revenue: "$4.2k"
  },
  {
    name: "Copilot",
    favicon: "https://www.google.com/s2/favicons?domain=copilot.microsoft.com&sz=32",
    color: "#0078d4",
    sessions: "6.1k",
    revenue: "$2.7k"
  }
]

// Mock chart data for the line
const chartData = [
  { value: 22 },
  { value: 28 },
  { value: 25 },
  { value: 35 },
  { value: 42 },
  { value: 38 },
  { value: 48 },
  { value: 55 },
  { value: 50 },
  { value: 58 },
  { value: 65 },
  { value: 68 },
  { value: 64 },
  { value: 70 },
  { value: 75 },
  { value: 78 }
]

// Mock revenue chart data
const revenueData = [
  { value: 10 },
  { value: 15 },
  { value: 12 },
  { value: 18 },
  { value: 22 },
  { value: 20 },
  { value: 26 },
  { value: 30 },
  { value: 28 },
  { value: 32 },
  { value: 36 },
  { value: 34 },
  { value: 38 },
  { value: 40 },
  { value: 42 },
  { value: 44 }
]

export function LLMGrowthChart() {
  return (
    <div className="w-full h-full flex flex-col justify-between">
      <div className="space-y-3">
        {/* Top Icons Row */}
        <div className="flex justify-center space-x-1">
          {platforms.map((platform) => (
            <div key={platform.name} className="relative">
              <img 
                src={platform.favicon} 
                alt={platform.name}
                className="w-5 h-5"
              />
            </div>
          ))}
        </div>

        {/* Line Chart */}
        <div className="h-16 relative">
          <svg className="w-full h-full" viewBox="0 0 300 40">
            <defs>
              <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4"/>
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/>
              </linearGradient>
              <linearGradient id="revenueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.4"/>
                <stop offset="100%" stopColor="#10b981" stopOpacity="0"/>
              </linearGradient>
            </defs>
            
            {/* Sessions area fill */}
            <path
              d={`M 0,40 ${chartData.map((point, index) => 
                `L ${(index / (chartData.length - 1)) * 300},${40 - (point.value / 80) * 40}`
              ).join(' ')} L 300,40 Z`}
              fill="url(#chartGradient)"
            />
            
            {/* Revenue area fill */}
            <path
              d={`M 0,40 ${revenueData.map((point, index) => 
                `L ${(index / (revenueData.length - 1)) * 300},${40 - (point.value / 80) * 40}`
              ).join(' ')} L 300,40 Z`}
              fill="url(#revenueGradient)"
            />
            
            {/* Sessions line */}
            <path
              d={`M ${chartData.map((point, index) => 
                `${(index / (chartData.length - 1)) * 300},${40 - (point.value / 80) * 40}`
              ).join(' L ')}`}
              stroke="#3b82f6"
              strokeWidth="2"
              fill="none"
            />
            
            {/* Revenue line */}
            <path
              d={`M ${revenueData.map((point, index) => 
                `${(index / (revenueData.length - 1)) * 300},${40 - (point.value / 80) * 40}`
              ).join(' L ')}`}
              stroke="#10b981"
              strokeWidth="2"
              fill="none"
            />
            
            {/* Dollar symbol at the end of revenue line */}
            <text
              x="290"
              y="15"
              fontSize="12"
              fill="#10b981"
              fontWeight="bold"
              textAnchor="end"
            >
              $
            </text>
          </svg>
        </div>

        {/* Data Table */}
        <div className="space-y-1">
          <div className="grid grid-cols-12 gap-3 text-[13px] font-medium leading-[1.6] text-muted-foreground pb-2 border-b border-gray-200 dark:border-gray-700">
            <div className="col-span-6">Platform</div>
            <div className="col-span-3 text-right">Sessions</div>
            <div className="col-span-3 text-right">Revenue</div>
          </div>
          
          {platforms.map((platform, index) => (
            <div 
              key={platform.name}
              className={`grid grid-cols-12 gap-3 py-3 px-2 rounded-lg transition-colors ${
                index === 0 ? 'bg-blue-50/60 dark:bg-blue-900/20 border border-blue-200/30 dark:border-blue-800/30' : 'hover:bg-muted/40'
              }`}
            >
              <div className="col-span-6 flex items-center space-x-2">
                <img 
                  src={platform.favicon} 
                  alt={platform.name}
                  className="w-5 h-5 flex-shrink-0"
                />
                <span className="text-[14.5px] font-normal leading-[1.6] text-foreground/90 truncate">
                  {platform.name}
                </span>
              </div>
              
              <div className="col-span-3 text-[14.5px] font-normal leading-[1.5] tabular-nums text-foreground/90 text-right">
                {platform.sessions}
              </div>
              
              <div className="col-span-3 text-[14.5px] font-normal leading-[1.5] tabular-nums text-emerald-500/80 text-right">
                {platform.revenue}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
