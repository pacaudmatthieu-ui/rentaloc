export type ExportSection = 'investissement_locatif' | 'marchand_de_biens'

export interface ExportPdfOptions {
  section: ExportSection
  margin?: number
}

/**
 * Le moteur PDF (html2pdf ≈ 500 Ko) n'est chargé qu'au premier clic sur
 * « Exporter PDF » — il ne pèse plus rien sur le chargement initial du site.
 */
export async function exportPdfFromElement(
  element: HTMLElement,
  options: ExportPdfOptions,
): Promise<void> {
  const { default: html2pdf } = await import('html2pdf.js')
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
