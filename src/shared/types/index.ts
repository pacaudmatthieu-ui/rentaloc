export type Locale = 'en' | 'fr'

export type TaxRegime =
  | 'none'
  | 'micro_foncier'
  | 'reel_foncier'
  | 'lmnp_micro_bic'
  | 'lmnp_reel'
  | 'sci_ir'
  | 'sci_is'
  | 'bailleur_prive'

export type AppSection = 'investissement_locatif' | 'marchand_de_biens'

/**
 * Simulation type mapping for clarity
 * Maps AppSection values to explicit simulation types
 */
export const SIMULATION_TYPE = {
  RENTAL: 'rental',
  PROPERTY_FLIPPING: 'property-flipping',
} as const

export type SimulationType = typeof SIMULATION_TYPE[keyof typeof SIMULATION_TYPE]

/**
 * Maps AppSection to SimulationType
 */
export function getSimulationType(appSection: AppSection): SimulationType {
  return appSection === 'investissement_locatif'
    ? SIMULATION_TYPE.RENTAL
    : SIMULATION_TYPE.PROPERTY_FLIPPING
}
