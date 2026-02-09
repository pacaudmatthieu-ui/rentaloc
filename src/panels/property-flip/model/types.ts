export type ApartmentItem = {
  id: string
  type: 'T1' | 'T2' | 'T3' | 'T4' | 'T5'
  superficie: string
  resalePessimistic: string
  resaleLogic: string
  resaleOptimistic: string
}

export type MarchandDeBiensValues = {
  purchasePrice: string
  agencyFees: string
  renovationBudget: string
  apartments: ApartmentItem[]
  apportPercent: string
  ratePerYear: string
  durationMonths: string
}

export function createDefaultApartment(index: number): ApartmentItem {
  return {
    id: `apt-${index}-${Math.random().toString(36).slice(2, 8)}`,
    type: index === 0 ? 'T1' : index === 1 ? 'T2' : 'T3',
    superficie: String(25 + index * 10),
    resalePessimistic: '',
    resaleLogic: '',
    resaleOptimistic: '',
  }
}

export const MB_INITIAL: MarchandDeBiensValues = {
  purchasePrice: '150000',
  agencyFees: '6000',
  renovationBudget: '25000',
  apartments: [
    createDefaultApartment(0),
    createDefaultApartment(1),
    createDefaultApartment(2),
  ],
  apportPercent: '20',
  ratePerYear: '8',
  durationMonths: '12',
}
