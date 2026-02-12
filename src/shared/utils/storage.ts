/**
 * localStorage utilities for simulation data persistence
 * Follows Architecture naming convention: rentaloc_{category}_{identifier}
 */

const STORAGE_KEYS = {
  RENTAL_SIMULATION: 'rentaloc_rental_simulation',
  PROPERTY_FLIPPING_SIMULATION: 'rentaloc_property_flipping_simulation',
  USER_LANGUAGE: 'rentaloc_user_language',
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
