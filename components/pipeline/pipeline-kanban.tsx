'use client'

import { useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { cn, formatCurrency } from '@/lib/utils'
import { DataErrorBoundary } from '@/components/error-boundaries'
import type { PipelineStage, Opportunity } from '@/types/sales'

/**
 * Error boundary wrapper for the Pipeline Kanban component
 */
export function PipelineKanbanErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <DataErrorBoundary
      dataLabel="pipeline"
      minHeight="400px"
      showCard={false}
    >
      {children}
    </DataErrorBoundary>
  );
}

interface PipelineKanbanProps {
  stages: PipelineStage[]
  opportunities: Opportunity[]
}

export function PipelineKanban({ stages, opportunities: initial }: PipelineKanbanProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [opportunities, setOpportunities] = useState(initial)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  const activeOpp = activeId ? opportunities.find(o => o.id === activeId) : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event

    if (!over) return

    const oppId = active.id as string
    const newStageId = over.id as string
    const opp = opportunities.find(o => o.id === oppId)

    if (!opp || opp.stage_id === newStageId) return

    // Optimistic update
    setOpportunities(prev =>
      prev.map(o => o.id === oppId ? { ...o, stage_id: newStageId } : o)
    )

    try {
      const response = await fetch(`/api/pipeline/${oppId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage_id: newStageId }),
      })

      if (!response.ok) throw new Error('Failed to move opportunity')

      toast({
        title: 'Opportunity moved',
        description: `${opp.name} has been updated`,
      })

      router.refresh()
    } catch (error) {
      // Revert on error
      setOpportunities(initial)
      toast({
        title: 'Error',
        description: 'Failed to move opportunity',
        variant: 'destructive',
      })
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map(stage => {
          const stageOpps = opportunities.filter(o => o.stage_id === stage.id)
          const totalValue = stageOpps.reduce((sum, o) => sum + (o.estimated_value || 0), 0)

          return (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              opportunities={stageOpps}
              totalValue={totalValue}
            />
          )
        })}
      </div>

      <DragOverlay>
        {activeOpp && <OpportunityCard opportunity={activeOpp} isDragging />}
      </DragOverlay>
    </DndContext>
  )
}

interface KanbanColumnProps {
  stage: PipelineStage
  opportunities: Opportunity[]
  totalValue: number
}

function KanbanColumn({ stage, opportunities, totalValue }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-shrink-0 w-72 rounded-lg p-3 transition-colors',
        isOver ? 'bg-primary/10' : 'bg-muted/50'
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: stage.color }}
          />
          <h3 className="font-medium">{stage.name}</h3>
          <Badge variant="secondary" className="text-xs">
            {opportunities.length}
          </Badge>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-3">
        {formatCurrency(totalValue, false)}
      </p>

      <div className="space-y-2 min-h-[200px]">
        {opportunities.map(opp => (
          <OpportunityCard key={opp.id} opportunity={opp} />
        ))}
      </div>
    </div>
  )
}

interface OpportunityCardProps {
  opportunity: Opportunity
  isDragging?: boolean
}

function OpportunityCard({ opportunity, isDragging }: OpportunityCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging: isCurrentlyDragging } = useDraggable({
    id: opportunity.id,
  })

  const style = transform
    ? {
        transform: `translate(${transform.x}px, ${transform.y}px)`,
      }
    : undefined

  const customerName = opportunity.customer?.company_name ||
    `${opportunity.customer?.first_name || ''} ${opportunity.customer?.last_name || ''}`.trim() ||
    'Unknown'

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'cursor-grab active:cursor-grabbing',
        (isDragging || isCurrentlyDragging) && 'opacity-50 rotate-2 shadow-lg'
      )}
    >
      <CardContent className="p-3">
        <Link href={`/pipeline/${opportunity.id}`} className="block">
          <p className="font-medium text-sm truncate hover:text-primary">
            {opportunity.name}
          </p>
        </Link>
        <p className="text-xs text-muted-foreground truncate">
          {customerName}
        </p>
        {opportunity.estimated_value && (
          <p className="text-sm font-medium mt-2">
            {formatCurrency(opportunity.estimated_value, false)}
          </p>
        )}
        {opportunity.expected_close_date && (
          <p className="text-xs text-muted-foreground mt-1">
            Close: {new Date(opportunity.expected_close_date).toLocaleDateString()}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
