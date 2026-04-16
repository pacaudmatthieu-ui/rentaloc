import type { Locale } from '../../../../shared/types'
import type { LotItem, LotType } from '../../model/types'

interface ReventeTableProps {
  apartments: LotItem[]
  updateApartment: (id: string, field: keyof LotItem, value: string) => void
  strings: Record<string, string>
  currencyFormatter: Intl.NumberFormat
  totalAcquisitionCost: number
  locale: Locale
  lotTypeLabels: Record<LotType, string>
}

export function ReventeTable({
  apartments,
  updateApartment,
  strings,
  currencyFormatter,
  totalAcquisitionCost,
  locale,
  lotTypeLabels,
}: ReventeTableProps) {
  const tvaLabels: Record<string, string> = {
    exonere: strings.mbTvaExonere,
    marge: strings.mbTvaMarge,
    total: strings.mbTvaTotal,
  }

  const totalRevente = apartments.reduce(
    (sum, lot) => sum + (Number(lot.resalePrice) || 0),
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
      <div className="mb-revente-table">
        <div className="mb-revente-header">
          <span>{strings.mbApartmentType}</span>
          <span>{strings.mbLotTvaRegime}</span>
          <span>{strings.mbApartmentSuperficie}</span>
          <span>{strings.mbResalePrice}</span>
          <span>{strings.mbPricePerSqm}</span>
        </div>
        {apartments.map((lot) => {
          const superficie = Number(lot.superficie) || 0
          const resalePrice = Number(lot.resalePrice) || 0
          const pricePerSqm = superficie > 0 ? resalePrice / superficie : 0

          return (
            <div key={lot.id} className="mb-revente-row">
              <span className="mb-revente-cell-type">{lotTypeLabels[lot.type]}</span>
              <span className="mb-revente-cell-tva">{tvaLabels[lot.tvaRegime] ?? lot.tvaRegime}</span>
              <span className="mb-revente-cell-superficie">{lot.superficie} m²</span>
              <input
                type="text"
                inputMode="decimal"
                className="mb-revente-input"
                value={lot.resalePrice}
                onChange={(e) =>
                  updateApartment(lot.id, 'resalePrice', e.target.value)
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
          <span className="mb-revente-cell-tva">–</span>
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
