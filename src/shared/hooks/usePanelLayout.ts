import { useState, useCallback, useEffect } from 'react'

const STORAGE_PREFIX = 'rentaloc_panel_'

export interface PanelLayoutState {
  order: string[]
  collapsed: Record<string, boolean>
}

export function usePanelLayout(
  panelId: string,
  defaultOrder: string[],
): {
  order: string[]
  collapsed: Record<string, boolean>
  moveSection: (fromIndex: number, toIndex: number) => void
  toggleCollapsed: (sectionId: string) => void
  setCollapsed: (sectionId: string, collapsed: boolean) => void
} {
  const storageKey = `${STORAGE_PREFIX}${panelId}`

  const [state, setState] = useState<PanelLayoutState>(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored) as PanelLayoutState
        const validOrder = defaultOrder.filter((id) =>
          parsed.order?.includes(id),
        )
        const extraIds = defaultOrder.filter((id) => !parsed.order?.includes(id))
        return {
          order: [...validOrder, ...extraIds],
          collapsed: parsed.collapsed ?? {},
        }
      }
    } catch {
      // ignore
    }
    return {
      order: [...defaultOrder],
      collapsed: {},
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state))
    } catch {
      // ignore
    }
  }, [storageKey, state])

  const moveSection = useCallback((fromIndex: number, toIndex: number) => {
    setState((prev) => {
      const newOrder = [...prev.order]
      const [removed] = newOrder.splice(fromIndex, 1)
      newOrder.splice(toIndex, 0, removed)
      return { ...prev, order: newOrder }
    })
  }, [])

  const toggleCollapsed = useCallback((sectionId: string) => {
    setState((prev) => ({
      ...prev,
      collapsed: {
        ...prev.collapsed,
        [sectionId]: !prev.collapsed[sectionId],
      },
    }))
  }, [])

  const setCollapsed = useCallback((sectionId: string, collapsed: boolean) => {
    setState((prev) => ({
      ...prev,
      collapsed: {
        ...prev.collapsed,
        [sectionId]: collapsed,
      },
    }))
  }, [])

  return {
    order: state.order,
    collapsed: state.collapsed,
    moveSection,
    toggleCollapsed,
    setCollapsed,
  }
}
