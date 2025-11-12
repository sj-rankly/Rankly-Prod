import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Competitor } from '@/types/dashboard'
import { cn } from '@/lib/utils'

interface RankingTableProps {
  competitors: Competitor[]
  scoreType: 'visibility' | 'share' | 'position'
  limit?: number
}

export function RankingTable({ competitors, scoreType, limit = 5 }: RankingTableProps) {
  const displayedCompetitors = limit ? competitors.slice(0, limit) : competitors

  const getScoreDisplay = (competitor: Competitor) => {
    switch (scoreType) {
      case 'visibility':
        return `${competitor.score}%`
      case 'share':
        return `${competitor.score}%`
      case 'position':
        return `#${competitor.score}`
      default:
        return `${competitor.score}%`
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-3 h-3 text-green-500" />
      case 'down':
        return <TrendingDown className="w-3 h-3 text-red-500" />
      case 'stable':
        return <Minus className="w-3 h-3 text-gray-500" />
      default:
        return null
    }
  }

  return (
    <div className="rounded-lg border border-border/50 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/50">
            <TableHead className="text-sm font-semibold py-4 w-16 text-muted-foreground">Rank</TableHead>
            <TableHead className="text-sm font-semibold py-4 text-muted-foreground">Brand</TableHead>
            <TableHead className="text-sm font-semibold text-right py-4 w-24 text-muted-foreground">Score</TableHead>
            <TableHead className="text-sm font-semibold text-center py-4 w-24 text-muted-foreground">Trend</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayedCompetitors.map((competitor) => (
            <TableRow key={competitor.id} className="hover:bg-muted/20 transition-colors">
              <TableCell className="py-4">
                <Badge 
                  variant={competitor.rank === 1 ? "default" : "secondary"}
                  className="w-7 h-7 rounded-full p-0 flex items-center justify-center text-sm font-medium"
                >
                  {competitor.rank}
                </Badge>
              </TableCell>
              <TableCell className="py-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2",
                    competitor.name === 'Fibr' 
                      ? "bg-primary text-primary-foreground border-primary" 
                      : "bg-muted border-muted-foreground/20"
                  )}>
                    {competitor.name.charAt(0)}
                  </div>
                  <span className={cn(
                    "font-medium text-sm truncate max-w-[100px]",
                    competitor.name === 'Fibr' && "text-primary font-semibold"
                  )}>
                    {competitor.name}
                  </span>
                  {competitor.name === 'Fibr' && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                      You
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-sm text-right font-semibold py-4">
                {getScoreDisplay(competitor)}
              </TableCell>
              <TableCell className="text-center py-4">
                <div className="flex items-center justify-center">
                  <div className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold",
                    competitor.trend === 'up' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                    competitor.trend === 'down' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                    competitor.trend === 'stable' && "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  )}>
                    {getTrendIcon(competitor.trend)}
                    <span>
                      {competitor.change > 0 ? '+' : ''}{competitor.change}%
                    </span>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
