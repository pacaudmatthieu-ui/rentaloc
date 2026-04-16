/**
 * localStorage utilities for simulation data persistence
 * Follows Architecture naming convention: rentaloc_{category}_{identifier}
 */

const STORAGE_KEYS = {
  RENTAL_SIMULATION: 'rentaloc_rental_simulation',
  PROPERTY_FLIPPING_SIMULATION: 'rentaloc_property_flipping_simulation',
  USER_LANGUAGE: 'rentaloc_user_language',
  COMPARISON_LIST: 'rentaloc_comparison_list',
  CURRENT_SIMULATION_COMPARISON_ID: 'rentaloc_current_simulation_comparison_id',
} as const

/**
 * Save rental simulation data to localStorage
 */
export function saveRentalSimulation(data: unknown): void {
  try {
    const serialized = JSON.stringify(data)
    localStorage.setItem(STORAGE_KEYS.RENTAL_SIMULATION, serialized)
  } catch (error) {
    console.error('Error saving rental simulation to localStorage:', error)
    // Silently fail - localStorage might be disabled or quota exceeded
  }
}

/**
 * Load rental simulation data from localStorage
 */
export function loadRentalSimulation<T>(): T | null {
  try {
    const serialized = localStorage.getItem(STORAGE_KEYS.RENTAL_SIMULATION)
    if (!serialized) {
      return null
    }
    return JSON.parse(serialized) as T
  } catch (error) {
    console.error('Error loading rental simulation from localStorage:', error)
    // Return null if data is corrupted or invalid
    return null
  }
}

/**
 * Save property flipping simulation data to localStorage
 */
export function savePropertyFlippingSimulation(data: unknown): void {
  try {
    const serialized = JSON.stringify(data)
    localStorage.setItem(STORAGE_KEYS.PROPERTY_FLIPPING_SIMULATION, serialized)
  } catch (error) {
    console.error('Error saving property flipping simulation to localStorage:', error)
    // Silently fail - localStorage might be disabled or quota exceeded
  }
}

/**
 * Load property flipping simulation data from localStorage
 */
export function loadPropertyFlippingSimulation<T>(): T | null {
  try {
    const serialized = localStorage.getItem(STORAGE_KEYS.PROPERTY_FLIPPING_SIMULATION)
    if (!serialized) {
      return null
    }
    const parsed = JSON.parse(serialized) as Record<string, unknown>
    // Migration: old format had renovationBudget, new format has travauxHT + separate charges
    if ('renovationBudget' in parsed && !('travauxHT' in parsed)) {
      parsed.travauxHT = parsed.renovationBudget
      delete parsed.renovationBudget
      parsed.notaryFeesOverride = parsed.notaryFeesOverride ?? ''
      parsed.huissierFees = parsed.huissierFees ?? ''
      parsed.geometreFees = parsed.geometreFees ?? ''
      parsed.architecteFees = parsed.architecteFees ?? ''
      parsed.terrainProportion = parsed.terrainProportion ?? ''
      // Migrate apartments: old resalePessimistic/Logic/Optimistic → resalePrice
      if (Array.isArray(parsed.apartments)) {
        parsed.apartments = (parsed.apartments as Record<string, unknown>[]).map((a) => ({
          ...a,
          resalePrice: a.resalePrice ?? a.resaleLogic ?? a.resalePessimistic ?? '',
          tvaRegime: a.tvaRegime ?? 'marge',
        }))
      }
      localStorage.setItem(STORAGE_KEYS.PROPERTY_FLIPPING_SIMULATION, JSON.stringify(parsed))
    }
    return parsed as T
  } catch (error) {
    console.error('Error loading property flipping simulation from localStorage:', error)
    return null
  }
}

/**
 * Save user language preference to localStorage
 */
export function saveUserLanguage(locale: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.USER_LANGUAGE, locale)
  } catch (error) {
    console.error('Error saving user language to localStorage:', error)
  }
}

/**
 * Load user language preference from localStorage
 */
export function loadUserLanguage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.USER_LANGUAGE)
  } catch (error) {
    console.error('Error loading user language from localStorage:', error)
    return null
  }
}

/**
 * Save comparison list metadata to localStorage
 */
export function saveComparisonList(comparisonIds: string[]): void {
  try {
    const serialized = JSON.stringify(comparisonIds)
    localStorage.setItem(STORAGE_KEYS.COMPARISON_LIST, serialized)
  } catch (error) {
    console.error('Error saving comparison list to localStorage:', error)
  }
}

/**
 * Load comparison list metadata from localStorage
 */
