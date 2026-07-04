import { useState } from 'react'

const DISMISS_KEY = 'rentaloc_lead_dismissed'
const DONE_KEY = 'rentaloc_lead_done'

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function writeFlag(key: string): void {
  try {
    localStorage.setItem(key, '1')
  } catch {
    // stockage indisponible : la carte réapparaîtra, sans gravité
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

interface EmailCaptureCardProps {
  strings: Record<string, string>
}

/**
 * Carte « Allez plus loin avec JM Académie » : envoie l'email vers Systeme.io
 * via la fonction serveur /api/subscribe (les élèves existants ne sont jamais
 * modifiés côté Systeme.io — voir api/subscribe.ts).
 * Refusable d'un clic, disparaît définitivement après inscription.
 */
export function EmailCaptureCard({ strings }: EmailCaptureCardProps) {
  const [hidden, setHidden] = useState(() => readFlag(DISMISS_KEY) || readFlag(DONE_KEY))
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  if (hidden) return null

  const submit = async () => {
    const trimmed = email.trim()
    if (!EMAIL_RE.test(trimmed) || state === 'sending') return
    setState('sending')
    try {
      const resp = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      })
      if (!resp.ok) throw new Error(String(resp.status))
      setState('done')
      writeFlag(DONE_KEY)
    } catch {
      setState('error')
    }
  }

  const dismiss = () => {
    writeFlag(DISMISS_KEY)
    setHidden(true)
  }

  if (state === 'done') {
    return (
      <div className="lead-capture-card lead-capture-done" role="status">
        <span>✅ {strings.leadSuccess}</span>
      </div>
    )
  }

  return (
    <div className="lead-capture-card">
      <button type="button" className="lead-capture-dismiss" onClick={dismiss} aria-label={strings.leadDismiss}>
        ✕
      </button>
      <div className="lead-capture-text">
        <strong>{strings.leadTitle}</strong>
        <span>{strings.leadSubtitle}</span>
      </div>
      <div className="lead-capture-form">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={strings.leadPlaceholder}
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (state === 'error') setState('idle') }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          aria-label={strings.leadPlaceholder}
        />
        <button type="button" onClick={submit} disabled={state === 'sending' || !EMAIL_RE.test(email.trim())}>
          {state === 'sending' ? '…' : strings.leadButton}
        </button>
      </div>
      {state === 'error' && <span className="lead-capture-error" role="alert">{strings.leadError}</span>}
      <span className="lead-capture-consent">{strings.leadConsent}</span>
    </div>
  )
}
