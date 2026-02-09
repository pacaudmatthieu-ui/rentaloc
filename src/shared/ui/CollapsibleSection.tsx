import { useState } from 'react'

interface CollapsibleSectionProps {
  id: string
  title: string
  description?: string
  children: React.ReactNode
  defaultCollapsed?: boolean
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: () => void
  className?: string
}

export function CollapsibleSection({
  id,
  title,
  description,
  children,
  defaultCollapsed = false,
  collapsed: controlledCollapsed,
  onCollapsedChange,
  onDragStart,
  onDragEnd,
  className = '',
}: CollapsibleSectionProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed)
  const isControlled = controlledCollapsed !== undefined
  const collapsed = isControlled ? controlledCollapsed : internalCollapsed

  const toggle = () => {
    const next = !collapsed
    if (!isControlled) setInternalCollapsed(next)
    onCollapsedChange?.(next)
  }

  return (
    <div className={`collapsible-section ${className}`} data-section-id={id}>
      <div className="collapsible-section-header">
        <button
          type="button"
          className="collapsible-section-arrow"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Développer' : 'Replier'}
        >
          <span className={`collapsible-arrow ${collapsed ? 'collapsed' : ''}`}>
            ▶
          </span>
        </button>
        {onDragStart && (
          <div
            className="collapsible-section-drag-handle"
            title="Glisser pour réorganiser"
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          >
            ⋮⋮
          </div>
        )}
        <div
          className="collapsible-section-title-wrap"
          onClick={toggle}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              toggle()
            }
          }}
        >
          <h2 className="collapsible-section-title">{title}</h2>
          {description && (
            <p className="collapsible-section-description">{description}</p>
          )}
        </div>
      </div>
      {!collapsed && <div className="collapsible-section-body">{children}</div>}
    </div>
  )
}
