import { useState } from 'react'
import './App.css'
import type { Locale } from './shared/types'
import { STRINGS } from './shared/i18n/strings'
import { RentalPanelPage } from './panels/rental-investment'
import { FlipPanelPage } from './panels/property-flip'
import type { AppSection } from './shared/types'

function App() {
  const [locale, setLocale] = useState<Locale>('fr')
  const [appSection, setAppSection] = useState<AppSection>('investissement_locatif')

  const strings = STRINGS[locale]

  return (
    <div className="app-root">
      <header className="app-header">
        <div>
          <h1>{strings.title}</h1>
          <p className="app-subtitle">{strings.subtitle}</p>
          <div className="section-tabs">
            <button
              type="button"
              className={`section-tab ${appSection === 'investissement_locatif' ? 'section-tab-active' : ''}`}
              onClick={() => setAppSection('investissement_locatif')}
            >
              {strings.sectionInvestissementLocatif}
            </button>
            <button
              type="button"
              className={`section-tab ${appSection === 'marchand_de_biens' ? 'section-tab-active' : ''}`}
              onClick={() => setAppSection('marchand_de_biens')}
            >
              {strings.sectionMarchandDeBiens}
            </button>
          </div>
        </div>
        <div className="language-switcher">
          <label className="field-label" htmlFor="language-select">
            {strings.languageLabel}
          </label>
          <select
            id="language-select"
            className="language-select"
            value={locale}
            onChange={(event) => setLocale(event.target.value as Locale)}
          >
            <option value="en">{strings.languageEnglish}</option>
            <option value="fr">{strings.languageFrench}</option>
          </select>
        </div>
      </header>

      {appSection === 'marchand_de_biens' ? (
        <FlipPanelPage locale={locale} strings={STRINGS[locale]} />
      ) : (
        <RentalPanelPage locale={locale} strings={STRINGS[locale]} />
      )}
    </div>
  )
}

export default App
