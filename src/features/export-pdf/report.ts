import type { SimulationFormValues, SimulationResults } from '../../panels/rental-investment/model/types'
import type { YearlyTableRow } from '../../panels/rental-investment/lib/calculations'
import type { FlipResults } from '../../panels/property-flip/lib/computeFlipResults'
import { toNumber } from '../../shared/lib/format'

/**
 * Rapport PDF brandé JM Académie : un vrai document structuré (synthèse,
 * hypothèses, projection) — plus une capture d'écran de l'interface.
 * Construit hors écran puis rendu par html2pdf (chargé à la demande).
 */

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const S = {
  page: 'font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a2620;background:#ffffff;padding:8px 6px;width:190mm;',
  header: 'display:flex;align-items:center;gap:12px;border-bottom:3px solid #10996b;padding-bottom:12px;margin-bottom:16px;',
  logo: 'width:44px;height:44px;border-radius:12px;background:#10996b;color:#ffffff;font-weight:800;font-size:18px;display:flex;align-items:center;justify-content:center;',
  title: 'font-size:20px;font-weight:800;margin:0;color:#0b1f16;',
  subtitle: 'font-size:11px;color:#5a6b62;margin:2px 0 0;',
  date: 'margin-left:auto;font-size:10px;color:#75897b;text-align:right;',
  h2: 'font-size:13px;font-weight:700;color:#10996b;margin:18px 0 8px;text-transform:uppercase;letter-spacing:0.5px;',
  hero: 'background:#eef8f3;border:1px solid #cfe9dd;border-radius:10px;padding:14px 16px;margin-bottom:6px;',
  heroFig: 'font-size:26px;font-weight:800;',
  heroPos: 'color:#0e7c57;',
  heroNeg: 'color:#c2453a;',
  heroUnit: 'font-size:12px;color:#5a6b62;font-weight:500;',
  heroPhrase: 'font-size:11px;color:#3d4f45;margin-top:4px;',
  grid: 'display:flex;flex-wrap:wrap;gap:8px;',
  tile: 'flex:1 1 30%;min-width:30%;background:#f4f8f5;border:1px solid #e0eae3;border-radius:8px;padding:8px 10px;box-sizing:border-box;',
  tileV: 'font-size:13px;font-weight:700;',
  tileL: 'font-size:9px;color:#75897b;margin-top:2px;',
  table: 'width:100%;border-collapse:collapse;font-size:9.5px;',
  th: 'text-align:right;padding:5px 7px;border-bottom:2px solid #10996b;color:#3d4f45;font-weight:700;',
  thL: 'text-align:left;padding:5px 7px;border-bottom:2px solid #10996b;color:#3d4f45;font-weight:700;',
  td: 'text-align:right;padding:4px 7px;border-bottom:1px solid #e6eee9;font-variant-numeric:tabular-nums;',
  tdL: 'text-align:left;padding:4px 7px;border-bottom:1px solid #e6eee9;',
  neg: 'color:#c2453a;',
  pos: 'color:#0e7c57;',
  kv: 'display:flex;justify-content:space-between;font-size:10.5px;padding:3px 0;border-bottom:1px dotted #e0eae3;',
  cta: 'margin-top:20px;background:#0b1f16;color:#ffffff;border-radius:10px;padding:12px 16px;font-size:11px;',
  ctaLink: 'color:#4fe0a5;font-weight:700;',
  legal: 'margin-top:12px;font-size:8px;color:#8a988f;line-height:1.5;',
}

function header(strings: Record<string, string>, locale: string): string {
  const date = new Date().toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
  return `
    <div style="${S.header}">
      <div style="${S.logo}">JM</div>
      <div>
        <p style="${S.title}">RentaLoc</p>
        <p style="${S.subtitle}">${esc(strings.brandBy)}</p>
      </div>
      <div style="${S.date}">${esc(strings.reportGenerated)}<br/><strong>${esc(date)}</strong></div>
    </div>`
}

