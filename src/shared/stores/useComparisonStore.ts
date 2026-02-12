import { create } from 'zustand'
import type { ComparisonSimulation, SimulationType } from '../types/comparison'
import { MAX_COMPARISON_SIMULATIONS, generateComparisonId, generateComparisonName } from '../types/comparison'
import {
  saveComparisonList,
  loadComparisonList,
  saveComparisonSimulation,
  loadComparisonSimulation,
  removeComparisonSimulation,
} from '../utils/storage'
import type { SimulationFormValues } from '../../panels/rental-investment/model/types'
import type { MarchandDeBiensValues } from '../../panels/property-flip/model/types'
import { calculateResults } from '../../panels/rental-investment/lib/calculations'

interface ComparisonStore {
  simulations: ComparisonSimulation[]
  initialized: boolean
  
  // Actions
  initialize: () => void
  addToComparison: (type: SimulationType, data: SimulationFormValues | MarchandDeBiensValues) => { success: boolean; error?: string }
  removeFromComparison: (id: string) => void
  clearComparison: () => void
  isInComparison: (type: SimulationType, data: SimulationFormValues | MarchandDeBiensValues) => boolean
}

/**
 * Calculate preview metrics for a simulation
 */
function calculatePreviewMetrics(
  type: SimulationType,
  data: SimulationFormValues | MarchandDeBiensValues,
): ComparisonSimulation['previewMetrics'] {
  if (type === 'rental') {
    const rentalData = data as SimulationFormValues
    try {
      const results = calculateResults(rentalData)
      return {
        grossYield: results.grossYield,
        netYield: results.netYield,
        annualCashflow: results.annualCashflow,
      }
    } catch {
      return undefined
    }
  } else {
    // Property flipping - calculate margin from apartments
    const flipData = data as MarchandDeBiensValues
    try {
      const totalResale = flipData.apartments.reduce((sum, apt) => {
        const resale = toNumber(apt.resaleLogic) || 0
        return sum + resale
      }, 0)
      const totalCost = toNumber(flipData.purchasePrice) + 
                       toNumber(flipData.agencyFees) + 
                       toNumber(flipData.renovationBudget)
      const margin = totalCost > 0 ? ((totalResale - totalCost) / totalCost) * 100 : 0
      const totalProfit = totalResale - totalCost
      return {
        margin,
        totalProfit,
      }
    } catch {
      return undefined
    }
  }
}

function toNumber(value: string | undefined): number {
  if (!value) return 0
  const parsed = parseFloat(value)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Create a hash of simulation data to detect duplicates
 */
function createDataHash(type: SimulationType, data: SimulationFormValues | MarchandDeBiensValues): string {
  const normalized = JSON.stringify({ type, data })
  // Simple hash function
  let hash = 0
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return hash.toString(36)
}

export const useComparisonStore = create<ComparisonStore>((set, get) => ({
  simulations: [],
  initialized: false,

  initialize: () => {
    if (get().initialized) return
    
    const comparisonIds = loadComparisonList()
    const simulations: ComparisonSimulation[] = []
    
    for (const id of comparisonIds) {
      const loaded = loadComparisonSimulation<ComparisonSimulation>(id)
      if (loaded) {
        simulations.push(loaded)
      }
    }
    
    set({ simulations, initialized: true })
  },

  addToComparison: (type, data) => {
    const state = get()
    
    // Initialize if not already done
    if (!state.initialized) {
      state.initialize()
    }
    
    // Check if already in comparison (by data hash)
    const dataHash = createDataHash(type, data)
    const existing = state.simulations.find((sim) => {
      const simHash = createDataHash(sim.type, sim.data)
      return simHash === dataHash
    })
    
    if (existing) {
      return { success: false, error: 'already_in_comparison' }
    }
    
    // Check maximum limit
    if (state.simulations.length >= MAX_COMPARISON_SIMULATIONS) {
      return { success: false, error: 'max_limit_reached' }
    }
    
    // Create new comparison simulation
    const id = generateComparisonId()
    const name = generateComparisonName(type, state.simulations.length)
    const previewMetrics = calculatePreviewMetrics(type, data)
    
    const newSimulation: ComparisonSimulation = {
      id,
      name,
      type,
      createdAt: Date.now(),
      data,
      previewMetrics,
    }
    
    // Save to localStorage
    saveComparisonSimulation(id, newSimulation)
    const updatedIds = [...state.simulations.map(s => s.id), id]
    saveComparisonList(updatedIds)
    
    // Update store
    set({ simulations: [...state.simulations, newSimulation] })
    
    return { success: true }
  },

  removeFromComparison: (id) => {
    const state = get()
    const updated = state.simulations.filter(s => s.id !== id)
    
    // Remove from localStorage
    removeComparisonSimulation(id)
    saveComparisonList(updated.map(s => s.id))
    
    set({ simulations: updated })
  },

  clearComparison: () => {
    const state = get()
    
    // Remove all from localStorage
    for (const sim of state.simulations) {
      removeComparisonSimulation(sim.id)
    }
    saveComparisonList([])
    
    set({ simulations: [] })
  },

  isInComparison: (type, data) => {
    const state = get()
    if (!state.initialized) {
      state.initialize()
    }
    
    const dataHash = createDataHash(type, data)
    return state.simulations.some((sim) => {
      const simHash = createDataHash(sim.type, sim.data)
      return simHash === dataHash
    })
  },
}))
