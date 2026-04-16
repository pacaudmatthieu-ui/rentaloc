export const LOT_TYPES = [
  'appartement-t1',
  'appartement-t2',
  'appartement-t3',
  'appartement-t4',
  'appartement-t5',
  'maison',
  'terrain',
  'immeuble',
  'local-commercial',
  'parking',
  'cave',
  'garage',
  'bureau',
  'autre',
] as const

export type LotType = (typeof LOT_TYPES)[number]

export type TvaRegime = 'exonere' | 'marge' | 'total'

export type LotItem = {
  id: string
  type: LotType
  tvaRegime: TvaRegime
  superficie: string
  resalePrice: string
}

/** @deprecated Use LotItem instead */
export type ApartmentItem = LotItem

export type ExtraChargeItem = {
  id: string
  label: string
  amount: string
}

export type MarchandDeBiensValues = {
  purchasePrice: string
  agencyFees: string
  /** Frais de notaire. Vide = auto 3% du prix d'achat */
  notaryFeesOverride: string
  apartments: LotItem[]
  /** Proportion du prix d'achat attribuée aux lots TVA marge (%).
   *  Vide = auto-calculé au prorata des prix de vente. */
  terrainProportion: string
  // Charges HT
  huissierFees: string
  geometreFees: string
  architecteFees: string
  fraisDivers: string
  travauxHT: string
  /** Détail travaux par taux TVA (si déplié) */
  travaux55: string
  travaux10: string
  travaux20: string
  travauxDetailOpen: boolean
  /** Lignes de charges supplémentaires personnalisables */
  extraCharges: ExtraChargeItem[]
  apportPercent: string
  ratePerYear: string
  durationMonths: string
}

export function createDefaultLot(index: number): LotItem {
  const defaults: { type: LotType; superficie: string }[] = [
    { type: 'appartement-t2', superficie: '45' },
    { type: 'appartement-t3', superficie: '65' },
    { type: 'maison', superficie: '95' },
  ]
  const d = defaults[index % defaults.length]
  return {
    id: `lot-${index}-${Math.random().toString(36).slice(2, 8)}`,
    type: d.type,
    tvaRegime: 'marge',
    superficie: d.superficie,
    resalePrice: '',
  }
}

/** @deprecated Use createDefaultLot instead */
export const createDefaultApartment = createDefaultLot

export const MB_INITIAL: MarchandDeBiensValues = {
  purchasePrice: '150000',
  agencyFees: '6000',
  notaryFeesOverride: '',
  terrainProportion: '',
  apartments: [
    createDefaultLot(0),
    createDefaultLot(1),
    createDefaultLot(2),
  ],
  huissierFees: '',
  geometreFees: '',
  architecteFees: '',
  fraisDivers: '',
  travauxHT: '25000',
  travaux55: '',
  travaux10: '',
  travaux20: '',
  travauxDetailOpen: false,
  extraCharges: [],
  apportPercent: '20',
  ratePerYear: '8',
  durationMonths: '12',
}
