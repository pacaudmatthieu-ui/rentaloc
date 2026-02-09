import type { Locale } from '../../../../shared/types'
import type { ApartmentItem } from '../../model/types'

export type ApartmentUpdateField =
  | 'type'
  | 'superficie'
  | 'resalePessimistic'
  | 'resaleLogic'
  | 'resaleOptimistic'

interface ReventeTableProps {
  title: string
  apartments: ApartmentItem[]
  resaleField: 'resalePessimistic' | 'resaleLogic' | 'resaleOptimistic'
  updateApartment: (id: string, field: ApartmentUpdateField, value: string) => void
  strings: Record<string, string>
  currencyFormatter: Intl.NumberFormat
  totalAcquisitionCost: number
  locale: Locale
}

export function ReventeTable({
  title,
  apartments,
  resaleField,
  updateApartment,
  strings,
  currencyFormatter,
  totalAcquisitionCost,
  locale,
}: ReventeTableProps) {
  const typeLabels: Record<ApartmentItem['type'], string> = {
    T1: strings.mbApartmentT1,
    T2: strings.mbApartmentT2,
    T3: strings.mbApartmentT3,
    T4: strings.mbApartmentT4,
    T5: strings.mbApartmentT5,
  }

  const totalRevente = apartments.reduce(
    (sum, apt) => sum + (Number(apt[resaleField]) || 0),
    0,
  )
  const plusValue = totalRevente - totalAcquisitionCost
  const marge =
    totalAcquisitionCost > 0
      ? (totalRevente - totalAcquisitionCost) / totalAcquisitionCost
      : 0

  const percentFormatter = new Intl.NumberFormat(
    locale === 'fr' ? 'fr-FR' : 'en-US',
    {
      style: 'percent',
      maximumFractionDigits: 1,
    },
  )

  return (
    <div className="mb-revente-card">
      <h3 className="mb-revente-title">{title}</h3>
      <div className="mb-revente-table">
        <div className="mb-revente-header">
          <span>{strings.mbApartmentType}</span>
          <span>{strings.mbApartmentSuperficie}</span>
          <span>{strings.mbResalePrice}</span>
          <span>{strings.mbPricePerSqm}</span>
        </div>
        {apartments.map((apt) => {
          const superficie = Number(apt.superficie) || 0
          const resalePrice = Number(apt[resaleField]) || 0
          const pricePerSqm = superficie > 0 ? resalePrice / superficie : 0

          return (
            <div key={apt.id} className="mb-revente-row">
              <span className="mb-revente-cell-type">{typeLabels[apt.type]}</span>
              <span className="mb-revente-cell-superficie">{apt.superficie} m²</span>
              <input
                type="text"
                inputMode="decimal"
                className="mb-revente-input"
                value={apt[resaleField]}
                onChange={(e) =>
                  updateApartment(apt.id, resaleField, e.target.value)
                }
              />
              <span className="mb-revente-cell-price">
                {resalePrice > 0 ? currencyFormatter.format(pricePerSqm) : '–'}
              </span>
            </div>
          )
        })}
        <div className="mb-revente-row mb-revente-total-row">
          <span className="mb-revente-cell-type">{strings.mbTotal}</span>
          <span className="mb-revente-cell-superficie">–</span>
          <span className="mb-revente-cell-total">
            {currencyFormatter.format(totalRevente)}
          </span>
          <span className="mb-revente-cell-price">–</span>
        </div>
        <div className="mb-revente-summary">
          <div className="mb-revente-summary-row">
            <span>{strings.mbPlusValue}</span>
            <span
              className={
                plusValue >= 0 ? 'mb-revente-positive' : 'mb-revente-negative'
              }
            >
              {currencyFormatter.format(plusValue)}
            </span>
          </div>
          <div className="mb-revente-summary-row">
            <span>{strings.mbMarge}</span>
            <span>
              {totalRevente > 0 && totalAcquisitionCost > 0
                ? percentFormatter.format(marge)
                : '–'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
