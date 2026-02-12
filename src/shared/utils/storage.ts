/**
 * localStorage utilities for simulation data persistence
 * Follows Architecture naming convention: rentaloc_{category}_{identifier}
 */

const STORAGE_KEYS = {
  RENTAL_SIMULATION: 'rentaloc_rental_simulation',
  PROPERTY_FLIPPING_SIMULATION: 'rentaloc_property_flipping_simulation',
  USER_LANGUAGE: 'rentaloc_user_language',
  COMPARISON_LIST: 'rentaloc_comparison_list',
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
    return JSON.parse(serialized) as T
  } catch (error) {
    console.error('Error loading property flipping simulation from localStorage:', error)
    // Return null if data is corrupted or invalid
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
