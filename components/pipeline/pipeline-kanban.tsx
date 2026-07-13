'use client'

import { useState, useMemo, ReactNode } from 'react'
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
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoveRight } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { cn, formatCurrency } from '@/lib/utils'
import { DataErrorBoundary } from '@/components/error-boundaries'
import { LocationFilter, type LocationFilterValue } from '@/components/locations/location-filter'
import { PipelineFilters, EMPTY_PIPELINE_FILTERS, type PipelineFilterState } from '@/components/pipeline/pipeline-filters'
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
  const [locationFilter, setLocationFilter] = useState<LocationFilterValue>('all')
  const [pipelineFilters, setPipelineFilters] = useState<PipelineFilterState>(EMPTY_PIPELINE_FILTERS)

  const visibleOpportunities = useMemo(() => {
    let result = opportunities

    if (locationFilter === 'unassigned') {
      result = result.filter((o) => !o.location_id)
    } else if (locationFilter !== 'all') {
      result = result.filter((o) => o.location_id === locationFilter)
    }

    if (pipelineFilters.ownerId !== 'all') {
      result = result.filter((o) => o.owner_id === pipelineFilters.ownerId)
    }
    if (pipelineFilters.dateFrom) {
      result = result.filter((o) => o.created_at >= pipelineFilters.dateFrom)
    }
    if (pipelineFilters.dateTo) {
      // created_at is a timestamp; include the whole end day by comparing
      // against the date portion only.
      result = result.filter((o) => o.created_at.slice(0, 10) <= pipelineFilters.dateTo)
    }

    return result
  }, [opportunities, locationFilter, pipelineFilters])

  const visibleStages = useMemo(() => {
    if (pipelineFilters.stageIds.size === 0) return stages
    return stages.filter((s) => pipelineFilters.stageIds.has(s.id))
  }, [stages, pipelineFilters.stageIds])

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

    await moveOpportunity(oppId, newStageId)
  }

  // Shared move logic for both drag-and-drop and the keyboard "Move to…" menu.
  async function moveOpportunity(oppId: string, newStageId: string) {
    const opp = opportunities.find(o => o.id === oppId)
    if (!opp || opp.stage_id === newStageId) return

    // Snapshot the CURRENT state (not the mount-time `initial`) so a failed move
    // rolls back only this change and preserves earlier successful moves.
    const snapshot = opportunities
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
    } catch {
      setOpportunities(snapshot)
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
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <PipelineFilters stages={stages} value={pipelineFilters} onChange={setPipelineFilters} />
        <LocationFilter value={locationFilter} onChange={setLocationFilter} />
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {visibleStages.map(stage => {
          const stageOpps = visibleOpportunities.filter(o => o.stage_id === stage.id)
          const totalValue = stageOpps.reduce((sum, o) => sum + (o.estimated_value || 0), 0)

          return (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              opportunities={stageOpps}
              totalValue={totalValue}
              stages={stages}
              onMove={moveOpportunity}
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
  stages: PipelineStage[]
  onMove: (oppId: string, stageId: string) => void
}

function KanbanColumn({ stage, opportunities, totalValue, stages, onMove }: KanbanColumnProps) {
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
          <OpportunityCard key={opp.id} opportunity={opp} stages={stages} onMove={onMove} />
        ))}
      </div>
    </div>
  )
}

interface OpportunityCardProps {
  opportunity: Opportunity
  isDragging?: boolean
  stages?: PipelineStage[]
  onMove?: (oppId: string, stageId: string) => void
}

function OpportunityCard({ opportunity, isDragging, stages, onMove }: OpportunityCardProps) {
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
        <div className="flex items-start justify-between gap-2">
          <Link href={`/crm/opportunities/${opportunity.id}`} className="block min-w-0 flex-1">
            <p className="font-medium text-sm truncate hover:text-primary">
              {opportunity.name}
            </p>
          </Link>
          {/* Keyboard/pointer-accessible alternative to drag-and-drop. The
              stopPropagation keeps the drag sensor from hijacking the click. */}
          {stages && onMove && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0 -mr-1 -mt-1"
                  aria-label={`Move ${opportunity.name} to another stage`}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <MoveRight className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onPointerDown={(e) => e.stopPropagation()}>
                <DropdownMenuLabel>Move to</DropdownMenuLabel>
                {stages
                  .filter((s) => s.id !== opportunity.stage_id)
                  .map((s) => (
                    <DropdownMenuItem key={s.id} onSelect={() => onMove(opportunity.id, s.id)}>
                      {s.name}
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {customerName}
        </p>
        {/* Hazard chips help triage at a glance — an asbestos abatement
            in negotiation reads very differently from a mold remediation
            stuck in proposal. */}
        {Array.isArray(opportunity.hazard_types) && opportunity.hazard_types.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {opportunity.hazard_types.map((h) => (
              <Badge key={h} variant="secondary" className="text-xs capitalize">
                {h}
              </Badge>
            ))}
          </div>
        )}
        {opportunity.estimated_value ? (
          <p className="text-sm font-medium mt-2">
            {formatCurrency(opportunity.estimated_value, false)}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground italic mt-2">No estimate yet</p>
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
