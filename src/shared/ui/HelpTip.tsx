import { useEffect, useId, useRef, useState } from 'react'

interface HelpTipProps {
  text: string
}

/**
 * Bulle d'aide pédagogique accessible : survol souris, clic/tap (mobile),
 * focus clavier, fermeture par Échap ou clic à l'extérieur.
 */
export function HelpTip({ text }: HelpTipProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLSpanElement>(null)
  const id = useId()

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <span className={`help-tip ${open ? 'help-tip-open' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="help-tip-btn"
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        aria-label="Aide"
        onClick={() => setOpen((v) => !v)}
      >
        ?
      </button>
      <span className="help-tip-bubble" role="tooltip" id={id}>
        {text}
      </span>
    </span>
  )
}
