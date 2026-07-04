/**
 * Capture d'email du simulateur → Systeme.io (fonction serveur Vercel).
 *
 * RÈGLE DE PROTECTION DES ÉLÈVES : si l'email existe déjà dans Systeme.io
 * (élève, client, contact connu…), on ne touche à RIEN — ni tag, ni séquence.
 * Seuls les contacts NOUVEAUX sont créés et tagués « RentaLoc - Simulateur »,
 * tag sur lequel brancher la séquence d'emails prospects.
 *
 * Configuration requise (Vercel → Settings → Environment Variables) :
 *   SYSTEME_IO_API_KEY = clé API Systeme.io (Paramètres → API publique)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

const SYSTEME_API = 'https://api.systeme.io/api'
const RENTALOC_TAG_NAME = 'RentaLoc - Simulateur'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

async function sio(apiKey: string, path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${SYSTEME_API}${path}`, {
    ...init,
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }

  const apiKey = process.env.SYSTEME_IO_API_KEY
  if (!apiKey) {
    res.status(503).json({ error: 'not_configured' })
    return
  }

  const email = String(req.body?.email ?? '').trim().toLowerCase()
  if (!EMAIL_RE.test(email) || email.length > 254) {
    res.status(400).json({ error: 'invalid_email' })
    return
  }

  try {
    // 1. Le contact existe-t-il déjà ? (élève / client / contact connu)
    const lookup = await sio(apiKey, `/contacts?email=${encodeURIComponent(email)}`)
    if (!lookup.ok) throw new Error(`lookup ${lookup.status}`)
    const existing = (await lookup.json()) as { items?: unknown[] }
    if (existing.items && existing.items.length > 0) {
      // Contact connu → on ne modifie RIEN (protection des élèves actuels).
      // Réponse identique au cas « créé » pour ne pas révéler si un email
      // est déjà dans la base.
      res.status(200).json({ status: 'ok' })
      return
    }

    // 2. Création du nouveau contact
    const created = await sio(apiKey, '/contacts', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
    if (!created.ok) throw new Error(`create ${created.status}`)
    const contact = (await created.json()) as { id: number }

    // 3. Récupération du tag « RentaLoc - Simulateur » (par nom, robuste si l'id change)
    const tagsResp = await sio(apiKey, `/tags?query=${encodeURIComponent(RENTALOC_TAG_NAME)}`)
    if (!tagsResp.ok) throw new Error(`tags ${tagsResp.status}`)
    const tags = (await tagsResp.json()) as { items?: { id: number; name: string }[] }
    let tagId = tags.items?.find((t) => t.name === RENTALOC_TAG_NAME)?.id

    if (!tagId) {
      const newTag = await sio(apiKey, '/tags', {
        method: 'POST',
        body: JSON.stringify({ name: RENTALOC_TAG_NAME }),
      })
      if (!newTag.ok) throw new Error(`create tag ${newTag.status}`)
      tagId = ((await newTag.json()) as { id: number }).id
    }

    // 4. Assignation du tag → déclenche la séquence prospects côté Systeme.io
    const tagged = await sio(apiKey, `/contacts/${contact.id}/tags`, {
      method: 'POST',
      body: JSON.stringify({ tagId }),
    })
    if (!tagged.ok) throw new Error(`assign tag ${tagged.status}`)

    res.status(200).json({ status: 'ok' })
  } catch (error) {
    console.error('subscribe error:', error)
    res.status(502).json({ error: 'upstream_error' })
  }
}