export function loadComparisonList(): string[] {
  try {
    const serialized = localStorage.getItem(STORAGE_KEYS.COMPARISON_LIST)
    if (!serialized) {
      return []
    }
    return JSON.parse(serialized) as string[]
  } catch (error) {
    console.error('Error loading comparison list from localStorage:', error)
    return []
  }
}

/**
 * Save a comparison simulation to localStorage
 */
export function saveComparisonSimulation(id: string, data: unknown): void {
  try {
    const serialized = JSON.stringify(data)
    localStorage.setItem(`rentaloc_comparison_${id}`, serialized)
  } catch (error) {
    console.error(`Error saving comparison simulation ${id} to localStorage:`, error)
  }
}

/**
 * Load a comparison simulation from localStorage
 */
export function loadComparisonSimulation<T>(id: string): T | null {
  try {
    const serialized = localStorage.getItem(`rentaloc_comparison_${id}`)
    if (!serialized) {
      return null
    }
    return JSON.parse(serialized) as T
  } catch (error) {
    console.error(`Error loading comparison simulation ${id} from localStorage:`, error)
    return null
  }
}

/**
 * Remove a comparison simulation from localStorage
 */
export function removeComparisonSimulation(id: string): void {
  try {
    localStorage.removeItem(`rentaloc_comparison_${id}`)
  } catch (error) {
    console.error(`Error removing comparison simulation ${id} from localStorage:`, error)
  }
}

/**
 * Save the comparison ID for the current simulation being edited
 */
export function saveCurrentSimulationComparisonId(id: string | null): void {
  try {
    if (id === null) {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_SIMULATION_COMPARISON_ID)
    } else {
      localStorage.setItem(STORAGE_KEYS.CURRENT_SIMULATION_COMPARISON_ID, id)
    }
  } catch (error) {
    console.error('Error saving current simulation comparison ID:', error)
  }
}

/**
 * Load the comparison ID for the current simulation being edited
 */
export function loadCurrentSimulationComparisonId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_SIMULATION_COMPARISON_ID)
  } catch (error) {
    console.error('Error loading current simulation comparison ID:', error)
    return null
  }
}

// ---- Named saves system ----

export type SavedSimulationMeta = {
  id: string
  name: string
  type: 'rental' | 'property-flipping'
  createdAt: string
  updatedAt: string
}

const SAVED_INDEX_KEY = 'rentaloc_saved_index'

function getSavedIndex(): SavedSimulationMeta[] {
  try {
    const raw = localStorage.getItem(SAVED_INDEX_KEY)
    return raw ? JSON.parse(raw) as SavedSimulationMeta[] : []
  } catch {
    return []
  }
}

function setSavedIndex(index: SavedSimulationMeta[]): void {
  localStorage.setItem(SAVED_INDEX_KEY, JSON.stringify(index))
}

export function listSavedSimulations(type?: 'rental' | 'property-flipping'): SavedSimulationMeta[] {
  const all = getSavedIndex()
  return type ? all.filter((s) => s.type === type) : all
}

export function saveNamedSimulation(
  name: string,
  type: 'rental' | 'property-flipping',
  data: unknown,
  existingId?: string,
): SavedSimulationMeta {
  const index = getSavedIndex()
  const now = new Date().toISOString()

  if (existingId) {
    // Update existing
    const entry = index.find((s) => s.id === existingId)
    if (entry) {
      entry.name = name
      entry.updatedAt = now
      localStorage.setItem(`rentaloc_save_${existingId}`, JSON.stringify(data))
      setSavedIndex(index)
      return entry
    }
  }

  // Create new
  const id = `save-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const meta: SavedSimulationMeta = { id, name, type, createdAt: now, updatedAt: now }
  index.unshift(meta)
  setSavedIndex(index)
  localStorage.setItem(`rentaloc_save_${id}`, JSON.stringify(data))
  return meta
}

export function loadNamedSimulation<T>(id: string): T | null {
  try {
    const raw = localStorage.getItem(`rentaloc_save_${id}`)
    return raw ? JSON.parse(raw) as T : null
  } catch {
    return null
  }
}

export function deleteNamedSimulation(id: string): void {
  const index = getSavedIndex().filter((s) => s.id !== id)
  setSavedIndex(index)
  localStorage.removeItem(`rentaloc_save_${id}`)
}

export function renameNamedSimulation(id: string, newName: string): void {
  const index = getSavedIndex()
  const entry = index.find((s) => s.id === id)
  if (entry) {
    entry.name = newName
    entry.updatedAt = new Date().toISOString()
    setSavedIndex(index)
  }
}