function footer(strings: Record<string, string>): string {
  return `
    <div style="${S.cta}">
      ${esc(strings.reportCta)}
      <span style="${S.ctaLink}">jmacademie.com</span>
    </div>
    <div style="${S.legal}">${esc(strings.legalDisclaimer)}</div>`
}

function tiles(items: { label: string; value: string; tone?: 'pos' | 'neg' }[]): string {
  return `<div style="${S.grid}">${items
    .map(
      (t) => `
      <div style="${S.tile}">
        <div style="${S.tileV}${t.tone === 'pos' ? S.pos : t.tone === 'neg' ? S.neg : ''}">${esc(t.value)}</div>
        <div style="${S.tileL}">${esc(t.label)}</div>
      </div>`,
    )
    .join('')}</div>`
}

function kv(label: string, value: string): string {
  return `<div style="${S.kv}"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`
}

export function buildRentalReport(
  values: SimulationFormValues,
  results: SimulationResults,
  tableData: YearlyTableRow[],
  strings: Record<string, string>,
  locale: string,
  currency: Intl.NumberFormat,
  percent: Intl.NumberFormat,
): HTMLElement {
  const cf = results.monthlyCashflowAfterTax
  const heroTone = cf >= 0 ? S.heroPos : S.heroNeg
  const years = Math.round(toNumber(values.loanDurationMonths) / 12)

  const rows = tableData
    .slice(0, 30)
    .map(
      (r) => `
      <tr>
        <td style="${S.tdL}">${r.year}</td>
        <td style="${S.td}">${esc(currency.format(r.rent))}</td>
        <td style="${S.td}">${esc(currency.format(r.charges))}</td>
        <td style="${S.td}">${esc(currency.format(r.credit))}</td>
        <td style="${S.td}">${esc(currency.format(r.tax + r.saleTax))}</td>
        <td style="${S.td}${r.cashDispo < 0 ? S.neg : S.pos}">${esc(currency.format(r.cashDispo))}</td>
      </tr>`,
    )
    .join('')

  const el = document.createElement('div')
  el.innerHTML = `
  <div style="${S.page}">
    ${header(strings, locale)}
    <div style="${S.hero}">
      <span style="${S.heroFig}${heroTone}">${esc(currency.format(cf))}</span>
      <span style="${S.heroUnit}"> ${esc(strings.verdictPerMonth)}</span>
      <div style="${S.heroPhrase}">${esc(strings.reportRentalSubtitle)}</div>
    </div>
    ${tiles([
      { label: strings.grossYield, value: percent.format(results.grossYield), tone: 'pos' },
      { label: strings.netYield, value: percent.format(results.netYield), tone: 'pos' },
      { label: strings.totalCost, value: currency.format(results.totalCost) },
      { label: strings.loanAmount, value: currency.format(results.loanAmount) },
      { label: strings.estimatedAnnualTax, value: currency.format(results.annualTax) },
      { label: strings.annualCashflowAfterTax, value: currency.format(results.annualCashflowAfterTax), tone: results.annualCashflowAfterTax >= 0 ? 'pos' : 'neg' },
    ])}
    <div style="${S.h2}">${esc(strings.reportAssumptions)}</div>
    ${kv(strings.purchasePrice, currency.format(toNumber(values.purchasePrice)))}
    ${kv(strings.monthlyRent, `${currency.format(toNumber(values.monthlyRent))} / ${strings.unitMonths.replace(/s$/, '')}`)}
    ${kv(strings.ownFunds, currency.format(toNumber(values.ownFunds)))}
    ${kv(strings.loanDurationYears, `${years} ${strings.unitYears}`)}
    ${kv(strings.interestRate, `${esc(values.interestRate)} %`)}
    ${kv(strings.taxRegimeLabel, strings[`regimeLabel_${values.taxRegime}`] ?? values.taxRegime)}
    <div style="${S.h2}">${esc(strings.simpleProjectionTitle)}</div>
    <table style="${S.table}">
      <thead>
        <tr>
          <th style="${S.thL}">${esc(strings.tableYear)}</th>
          <th style="${S.th}">${esc(strings.tableRent)}</th>
          <th style="${S.th}">${esc(strings.tableCharges)}</th>
          <th style="${S.th}">${esc(strings.tableCredit)}</th>
          <th style="${S.th}">${esc(strings.tableTax)}</th>
          <th style="${S.th}">${esc(strings.tableCashDispo)}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    ${footer(strings)}
  </div>`
  return el
}

