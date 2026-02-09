import html2pdf from 'html2pdf.js'

export type ExportSection = 'investissement_locatif' | 'marchand_de_biens'

export interface ExportPdfOptions {
  section: ExportSection
  margin?: number
}

export function exportPdfFromElement(
  element: HTMLElement,
  options: ExportPdfOptions,
): void {
  const { section, margin = 10 } = options
  const opt = {
    margin,
    filename: `simu_renta_${section}_${Date.now()}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: {
      unit: 'mm' as const,
      format: 'a4' as const,
      orientation: 'portrait' as const,
    },
  }
  html2pdf().set(opt).from(element).save()
}
