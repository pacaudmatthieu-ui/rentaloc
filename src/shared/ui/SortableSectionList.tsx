import { useCallback, useState } from 'react'
import { CollapsibleSection } from './CollapsibleSection'

export interface SortableSection {
  id: string
  title: string
  description?: string
  content: React.ReactNode
  className?: string
}

interface SortableSectionListProps {
  sections: SortableSection[]
  order: string[]
  collapsed: Record<string, boolean>
  onMove: (fromIndex: number, toIndex: number) => void
  onCollapsedChange: (sectionId: string, collapsed: boolean) => void
  /** Nombre de colonnes par ligne. Ex: [2, 3, 1, 1] = 2 cols, 3 cols, 1 col, 1 col */
  gridLayout?: readonly number[]
}

export function SortableSectionList({
  sections,
  order,
  collapsed,
  onMove,
  onCollapsedChange,
  gridLayout,
}: SortableSectionListProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const orderedSections = order
    .map((id) => sections.find((s) => s.id === id))
    .filter((s): s is SortableSection => s != null)

  const rows: SortableSection[][] = gridLayout
    ? (() => {
        const result: SortableSection[][] = []
        let idx = 0
        for (const cols of gridLayout) {
          result.push(orderedSections.slice(idx, idx + cols))
          idx += cols
        }
        if (idx < orderedSections.length) {
          result.push(orderedSections.slice(idx))
        }
        return result
      })()
    : orderedSections.map((s) => [s])

  const handleDragStart = useCallback((sectionId: string) => {
    return (e: React.DragEvent) => {
      setDraggedId(sectionId)
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', sectionId)
    }
  }, [])

  const handleDragOver = useCallback(
    (e: React.DragEvent, sectionId: string) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      if (draggedId && draggedId !== sectionId) {
        setDragOverId(sectionId)
      }
    },
    [draggedId],
  )

  const handleDragLeave = useCallback(() => {
    setDragOverId(null)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent, targetSectionId: string) => {
      e.preventDefault()
      setDragOverId(null)
      setDraggedId(null)
      if (!draggedId || draggedId === targetSectionId) return
      const fromIndex = order.indexOf(draggedId)
      const toIndex = order.indexOf(targetSectionId)
      if (fromIndex >= 0 && toIndex >= 0) {
        onMove(fromIndex, toIndex)
      }
    },
    [draggedId, order, onMove],
  )

  const handleDragEnd = useCallback(() => {
    setDraggedId(null)
    setDragOverId(null)
  }, [])

  return (
    <div className="sortable-section-list">
      {rows.map((rowSections, rowIdx) => (
        <div
          key={rowIdx}
          className="sortable-section-row"
          style={
            gridLayout
              ? {
                  gridTemplateColumns: `repeat(${rowSections.length}, minmax(0, 1fr))`,
                }
              : undefined
          }
        >
          {rowSections.map((section) => (
            <div
              key={section.id}
              className={`sortable-section-item ${draggedId === section.id ? 'dragging' : ''} ${dragOverId === section.id ? 'drag-over' : ''}`}
              onDragOver={(e) => handleDragOver(e, section.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, section.id)}
            >
              <CollapsibleSection
                id={section.id}
                title={section.title}
                description={section.description}
                collapsed={collapsed[section.id]}
                onCollapsedChange={(c) => onCollapsedChange(section.id, c)}
                onDragStart={handleDragStart(section.id)}
                onDragEnd={handleDragEnd}
                className={section.className}
              >
                {section.content}
              </CollapsibleSection>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
