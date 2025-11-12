import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { TopicRanking } from '@/types/dashboard'
import { cn } from '@/lib/utils'

interface TopicTableProps {
  topicRankings: TopicRanking[]
}

export function TopicTable({ topicRankings }: TopicTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-sm font-medium min-w-[200px] py-4">Topic</TableHead>
            {topicRankings[0]?.competitors.map((competitor) => (
              <TableHead key={competitor.id} className="text-sm font-medium text-center min-w-[120px] py-4">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                    {competitor.name.charAt(0)}
                  </div>
                  <span className="truncate">{competitor.name}</span>
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {topicRankings.map((topicRanking) => (
            <TableRow key={topicRanking.id} className="hover:bg-muted/30">
              <TableCell className="font-medium py-4 pr-4">
                <div className="max-w-[180px] truncate">
                  {topicRanking.topic}
                </div>
              </TableCell>
              {topicRanking.competitors.map((competitor) => (
                <TableCell key={competitor.id} className="text-center py-4">
                  <div className="flex flex-col items-center gap-2">
                    <Badge 
                      variant={competitor.rank === 1 ? "default" : "secondary"}
                      className="w-7 h-7 rounded-full p-0 flex items-center justify-center text-xs font-bold"
                    >
                      {competitor.rank}
                    </Badge>
                    <span className={cn(
                      "text-xs font-medium",
                      competitor.name === 'Fibr' && "text-primary"
                    )}>
                      {competitor.score}%
                    </span>
                  </div>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
