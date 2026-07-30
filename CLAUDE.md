# RentaLoc — Contexte pour Claude

Document de passation : tout ce qu'une nouvelle session doit savoir pour
continuer le travail. Dernière mise à jour : 30/07/2026 (après PR #12).

## Le projet et l'utilisateur

- **RentaLoc** : simulateur d'investissement locatif + bilan marchand de biens.
  React 19 + TypeScript + Vite 7, Supabase (auth magic-link + sauvegardes),
  Recharts, html2pdf.js, lz-string. Déployé sur **Vercel** (auto-deploy de
  `main`), embarqué sur https://jmacademie.com/simulateur-d-investissement-locatif/
- **Matthieu Pacaud** (pacaudmatthieu-ui, pacaudmatthieu@gmail.com) : fondateur
  de **JM Académie** (formation en investissement immobilier). **Non technique**
  — toujours lui répondre en français simple, sans jargon, avec des preuves
  visuelles (captures d'écran envoyées via SendUserFile).
- Objectif business : outil irréprochable (calculs fiscaux fiables) qui attire
  des prospects vers JM Académie.

## Méthode de travail établie (validée par Matthieu)

1. `git fetch origin main && git checkout -B claude/<nom-du-pack> origin/main`
   — le fetch est OBLIGATOIRE (on s'est déjà fait avoir avec un origin/main périmé)
2. Implémenter → `npx tsc --noEmit` → `npx vitest run` → `npm run build`
3. Smoke test Playwright headless + capture d'écran envoyée à Matthieu :
   - `npx vite preview --port 4173 &`
   - script : `import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs'`
     avec `chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })`
4. Commit avec message français détaillé → push → PR → **merge immédiat**
   (pattern accepté : « tu peux pousser ça sur la version en ligne ? » → on
   merge direct, Vercel déploie `main` en 1-2 min)
5. Réponse en français avec le résumé et la capture.

Historique : PRs #1 à #12 toutes fusionnées (moteur fiscal, refonte visuelle,
parité MDB, bulles d'aide, pack confiance, pack vitesse, pack croissance,
opt-in RGPD, PDF, pack réalisme, charges sans pré-remplissage, estimateur travaux).

## Contraintes CRITIQUES (ne jamais enfreindre)

- **Protection des élèves JM Académie** : `api/subscribe.ts` ne doit JAMAIS
  modifier un contact Systeme.io existant. Lookup par email d'abord ; s'il
  existe → retour `{status:'ok'}` sans rien toucher. Seuls les NOUVEAUX
  contacts sont créés + tagués « RentaLoc - Simulateur ».
- **Ne jamais interroger directement le Supabase de production** (REST/SQL) :
  le classificateur de permissions le bloque (« Production Reads »). Si besoin
  d'agir sur la base : écrire un script SQL idempotent que Matthieu colle dans
  le SQL Editor de Supabase.
- **Apostrophes françaises dans strings.ts** : toute chaîne française contenant
  une apostrophe doit être entre guillemets doubles (`"L'impôt…"`) — les quotes
  simples ont déjà cassé le build deux fois.
- Ne pas créer de PR sans la merger (sauf demande contraire) ; ne jamais
  pousser sur une autre branche que celle créée pour le pack.

## Architecture — fichiers clés

- `src/panels/rental-investment/lib/calculations.ts` — moteur locatif unique :
  `parseInputs → simulateYears → applyFiscalYear(FiscalState)` ; revente via
  `computeSaleEvent` (frais de revente + IRA + impôt PV + CRD) consommé par le
  TRI, le graphique annuel et le tableau. Tous les régimes : micro-foncier,
  réel foncier/SCI IR, LMNP micro-BIC, LMNP réel (art. 39C), SCI IS, bailleur privé.
- `src/entities/finance/fiscal.ts` — constantes/fonctions fiscales 2026 :
  PFU 31,4 % (dividendes, depuis 01/01/2026), PS immo 17,2 %, IS 15/25 %
  (seuil 42 500 €), déficit foncier 10 700 € (art. 156), réintégration
  amortissements LMNP (LF 2025, art. 150 VB III), surtaxe PV (art. 1609 nonies G),
  frais de cession déductibles (art. 150 VA), IRA = min(6 mois d'intérêts,
  3 % du CRD) (art. L313-47).
- `src/panels/property-flip/lib/computeFlipResults.ts` — moteur MDB unifié
  (TVA sur marge art. 268 CGI, TVA récupérable, quote-part déductible).
- `src/panels/rental-investment/model/types.ts` — `SimulationFormValues`
  (tout en string) + `INITIAL_VALUES`. Champs de charges VIDES par défaut
  (choix de Matthieu : pas de pré-remplissage, budgets estimés dans les bulles) ;
  vacance et gestion à 0. Champs optionnels récents : `chargesRevaluationPercent`,
  `resaleFeesPercent`, `annualCFE`, `annualAccountingFees`, `surfaceM2`.
- `src/panels/rental-investment/model/presets.ts` — 3 exemples complets
  (studio 25 m², T2 45 m², immeuble 160 m²) qui, eux, restent pré-remplis.
- `src/panels/rental-investment/ui/RentalPanelPage.tsx` — panneau locatif ;
  contient l'estimateur travaux (3 typologies : 200/550/1100 €/m² × surface).
- `src/shared/i18n/strings.ts` — ~600 clés FR/EN. Toute string UI passe par là.
- `src/shared/ui/` — FormField (champ vide = valide = 0), HelpTip (bulles,
  position:fixed), VerdictBar, SavedSimulationsPanel (opt-in newsletter à la
  connexion → /api/subscribe).
- `src/features/export-pdf/report.ts` — rapport PDF brandé (pagebreak CSS,
  détail d'acquisition) ; `src/features/share-link/lib.ts` — partage par lien
  (lz-string `#s=…`).
- `api/subscribe.ts` — capture email → Systeme.io (protection élèves, voir plus haut).
- `api/keepalive.ts` + `vercel.json` — cron quotidien 6h UTC qui ping Supabase
  (évite la mise en pause du projet gratuit après 7 jours → « load failed »).
- Tests : `npx vitest run` — 57 tests (3 fichiers). Dans
  `calculations.test.ts`, `makeValues()` neutralise explicitement tous les
  champs (y compris les champs Réalisme à '0') : la modifier avec précaution.

## Intégrations externes (IDs à connaître)

- **Supabase** : projet `yrruaymlqncyltkgticg` (URL et clé publishable
  hardcodées dans `src/shared/lib/supabase.ts` — c'est la clé publique, OK).
  RLS activée sur `saved_simulations` (4 policies `auth.uid() = user_id`).
- **Systeme.io** (connecteur MCP dispo) : tag « RentaLoc - Simulateur »
  = **2079709** ; tag « Bienvenue - JM Académie » (porte d'entrée de la séquence
  de bienvenue) = **2075599** ; règle d'automatisation RentaLoc→Bienvenue
  = **2353104** (créée par Claude, active). La clé API est dans Vercel
  (`SYSTEME_IO_API_KEY`) — ne jamais la demander en chat.
- **Vercel** : projet lié au repo, auto-deploy `main`, previews sur PR.
  Un doublon `rentaloc-rmnu` existe peut-être encore (à supprimer par Matthieu).
- **GitHub MCP** pour les PR/merges (pas de gh CLI en environnement distant).

## Environnement de vérification

- Lint : 23 erreurs PRÉEXISTANTES (react-hooks compiler dans App.tsx et
  FlipPanelPage) — ne pas s'alarmer, vérifier seulement qu'on n'en ajoute pas.
- Proxy réseau : jmacademie.com et *.vercel.app souvent bloqués en WebFetch ;
  `curl https://rentaloc.vercel.app/api/...` fonctionne pour tester les
  fonctions serveur.

## Reste à faire / idées en attente

- Matthieu doit tester le PDF sur son téléphone (correctif PR #9).
- Éventuellement : étendre l'estimateur travaux au panneau marchand de biens ;
  ajuster les ratios €/m² si Matthieu fournit les siens.
- Vérification en conditions réelles de la chaîne prospect (email inconnu →
  contact créé + 2 tags + premier email de la séquence de bienvenue).
