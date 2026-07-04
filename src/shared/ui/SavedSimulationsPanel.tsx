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
  const [listLoading, setListLoading] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saving, setSaving] = useState(false)
  const [showSaveInput, setShowSaveInput] = useState(false)
  const [showList, setShowList] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  /** Suppression en deux temps : premier clic → demande de confirmation */
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [feedbackIsError, setFeedbackIsError] = useState(false)

  // Auth state
  const [showAuthForm, setShowAuthForm] = useState(false)
  const [authEmail, setAuthEmail] = useState('')
  const [authSending, setAuthSending] = useState(false)
  const [authSent, setAuthSent] = useState(false)
  const [authNewsletterOptIn, setAuthNewsletterOptIn] = useState(false)

  const showFeedback = (msg: string, isError = false) => {
    setFeedbackMessage(msg)
    setFeedbackIsError(isError)
    setTimeout(() => setFeedbackMessage(null), isError ? 4000 : 2500)
  }

  // Load saves from Supabase or localStorage.
  // Les erreurs réseau sont signalées (avant : silencieusement ignorées).
  const refresh = useCallback(async (): Promise<boolean> => {
    if (user) {
      setListLoading(true)
      // .eq('user_id') en ceinture de sécurité, en plus des policies RLS côté serveur
      const { data, error } = await supabase
        .from('saved_simulations')
        .select('id, name, type, updated_at')
        .eq('user_id', user.id)
        .eq('type', type)
        .order('updated_at', { ascending: false })
      setListLoading(false)
      if (error) {
        console.error('Error loading saved simulations:', error)
        showFeedback(strings.savedSimError, true)
        return false
      }
      setSaves((data ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        updatedAt: r.updated_at,
      })))
      return true
    }
    const local = listSavedSimulations(type)
    setSaves(local.map((s: SavedSimulationMeta) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      updatedAt: s.updatedAt,
    })))
    return true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, user, strings])

  useEffect(() => {
    if (authLoading) return
    // Évite d'écraser l'état avec une réponse périmée si le composant se
    // démonte ou si l'utilisateur change pendant la requête
    let cancelled = false
    const run = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('saved_simulations')
          .select('id, name, type, updated_at')
          .eq('user_id', user.id)
          .eq('type', type)
          .order('updated_at', { ascending: false })
        if (cancelled) return
        if (error) {
          console.error('Error loading saved simulations:', error)
          return
        }
        setSaves((data ?? []).map((r) => ({
          id: r.id,
          name: r.name,
          type: r.type,
          updatedAt: r.updated_at,
        })))
      } else {
        const local = listSavedSimulations(type)
        if (cancelled) return
        setSaves(local.map((s: SavedSimulationMeta) => ({
          id: s.id,
          name: s.name,
          type: s.type,
          updatedAt: s.updatedAt,
        })))
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [authLoading, user, type])

  const handleSave = async () => {
    if (!saveName.trim() || saving) return
    setSaving(true)
    try {
      if (user) {
        const { error } = await supabase.from('saved_simulations').insert({
          user_id: user.id,
          name: saveName.trim(),
          type,
          data: currentData,
        })
        if (error) {
          console.error('Error saving simulation:', error)
          showFeedback(strings.savedSimError, true)
          return
        }
      } else {
        const meta = saveNamedSimulation(saveName.trim(), type, currentData)
        if (!meta) {
          showFeedback(strings.savedSimStorageError, true)
          return
        }
      }
      // Le succès n'est annoncé QUE si la sauvegarde a réellement abouti
      setSaveName('')
      setShowSaveInput(false)
      await refresh()
      showFeedback(strings.savedSimSaveSuccess)
    } finally {
      setSaving(false)
    }
  }

  const handleLoad = async (id: string) => {
    if (user) {
      const { data, error } = await supabase
        .from('saved_simulations')
        .select('data')
        .eq('user_id', user.id)
        .eq('id', id)
        .single()
      if (error || !data) {
        console.error('Error loading simulation:', error)
        showFeedback(strings.savedSimError, true)
        return
      }
      onLoad(data.data)
      showFeedback(strings.savedSimLoadSuccess)
    } else {
      const data = loadNamedSimulation(id)
      if (data) {
        onLoad(data)
        showFeedback(strings.savedSimLoadSuccess)
      } else {
        showFeedback(strings.savedSimError, true)
      }
    }
  }

  const handleDeleteConfirmed = async (id: string) => {
    setConfirmingDeleteId(null)
    if (user) {
      const { error } = await supabase
        .from('saved_simulations')
        .delete()
        .eq('user_id', user.id)
        .eq('id', id)
      if (error) {
        console.error('Error deleting simulation:', error)
        showFeedback(strings.savedSimError, true)
        return
      }
    } else {
      if (!deleteNamedSimulation(id)) {
        showFeedback(strings.savedSimStorageError, true)
        return
      }
    }
    await refresh()
    showFeedback(strings.savedSimDeleted)
  }

  const handleRename = async (id: string) => {
    if (!editingName.trim()) return
    if (user) {
      const { error } = await supabase
        .from('saved_simulations')
        .update({ name: editingName.trim(), updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('id', id)
      if (error) {
        console.error('Error renaming simulation:', error)
        showFeedback(strings.savedSimError, true)
        return
      }
    } else {
      if (!renameNamedSimulation(id, editingName.trim())) {
        showFeedback(strings.savedSimStorageError, true)
        return
      }
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
      showFeedback(error, true)
    } else {
      setAuthSent(true)
      // Opt-in marketing EXPLICITE (RGPD) : uniquement si la case est cochée.
      // Même circuit protégé que la carte email : les contacts déjà présents
      // dans Systeme.io (élèves, clients) ne sont jamais modifiés.
      if (authNewsletterOptIn) {
        fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authEmail.trim() }),
        }).catch(() => {
          // Échec silencieux : la connexion reste prioritaire, l'inscription
          // marketing ne doit jamais la bloquer
        })
      }
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
          onClick={() => { setShowList(!showList); setShowSaveInput(false); setShowAuthForm(false); setConfirmingDeleteId(null) }}
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
        <div className={`saved-sim-feedback ${feedbackIsError ? 'saved-sim-feedback-error' : ''}`} role="status">
          {feedbackMessage}
        </div>
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
              <label className="form-field form-field-checkbox saved-sim-optin">
                <input
                  type="checkbox"
                  checked={authNewsletterOptIn}
                  onChange={(e) => setAuthNewsletterOptIn(e.target.checked)}
                />
                <span>{strings.savedSimNewsletterOptIn}</span>
              </label>
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
          <button type="button" className="saved-sim-btn saved-sim-btn-confirm" onClick={handleSave} disabled={saving}>
            {saving ? '…' : strings.savedSimConfirm}
          </button>
          <button type="button" className="saved-sim-btn saved-sim-btn-cancel" onClick={() => setShowSaveInput(false)}>
            {strings.cancel}
          </button>
        </div>
      )}

      {showList && (
        <div className="saved-sim-list">
          {listLoading ? (
            <p className="saved-sim-empty">{strings.savedSimLoading}</p>
          ) : saves.length === 0 ? (
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
                ) : confirmingDeleteId === s.id ? (
                  <div className="saved-sim-delete-confirm" role="alertdialog" aria-label={strings.savedSimDeleteConfirm}>
                    <span className="saved-sim-delete-question">
                      {strings.savedSimDeleteConfirm} <strong>{s.name}</strong>
                    </span>
                    <div className="saved-sim-actions">
                      <button
                        type="button"
                        className="saved-sim-action saved-sim-action-delete"
                        onClick={() => handleDeleteConfirmed(s.id)}
                      >
                        {strings.savedSimDeleteYes}
                      </button>
                      <button type="button" className="saved-sim-action" onClick={() => setConfirmingDeleteId(null)}>
                        {strings.cancel}
                      </button>
                    </div>
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
                      <button type="button" className="saved-sim-action saved-sim-action-delete" onClick={() => setConfirmingDeleteId(s.id)}>
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
