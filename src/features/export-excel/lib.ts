import ExcelJS from 'exceljs'
import {
  computeTvaSurMarge,
  computeTvaDeductible,
  computeAResterPayer,
  computeTvaSurTotal,
  computeResteTvaTotal,
  VAT_RATE_TRAVAUX,
} from '../../entities/finance/vat'
import type { MarchandDeBiensValues } from '../../panels/property-flip/model/types'

const IS_TRANCHE_1_LIMIT = 42500
const IS_TRANCHE_1_RATE = 0.15
const IS_TRANCHE_2_RATE = 0.25
function computeISExcel(b: number) {
  const t1 = Math.min(b, IS_TRANCHE_1_LIMIT) * IS_TRANCHE_1_RATE
  const t2 = Math.max(0, b - IS_TRANCHE_1_LIMIT) * IS_TRANCHE_2_RATE
  return t1 + t2
}
// Flat tax (PFU) : 31,4% depuis le 1er janvier 2026 (12,8% IR + 18,6% prélèvements sociaux)
const MB_FLAT_TAX_RATE = 0.314

export async function exportMarchandToExcel(
  values: MarchandDeBiensValues,
  strings: Record<string, string>,
  formatCurrency: (n: number) => string,
): Promise<void> {
  const purchasePrice = Number(values.purchasePrice) || 0
  const notaryFees = purchasePrice * 0.03
  const agencyFees = Number(values.agencyFees) || 0
  const travauxHT = Number(values.travauxHT) || 0
  const amountOfOperation = purchasePrice + notaryFees + agencyFees + travauxHT
  const apportPercent = Number(values.apportPercent) || 0
  const apportAmount = amountOfOperation * (apportPercent / 100)
  const financementAmount = amountOfOperation - apportAmount
  const ratePerYear = (Number(values.ratePerYear) || 0) / 100
  const months = Math.max(Number(values.durationMonths) || 1, 1)
  const monthlyPayment = (financementAmount * ratePerYear) / 12
  const totalPayments = monthlyPayment * months
  const totalCostForMarge = amountOfOperation + totalPayments

  const totalRevente = values.apartments.reduce(
    (s, a) => s + (Number(a.resalePrice) || 0),
    0,
  )

  const tvaDeductible = computeTvaDeductible(travauxHT, agencyFees)
  const tvaSurMarge = computeTvaSurMarge(totalRevente, totalCostForMarge)
  const aRestoPayer = computeAResterPayer(tvaSurMarge, tvaDeductible)
  const tvaDeductibleTotal = travauxHT * (VAT_RATE_TRAVAUX / (1 + VAT_RATE_TRAVAUX))
  const tvaSurTotal = computeTvaSurTotal(totalRevente)
  const reste = computeResteTvaTotal(tvaSurTotal, tvaDeductibleTotal)

  const marge = totalRevente - totalCostForMarge
  const beneficeImposable = Math.max(0, marge - aRestoPayer)
  const impotsSocietes = computeISExcel(beneficeImposable)
  const beneficesNets = beneficeImposable - impotsSocietes
  const flatTaxe = beneficeImposable * MB_FLAT_TAX_RATE
  const beneficesEnPoche = beneficesNets - flatTaxe

  const headerStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1e3a5f' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
  }
  const sectionStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3b82f6' } },
  }
  const labelStyle: Partial<ExcelJS.Style> = {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFe0e7ff' } },
  }
  const formulaStyle: Partial<ExcelJS.Style> = {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFfef3c7' } },
    font: { italic: true },
  }

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Simu Renta'
  workbook.created = new Date()

  const sheetAcq = workbook.addWorksheet('Acquisition', { views: [{ state: 'frozen', ySplit: 1 }] })
  sheetAcq.columns = [{ width: 35 }, { width: 20 }, { width: 45 }]
  const acqTitle = sheetAcq.addRow([strings.mbAcquisition, '', ''])
  acqTitle.getCell(1).style = { ...sectionStyle, font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 14 } }
  sheetAcq.addRow([strings.purchasePrice, purchasePrice, '']).getCell(2).numFmt = '#,##0 €'
  sheetAcq.addRow([strings.mbNotaryFees, notaryFees, '3% du prix']).getCell(2).numFmt = '#,##0 €'
  sheetAcq.addRow([strings.agencyFees, agencyFees, '']).getCell(2).numFmt = '#,##0 €'
  sheetAcq.addRow([strings.mbTravauxHT || 'Travaux HT', travauxHT, '']).getCell(2).numFmt = '#,##0 €'
  sheetAcq.addRow([strings.mbFinancialCost, totalPayments, '']).getCell(2).numFmt = '#,##0 €'
  const totalRow = sheetAcq.addRow(['Total opération', amountOfOperation, ''])
  totalRow.getCell(1).style = labelStyle
  totalRow.getCell(2).style = { ...labelStyle, numFmt: '#,##0 €' }

  const sheetApt = workbook.addWorksheet('Appartements', { views: [{ state: 'frozen', ySplit: 1 }] })
  sheetApt.columns = [{ width: 12 }, { width: 12 }, { width: 18 }]
  const aptHeader = sheetApt.addRow([
    strings.mbApartmentType,
    strings.mbApartmentSuperficie,
    strings.mbResalePrice,
  ])
  aptHeader.eachCell((c) => { c.style = headerStyle })
  values.apartments.forEach((a) => {
    const r = sheetApt.addRow([
      a.type,
      a.superficie,
      Number(a.resalePrice) || 0,
    ])
    r.getCell(3).numFmt = '#,##0 €'
  })
  const aptTotal = sheetApt.addRow([
    strings.mbTotal,
    '',
    totalRevente,
  ])
  aptTotal.eachCell((c, col) => {
    if (col > 2) {
      c.style = { font: { bold: true } }
      c.numFmt = '#,##0 €'
    }
  })

  const sheetFin = workbook.addWorksheet('Financement', { views: [{ state: 'frozen', ySplit: 1 }] })
  sheetFin.columns = [{ width: 30 }, { width: 20 }, { width: 50 }]
  const finTitle = sheetFin.addRow([strings.mbFinancials, '', ''])
  finTitle.getCell(1).style = { ...sectionStyle, font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 14 } }
  sheetFin.addRow([strings.mbOperationAmount, amountOfOperation, '']).getCell(2).numFmt = '#,##0 €'
  sheetFin.addRow([strings.mbApportPercent, `${apportPercent}%`, ''])
  sheetFin.addRow([strings.mbApportAmount, apportAmount, '']).getCell(2).numFmt = '#,##0 €'
  sheetFin.addRow([strings.mbFinancementAmount, financementAmount, '']).getCell(2).numFmt = '#,##0 €'
  sheetFin.addRow([strings.mbRatePerYear, `${values.ratePerYear}%`, ''])
  sheetFin.addRow([strings.mbDurationMonths, `${months} mois`, ''])
  sheetFin.addRow([strings.mbMonthlyPayment, monthlyPayment, '']).getCell(2).numFmt = '#,##0 €'
  sheetFin.addRow([strings.mbTotalPayments, totalPayments, '']).getCell(2).numFmt = '#,##0 €'
  const finTotal = sheetFin.addRow(['Coût total (marge)', totalCostForMarge, 'Achat + frais + coût crédit'])
  finTotal.getCell(1).style = labelStyle
  finTotal.getCell(2).style = labelStyle
  finTotal.getCell(2).numFmt = '#,##0 €'

  const sheetTva = workbook.addWorksheet('TVA', { views: [{ state: 'frozen', ySplit: 1 }] })
  sheetTva.columns = [{ width: 40 }, { width: 22 }]
  const tvaHeaders = sheetTva.addRow([
    '',
    strings.mbResalePrice,
  ])
  tvaHeaders.eachCell((c) => { c.style = headerStyle })
  sheetTva.addRow([
    `${strings.mbVatMarge} (${strings.mbVatMargeHint})`,
    `${formatCurrency(tvaSurMarge)}\n${strings.mbAResterPayer}: ${formatCurrency(aRestoPayer)}`,
  ])
  sheetTva.addRow([
    `${strings.mbVatCharge} (${strings.mbVatChargeHint})`,
    formatCurrency(tvaDeductible),
  ])
  sheetTva.addRow([
    `${strings.mbVatTotal} (${strings.mbVatTotalHint})`,
    `${formatCurrency(tvaSurTotal)} → ${strings.mbReste} ${formatCurrency(reste)}`,
  ])
  sheetTva.addRow([])
  const formulesTva = sheetTva.addRow(['Formules de calcul:', ''])
  formulesTva.getCell(1).style = sectionStyle
  const formulaRowsTva = [
    `TVA sur marge = (${strings.vatTooltipRevente} − ${strings.vatTooltipCout}) × 20% / 1,20`,
    `TVA déductible = ${strings.vatTooltipTravaux} × 10% / 1,10 + ${strings.vatTooltipAgence} × 20% / 1,20`,
    'Reste à payer = TVA sur marge − TVA déductible',
    `TVA sur total = ${strings.vatTooltipRevente} × 20% / 1,20`,
    'Reste TVA total = TVA sur total − TVA déductible (travaux 10%)',
  ]
  formulaRowsTva.forEach((f) => {
    const r = sheetTva.addRow([f, ''])
    r.getCell(1).style = formulaStyle
  })

  const sheetFiscal = workbook.addWorksheet('Résultat fiscal', { views: [{ state: 'frozen', ySplit: 1 }] })
  sheetFiscal.columns = [{ width: 28 }, { width: 20 }]
  const fiscalHeaders = sheetFiscal.addRow([
    '',
    strings.mbResalePrice,
  ])
  fiscalHeaders.eachCell((c) => { c.style = headerStyle })
  const fiscalDataRows = [
    [strings.mbBeneficeImposable, beneficeImposable],
    [strings.mbImpotsSocietes, impotsSocietes],
    [strings.mbBeneficesNets, beneficesNets],
    [strings.mbFlatTaxe, flatTaxe],
    [strings.mbBeneficesEnPoche, beneficesEnPoche],
  ]
  fiscalDataRows.forEach((row) => {
    const r = sheetFiscal.addRow(row)
    r.getCell(1).style = labelStyle
    r.getCell(2).numFmt = '#,##0 €'
  })
  sheetFiscal.addRow([])
  const formulesFiscal = sheetFiscal.addRow(['Formules:', ''])
  formulesFiscal.getCell(1).style = sectionStyle
  const formulaRowsFiscal = [
    'Bénéfice imposable = Marge − Reste à payer TVA',
    'Impôts sur sociétés = Bénéfice × 25%',
    'Bénéfices nets = Bénéfice − IS',
    'Flat taxe = Bénéfice × 31,4%',
    'Bénéfices en poche = Bénéfice − Flat taxe',
  ]
  formulaRowsFiscal.forEach((f) => {
    const r = sheetFiscal.addRow([f, ''])
    r.getCell(1).style = formulaStyle
  })

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `simu_renta_marchand_de_biens_${Date.now()}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
