import React, { useRef, useState } from 'react'
import { exportToJson, validateImportPayload } from '../lib'
import { exportPdfFromElement } from '../../export-pdf/lib'
import { exportReport } from '../../export-pdf/report'
import { buildShareUrl } from '../../share-link/lib'
import type { ShareType } from '../../share-link/lib'
import type { ExportSection } from '../lib'

interface ExportImportPanelProps<T> {
  section: ExportSection
  data: T
  onImport: (data: T) => void
  validateData: (d: unknown) => d is T
  strings: Record<string, string>
  extraButton?: React.ReactNode
  pdfContentRef?: React.RefObject<HTMLElement | null>
  /** Rapport PDF brandé (prioritaire sur la capture d'écran de l'interface) */
  pdfReportBuilder?: () => HTMLElement
  /** Active le bouton « Copier le lien de partage » */
  shareType?: ShareType
}

export function ExportImportPanel<T>({
  section,
  data,
  onImport,
  validateData,
  strings,
  extraButton,
  pdfContentRef,
  pdfReportBuilder,
  shareType,
}: ExportImportPanelProps<T>) {
  const [showImportModal, setShowImportModal] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'error'>('idle')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = () => {
    exportToJson(section, data)
  }

  const handleExportPdf = () => {
    if (pdfReportBuilder) {
      exportReport(pdfReportBuilder(), `rentaloc_etude_${Date.now()}.pdf`)
      return
    }
    const el = pdfContentRef?.current
    if (!el) return
    exportPdfFromElement(el, { section })
  }

  const handleShare = async () => {
    if (!shareType) return
    try {
      await navigator.clipboard.writeText(buildShareUrl(shareType, data))
      setShareState('copied')
    } catch {
      setShareState('error')
    }
    setTimeout(() => setShareState('idle'), 2500)
  }

  const openImportModal = () => {
    setShowImportModal(true)
    setImportError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const closeImportModal = () => {
    setShowImportModal(false)
  }

  const handleImport = () => {
    setImportError(null)
    const file = fileInputRef.current?.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = reader.result as string
        const parsed = JSON.parse(text)
        const payloadResult = validateImportPayload(parsed, section)
        if (!payloadResult.valid) {
          setImportError(
            payloadResult.error === 'invalid_json' ? 'invalid_json' : 'invalid_format',
          )
          return
        }
        if (!validateData(payloadResult.data)) {
          setImportError('invalid_format')
          return
        }
        onImport(payloadResult.data as T)
        closeImportModal()
      } catch {
        setImportError('invalid_json')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="export-import-panel">
      <button type="button" className="export-import-btn" onClick={handleExport}>
        {strings.exportData}
      </button>
      <button type="button" className="export-import-btn" onClick={openImportModal}>
        {strings.importData}
      </button>
      {(pdfContentRef || pdfReportBuilder) && (
        <button type="button" className="export-import-btn" onClick={handleExportPdf}>
          {strings.exportPdf}
        </button>
      )}
      {shareType && (
        <button
          type="button"
          className={`export-import-btn ${shareState === 'copied' ? 'export-import-btn-success' : ''}`}
          onClick={handleShare}
        >
          {shareState === 'copied' ? strings.shareCopied : shareState === 'error' ? strings.shareError : strings.shareLink}
        </button>
      )}
      {extraButton}
      {showImportModal && (
        <div className="export-import-overlay" onClick={closeImportModal}>
          <div className="export-import-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{strings.importData}</h3>
            <p className="export-import-warning">{strings.importOverwriteWarning}</p>
            <div className="export-import-file">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="export-import-file-input"
              />
            </div>
            {importError && (
              <span className="export-import-error">
                {importError === 'invalid_json'
                  ? strings.importErrorInvalidJson
                  : strings.importErrorInvalidFormat}
              </span>
            )}
            <div className="export-import-modal-actions">
              <button type="button" onClick={closeImportModal}>
                {strings.cancel}
              </button>
              <button type="button" className="export-import-confirm" onClick={handleImport}>
                {strings.importData}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
