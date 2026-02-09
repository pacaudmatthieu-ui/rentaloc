import React, { useRef, useState } from 'react'
import { exportToJson, validateImportPayload } from '../lib'
import { exportPdfFromElement } from '../../export-pdf/lib'
import type { ExportSection } from '../lib'

interface ExportImportPanelProps<T> {
  section: ExportSection
  data: T
  onImport: (data: T) => void
  validateData: (d: unknown) => d is T
  strings: Record<string, string>
  extraButton?: React.ReactNode
  pdfContentRef?: React.RefObject<HTMLElement | null>
}

export function ExportImportPanel<T>({
  section,
  data,
  onImport,
  validateData,
  strings,
  extraButton,
  pdfContentRef,
}: ExportImportPanelProps<T>) {
  const [showImportModal, setShowImportModal] = useState(false)
  const [captchaA, setCaptchaA] = useState(0)
  const [captchaB, setCaptchaB] = useState(0)
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const [captchaError, setCaptchaError] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = () => {
    exportToJson(section, data)
  }

  const handleExportPdf = () => {
    const el = pdfContentRef?.current
    if (!el) return
    exportPdfFromElement(el, { section })
  }

  const openImportModal = () => {
    setShowImportModal(true)
    setCaptchaA(Math.floor(Math.random() * 9) + 1)
    setCaptchaB(Math.floor(Math.random() * 9) + 1)
    setCaptchaAnswer('')
    setCaptchaError(false)
    setImportError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const closeImportModal = () => {
    setShowImportModal(false)
  }

  const handleImport = () => {
    setCaptchaError(false)
    setImportError(null)
    const expected = captchaA + captchaB
    if (String(expected) !== captchaAnswer.trim()) {
      setCaptchaError(true)
      return
    }
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
      {pdfContentRef && (
        <button type="button" className="export-import-btn" onClick={handleExportPdf}>
          {strings.exportPdf}
        </button>
      )}
      {extraButton}
      {showImportModal && (
        <div className="export-import-overlay" onClick={closeImportModal}>
          <div className="export-import-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{strings.importData}</h3>
            <div className="export-import-captcha">
              <label>
                {strings.captchaLabel} {captchaA} + {captchaB} ?
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder={strings.captchaPlaceholder}
                value={captchaAnswer}
                onChange={(e) => setCaptchaAnswer(e.target.value)}
                className={captchaError ? 'export-import-input-error' : ''}
              />
              {captchaError && (
                <span className="export-import-error">{strings.captchaError}</span>
              )}
            </div>
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