export function buildFlipReport(
  flip: FlipResults,
  strings: Record<string, string>,
  locale: string,
  currency: Intl.NumberFormat,
): HTMLElement {
  const heroTone = flip.margeNetteAvantIS >= 0 ? S.heroPos : S.heroNeg
  const tvaLabel =
    flip.tvaNette < 0
      ? `${strings.mbCreditTva} ${currency.format(-flip.tvaNette)}`
      : currency.format(flip.tvaNette)

  const el = document.createElement('div')
  el.innerHTML = `
  <div style="${S.page}">
    ${header(strings, locale)}
    <div style="${S.hero}">
      <span style="${S.heroFig}${heroTone}">${esc(currency.format(flip.margeNetteAvantIS))}</span>
      <span style="${S.heroUnit}"> ${esc(strings.verdictMbUnit)}</span>
      <div style="${S.heroPhrase}">${esc(strings.reportFlipSubtitle)}</div>
    </div>
    ${tiles([
      { label: strings.mbMarginPercent, value: flip.margePercent != null ? `${flip.margePercent.toFixed(1)} %` : '–', tone: flip.margeNetteAvantIS >= 0 ? 'pos' : 'neg' },
      { label: strings.mbRoiFondsPropres, value: flip.roiFondsPropres != null ? `${flip.roiFondsPropres.toFixed(1)} %` : '–' },
      { label: strings.mbDividendesEnPoche, value: currency.format(flip.dividendesEnPoche), tone: flip.dividendesEnPoche >= 0 ? 'pos' : 'neg' },
    ])}
    <div style="${S.h2}">${esc(strings.mbOperationResult)}</div>
    ${kv(strings.vatTooltipRevente, currency.format(flip.totalRevente))}
    ${kv(strings.vatTooltipCout, currency.format(flip.totalCostForMarge))}
    ${kv(strings.mbTvaAPayer, tvaLabel)}
    ${kv(strings.mbMargeNetteAvantIS, currency.format(flip.margeNetteAvantIS))}
    <div style="${S.h2}">${esc(strings.mbFiscalResult)}</div>
    ${kv(strings.mbImpotsSocietes, currency.format(flip.impotsSocietes))}
    ${kv(`${strings.mbFlatTaxe} (PFU ${(flip.flatTaxRate * 100).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US')} %)`, currency.format(flip.flatTax))}
    ${kv(strings.mbDividendesEnPoche, currency.format(flip.dividendesEnPoche))}
    <div style="${S.h2}">${esc(strings.reportAssumptions)}</div>
    ${kv(strings.purchasePrice, currency.format(flip.purchasePrice))}
    ${kv(strings.mbNotaryFees, currency.format(flip.effectiveNotaryFees))}
    ${kv(strings.mbTravauxHT, currency.format(flip.travauxHT))}
    ${kv(strings.mbApportAmount, currency.format(flip.apportAmount))}
    ${kv(strings.mbFinancialCost, currency.format(flip.financialCost))}
    ${footer(strings)}
  </div>`
  return el
}

/** Rend un élément hors écran puis l'exporte en PDF (html2pdf chargé à la demande). */
export async function exportReport(element: HTMLElement, filename: string): Promise<void> {
  const { default: html2pdf } = await import('html2pdf.js')
  const host = document.createElement('div')
  host.style.position = 'fixed'
  host.style.left = '-10000px'
  host.style.top = '0'
  host.appendChild(element)
  document.body.appendChild(host)
  try {
    await html2pdf()
      .set({
        margin: 10,
        filename,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
      })
      .from(element)
      .save()
  } finally {
    document.body.removeChild(host)
  }
}
