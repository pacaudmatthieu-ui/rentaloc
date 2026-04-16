import { useCallback, useEffect, useState } from 'react'
import {
  listSavedSimulations,
  saveNamedSimulation,
  loadNamedSimulation,
  deleteNamedSimulation,
  renameNamedSimulation,
} from '../utils/storage'
import type { SavedSimulationMeta } from '../utils/storage'

interface SavedSimulationsPanelProps {
  type: 'rental' | 'property-flipping'
  currentData: unknown
  onLoad: (data: unknown) => void
  strings: Record<string, string>
}

export function SavedSimulationsPanel({
  type,
  currentData,
  onLoad,
  strings,
}: SavedSimulationsPanelProps) {
  const [saves, setSaves] = useState<SavedSimulationMeta[]>([])
  const [saveName, setSaveName] = useState('')
  const [showSaveInput, setShowSaveInput] = useState(false)
  const [showList, setShowList] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)

  const refresh = useCallback(() => {
    setSaves(listSavedSimulations(type))
  }, [type])

  useEffect(() => {
    refresh()
  }, [refresh])

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg)
    setTimeout(() => setFeedbackMessage(null), 2000)
  }

  const handleSave = () => {
    if (!saveName.trim()) return
    saveNamedSimulation(saveName.trim(), type, currentData)
    setSaveName('')
    setShowSaveInput(false)
    refresh()
    showFeedback(strings.savedSimSaveSuccess)
  }

  const handleLoad = (id: string) => {
    const data = loadNamedSimulation(id)
    if (data) {
      onLoad(data)
      showFeedback(strings.savedSimLoadSuccess)
    }
  }

  const handleDelete = (id: string) => {
    deleteNamedSimulation(id)
    refresh()
  }

  const handleRename = (id: string) => {
    if (!editingName.trim()) return
    renameNamedSimulation(id, editingName.trim())
    setEditingId(null)
    setEditingName('')
    refresh()
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="saved-simulations-panel">
      <div className="saved-sim-buttons">
        <button
          type="button"
          className="saved-sim-btn saved-sim-btn-save"
          onClick={() => { setShowSaveInput(!showSaveInput); setShowList(false) }}
        >
          {strings.savedSimSave}
        </button>
        <button
          type="button"
          className="saved-sim-btn saved-sim-btn-list"
          onClick={() => { setShowList(!showList); setShowSaveInput(false) }}
        >
          {strings.savedSimList} ({saves.length})
        </button>
      </div>

      {feedbackMessage && (
        <div className="saved-sim-feedback">{feedbackMessage}</div>
      )}

      {showSaveInput && (
        <div className="saved-sim-save-form">
          <input
            type="text"
            className="saved-sim-name-input"
            placeholder={strings.savedSimNamePlaceholder}
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            autoFocus
          />
          <button type="button" className="saved-sim-btn saved-sim-btn-confirm" onClick={handleSave}>
            {strings.savedSimConfirm}
          </button>
          <button type="button" className="saved-sim-btn saved-sim-btn-cancel" onClick={() => setShowSaveInput(false)}>
            {strings.cancel}
          </button>
        </div>
      )}

      {showList && (
        <div className="saved-sim-list">
          {saves.length === 0 ? (
            <p className="saved-sim-empty">{strings.savedSimEmpty}</p>
          ) : (
            saves.map((s) => (
              <div key={s.id} className="saved-sim-item">
                {editingId === s.id ? (
                  <div className="saved-sim-rename-form">
                    <input
                      type="text"
                      className="saved-sim-name-input"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRename(s.id)}
                      autoFocus
                    />
                    <button type="button" className="saved-sim-btn saved-sim-btn-confirm" onClick={() => handleRename(s.id)}>OK</button>
                    <button type="button" className="saved-sim-btn saved-sim-btn-cancel" onClick={() => setEditingId(null)}>
                      {strings.cancel}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="saved-sim-info">
                      <span className="saved-sim-name">{s.name}</span>
                      <span className="saved-sim-date">{formatDate(s.updatedAt)}</span>
                    </div>
                    <div className="saved-sim-actions">
                      <button type="button" className="saved-sim-action" onClick={() => handleLoad(s.id)} title={strings.savedSimLoad}>
                        {strings.savedSimLoad}
                      </button>
                      <button type="button" className="saved-sim-action" onClick={() => { setEditingId(s.id); setEditingName(s.name) }} title={strings.savedSimRename}>
                        {strings.savedSimRename}
                      </button>
                      <button type="button" className="saved-sim-action saved-sim-action-delete" onClick={() => handleDelete(s.id)} title={strings.savedSimDelete}>
                        {strings.savedSimDelete}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
