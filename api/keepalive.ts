/**
 * Maintien en éveil du projet Supabase (fonction serveur Vercel + cron).
 *
 * Le plan gratuit Supabase met le projet en pause après ~7 jours sans
 * activité, ce qui casse la connexion et les simulations sauvegardées.
 * Ce cron (vercel.json) envoie une requête légère chaque jour : la RLS
 * empêche de lire quoi que ce soit sans être connecté, mais la requête
 * compte comme de l'activité et suffit à garder le projet actif.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

const SUPABASE_URL = 'https://yrruaymlqncyltkgticg.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_yhrN5vDGiKZfu4Jwb_GXzw_OARinPOd'

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/saved_simulations?select=id&limit=1`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      },
    )
    res.status(200).json({ ok: true, supabaseStatus: r.status })
  } catch {
    res.status(200).json({ ok: false })
  }
}
