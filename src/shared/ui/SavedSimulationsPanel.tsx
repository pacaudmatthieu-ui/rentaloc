import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import {
  listSavedSimulations,
  saveNamedSimulation,
  loadNamedSimulation,
  deleteNamedSimulation,
  renameNamedSimulation,
} from '../utils/storage'
import type { SavedSimulationMeta } from '../utils/storage'

type SaveEntry = {
  id: string
  name: string
  type: string
  updatedAt: string
}

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
  const { user, loading: authLoading, signInWithEmail, signOut } = useAuth()

  const [saves, setSaves] = useState<SaveEntry[]>([])
  const [saveName, setSaveName] = useState('')
  const [showSaveInput, setShowSaveInput] = useState(false)
  const [showList, setShowList] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)

  // Auth state
  const [showAuthForm, setShowAuthForm] = useState(false)
  const [authEmail, setAuthEmail] = useState('')
  const [authSending, setAuthSending] = useState(false)
  const [authSent, setAuthSent] = useState(false)

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg)
    setTimeout(() => setFeedbackMessage(null), 2500)
  }

  // Load saves from Supabase or localStorage
  const refresh = useCallback(async () => {
    if (user) {
      const { data } = await supabase
        .from('saved_simulations')
        .select('id, name, type, updated_at')
        .eq('type', type)
        .order('updated_at', { ascending: false })
      if (data) {
        setSaves(data.map((r) => ({
          id: r.id,
          name: r.name,
          type: r.type,
          updatedAt: r.updated_at,
        })))
      }
    } else {
      const local = listSavedSimulations(type)
      setSaves(local.map((s: SavedSimulationMeta) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        updatedAt: s.updatedAt,
      })))
    }
  }, [type, user])

  useEffect(() => {
    if (!authLoading) refresh()
  }, [authLoading, refresh])

  const handleSave = async () => {
    if (!saveName.trim()) return
    if (user) {
      await supabase.from('saved_simulations').insert({
        user_id: user.id,
        name: saveName.trim(),
        type,
        data: currentData,
      })
    } else {
      saveNamedSimulation(saveName.trim(), type, currentData)
    }
    setSaveName('')
    setShowSaveInput(false)
    await refresh()
    showFeedback(strings.savedSimSaveSuccess)
  }

  const handleLoad = async (id: string) => {
    if (user) {
      const { data } = await supabase
        .from('saved_simulations')
        .select('data')
        .eq('id', id)
        .single()
      if (data) {
        onLoad(data.data)
        showFeedback(strings.savedSimLoadSuccess)
      }
    } else {
      const data = loadNamedSimulation(id)
      if (data) {
        onLoad(data)
        showFeedback(strings.savedSimLoadSuccess)
      }
    }
  }

  const handleDelete = async (id: string) => {
    if (user) {
      await supabase.from('saved_simulations').delete().eq('id', id)
    } else {
      deleteNamedSimulation(id)
    }
    await refresh()
  }

  const handleRename = async (id: string) => {
    if (!editingName.trim()) return
    if (user) {
      await supabase
        .from('saved_simulations')
        .update({ name: editingName.trim(), updated_at: new Date().toISOString() })
        .eq('id', id)
    } else {
      renameNamedSimulation(id, editingName.trim())
    }
    setEditingId(null)
    setEditingName('')
    await refresh()
  }

  const handleSignIn = async () => {
    if (!authEmail.trim()) return
    setAuthSending(true)
    const { error } = await signInWithEmail(authEmail.trim())
    setAuthSending(false)
    if (error) {
      showFeedback(error)
    } else {
      setAuthSent(true)
    }
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="saved-simulations-panel">
      <div className="saved-sim-buttons">
        <button
          type="button"
          className="saved-sim-btn saved-sim-btn-save"
          onClick={() => { setShowSaveInput(!showSaveInput); setShowList(false); setShowAuthForm(false) }}
        >
          {strings.savedSimSave}
        </button>
        <button
          type="button"
          className="saved-sim-btn saved-sim-btn-list"
          onClick={() => { setShowList(!showList); setShowSaveInput(false); setShowAuthForm(false) }}
        >
          {strings.savedSimList} ({saves.length})
        </button>
        {!authLoading && (
          user ? (
            <div className="saved-sim-auth-status">
              <span className="saved-sim-user-email">{user.email}</span>
              <button type="button" className="saved-sim-btn saved-sim-btn-cancel" onClick={signOut}>
                {strings.savedSimSignOut}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="saved-sim-btn"
              onClick={() => { setShowAuthForm(!showAuthForm); setShowSaveInput(false); setShowList(false); setAuthSent(false) }}
            >
              {strings.savedSimSignIn}
            </button>
          )
        )}
      </div>

      {feedbackMessage && (
        <div className="saved-sim-feedback">{feedbackMessage}</div>
      )}

      {showAuthForm && !user && (
        <div className="saved-sim-auth-form">
          {authSent ? (
            <p className="saved-sim-auth-sent">{strings.savedSimCheckEmail}</p>
          ) : (
            <>
              <p className="saved-sim-auth-hint">{strings.savedSimSignInHint}</p>
              <div className="saved-sim-save-form">
                <input
                  type="email"
                  className="saved-sim-name-input"
                  placeholder={strings.savedSimEmailPlaceholder}
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
                  autoFocus
                />
                <button
                  type="button"
                  className="saved-sim-btn saved-sim-btn-confirm"
                  onClick={handleSignIn}
                  disabled={authSending}
                >
                  {authSending ? '...' : strings.savedSimSendLink}
                </button>
              </div>
            </>
          )}
        </div>
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
                      <button type="button" className="saved-sim-action" onClick={() => handleLoad(s.id)}>
                        {strings.savedSimLoad}
                      </button>
                      <button type="button" className="saved-sim-action" onClick={() => { setEditingId(s.id); setEditingName(s.name) }}>
                        {strings.savedSimRename}
                      </button>
                      <button type="button" className="saved-sim-action saved-sim-action-delete" onClick={() => handleDelete(s.id)}>
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
