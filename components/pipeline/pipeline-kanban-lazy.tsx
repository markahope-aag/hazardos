'use client'

import dynamic from 'next/dynamic'
import { Card, CardContent } from '@/components/ui/card'
import type { PipelineStage, Opportunity } from '@/types/sales'

// Lazy load PipelineKanban (contains @dnd-kit/core ~50KB)
const PipelineKanban = dynamic(
  () => import('@/components/pipeline/pipeline-kanban').then(mod => ({ default: mod.PipelineKanban })),
  {
    ssr: false,
    loading: () => (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex-shrink-0 w-72 rounded-lg p-3 bg-muted/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-muted animate-pulse" />
              <div className="h-5 w-24 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-4 w-16 bg-muted rounded animate-pulse mb-3" />
            <div className="space-y-2 min-h-[200px]">
              {[1, 2].map(j => (
                <Card key={j}>
                  <CardContent className="p-3">
                    <div className="h-4 w-full bg-muted rounded animate-pulse mb-2" />
                    <div className="h-3 w-3/4 bg-muted rounded animate-pulse" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    ),
  }
)

interface PipelineKanbanLazyProps {
  stages: PipelineStage[]
  opportunities: Opportunity[]
}

export function PipelineKanbanLazy({ stages, opportunities }: PipelineKanbanLazyProps) {
  return <PipelineKanban stages={stages} opportunities={opportunities} />
}
