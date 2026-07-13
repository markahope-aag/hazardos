import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TrendingUp, TrendingDown, Target } from 'lucide-react'
import type { EstimatorAccuracyRow, EstimatorTendency } from '@/lib/utils/estimator-accuracy'

interface EstimatorAccuracyTableProps {
  rows: EstimatorAccuracyRow[]
}

const TENDENCY_CONFIG: Record<
  EstimatorTendency,
  { label: string; className: string; icon: typeof Target }
> = {
  underestimates: {
    label: 'Tends to under-estimate',
    className: 'bg-amber-100 text-amber-800',
    icon: TrendingUp,
  },
  overestimates: {
    label: 'Tends to over-estimate',
    className: 'bg-blue-100 text-blue-800',
    icon: TrendingDown,
  },
  accurate: {
    label: 'On target',
    className: 'bg-green-100 text-green-800',
    icon: Target,
  },
}

function TendencyBadge({ tendency }: { tendency: EstimatorTendency }) {
  const config = TENDENCY_CONFIG[tendency]
  const Icon = config.icon
  return (
    <Badge className={config.className}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  )
}

/**
 * PA9 accuracy table. Each row is an estimator's average estimate accuracy
 * across their completed jobs, plus their directional bias (the "pattern").
 */
export function EstimatorAccuracyTable({ rows }: EstimatorAccuracyTableProps) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        No completed jobs with approved actuals yet. Accuracy appears once jobs are
        completed and their variances reviewed.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Estimator</TableHead>
          <TableHead className="text-right">Jobs</TableHead>
          <TableHead className="text-right">Avg accuracy</TableHead>
          <TableHead className="text-right">Avg variance</TableHead>
          <TableHead>Pattern</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.estimator_id}>
            <TableCell className="font-medium">{row.estimator_name}</TableCell>
            <TableCell className="text-right">{row.jobs_count}</TableCell>
            <TableCell className="text-right font-semibold">
              {row.avg_accuracy_pct.toFixed(1)}%
            </TableCell>
            <TableCell className="text-right">
              {row.avg_variance_pct > 0 ? '+' : ''}
              {row.avg_variance_pct.toFixed(1)}%
            </TableCell>
            <TableCell>
              <TendencyBadge tendency={row.tendency} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
