import { create } from 'zustand'
import type { ComparisonSimulation, SimulationType } from '../types/comparison'
import { MAX_COMPARISON_SIMULATIONS, generateComparisonId, generateComparisonName } from '../types/comparison'
import {
  saveComparisonList,
  loadComparisonList,
  saveComparisonSimulation,
  loadComparisonSimulation,
  removeComparisonSimulation,
  loadCurrentSimulationComparisonId,
  saveCurrentSimulationComparisonId,
} from '../utils/storage'
import type { SimulationFormValues } from '../../panels/rental-investment/model/types'
import type { MarchandDeBiensValues } from '../../panels/property-flip/model/types'
import { calculateResults } from '../../panels/rental-investment/lib/calculations'
import { computeFlipResults } from '../../panels/property-flip/lib/computeFlipResults'

interface ComparisonStore {
  simulations: ComparisonSimulation[]
  initialized: boolean
  
  // Actions
  initialize: () => void
  addToComparison: (type: SimulationType, data: SimulationFormValues | MarchandDeBiensValues) => { success: boolean; error?: string }
  removeFromComparison: (id: string) => void
  clearComparison: () => void
  isInComparison: (type: SimulationType, data: SimulationFormValues | MarchandDeBiensValues) => boolean
  updateSimulationData: (type: SimulationType, data: SimulationFormValues | MarchandDeBiensValues) => void
  findSimulationByData: (type: SimulationType, data: SimulationFormValues | MarchandDeBiensValues) => ComparisonSimulation | undefined
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
    // Marchand de biens : moteur unique (mêmes chiffres que le panneau MDB)
    const flipData = data as MarchandDeBiensValues
    try {
      const flip = computeFlipResults(flipData)
      return {
        margin: flip.margePercent ?? 0,
        totalProfit: flip.margeNetteAvantIS,
      }
    } catch {
      return undefined
    }
  }
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
    
    // Check if already in comparison (by data hash or stored ID)
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
    
    // Clear stored comparison ID when adding new simulation (user is adding a different one)
    saveCurrentSimulationComparisonId(null)
    
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

  findSimulationByData: (type, data) => {
    const state = get()
    if (!state.initialized) {
      state.initialize()
    }
    
    // First, try to find by stored comparison ID (for simulations opened from comparison)
    const storedComparisonId = loadCurrentSimulationComparisonId()
    if (storedComparisonId) {
      const byId = state.simulations.find((sim) => sim.id === storedComparisonId && sim.type === type)
      if (byId) return byId
    }
    
    // Then try exact hash match
    const dataHash = createDataHash(type, data)
    const exactMatch = state.simulations.find((sim) => {
      const simHash = createDataHash(sim.type, sim.data)
      return simHash === dataHash
    })
    
    if (exactMatch) return exactMatch
    
    // If no exact match, try to find by comparing data directly
    // This handles modified simulations where hash changed
    const currentDataStr = JSON.stringify(data)
    return state.simulations.find((sim) => {
      if (sim.type !== type) return false
      const simDataStr = JSON.stringify(sim.data)
      return simDataStr === currentDataStr
    })
  },

  isInComparison: (type, data) => {
    const found = get().findSimulationByData(type, data)
    return found !== undefined
  },

  updateSimulationData: (type, data) => {
    const state = get()
    if (!state.initialized) {
      state.initialize()
    }
    
    // First, try to find by stored comparison ID (for simulations opened from comparison)
    const storedComparisonId = loadCurrentSimulationComparisonId()
    let foundSim: ComparisonSimulation | undefined
    
    if (storedComparisonId) {
      foundSim = state.simulations.find((sim) => sim.id === storedComparisonId && sim.type === type)
    }
    
    // If not found by ID, try to find by data matching
    if (!foundSim) {
      foundSim = state.findSimulationByData(type, data)
    }
    
    if (!foundSim) {
      // No matching simulation found - this simulation is not in comparison
      return
    }
    
    // Check if data actually changed
    const currentDataStr = JSON.stringify(data)
    const simDataStr = JSON.stringify(foundSim.data)
    
    if (currentDataStr === simDataStr) {
      // No changes, nothing to update
      return
    }
    
    // Update the found simulation
    const updatedSim = {
      ...foundSim,
      data,
      previewMetrics: calculatePreviewMetrics(type, data),
    }
    
    // Save to localStorage
    saveComparisonSimulation(foundSim.id, updatedSim)
    
    // Update store
    const updated = state.simulations.map((sim) => 
      sim.id === foundSim.id ? updatedSim : sim
    )
    
    set({ simulations: updated })
  },
}))
