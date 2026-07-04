import { useEffect, useId, useRef, useState } from 'react'

interface HelpTipProps {
  text: string
}

const BUBBLE_WIDTH = 260

/**
 * Bulle d'aide pédagogique accessible : survol souris, clic/tap (mobile),
 * focus clavier, fermeture par Échap, clic à l'extérieur ou défilement.
 * Positionnée en `fixed` pour ne jamais être rognée par un conteneur
 * à défilement (tableaux, cartes…).
 */
export function HelpTip({ text }: HelpTipProps) {
  const [pos, setPos] = useState<{ top: number; left: number; below: boolean } | null>(null)
  const rootRef = useRef<HTMLSpanElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const id = useId()
  const open = pos !== null

  const openBubble = () => {
    const rect = btnRef.current?.getBoundingClientRect()
    if (!rect) return
    const below = rect.top < 140
    const half = BUBBLE_WIDTH / 2
    const left = Math.min(Math.max(rect.left + rect.width / 2, half + 8), window.innerWidth - half - 8)
    setPos({
      top: below ? rect.bottom + 8 : rect.top - 8,
      left,
      below,
    })
  }

  const close = () => setPos(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    const onScroll = () => close()
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open])

  return (
    <span
      className="help-tip"
      ref={rootRef}
      onMouseEnter={openBubble}
      onMouseLeave={close}
    >
      <button
        type="button"
        ref={btnRef}
        className={`help-tip-btn ${open ? 'help-tip-btn-open' : ''}`}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        aria-label="Aide"
        onClick={() => (open ? close() : openBubble())}
        onBlur={close}
      >
        ?
      </button>
      {open && (
        <span
          role="tooltip"
          id={id}
          className="help-tip-bubble"
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            transform: pos.below ? 'translateX(-50%)' : 'translate(-50%, -100%)',
            width: BUBBLE_WIDTH,
          }}
        >
          {text}
        </span>
      )}
    </span>
  )
}
