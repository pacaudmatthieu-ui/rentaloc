import { Component, useEffect, useRef, useState } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

class ErrorBoundary extends Component<
  { children: ReactNode; message: string; retryLabel: string },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('React crash:', error, info)
  }
  render() {
    if (this.state.error) {
      return (
        <div className="app-error-fallback" role="alert">
          <p>{this.props.message}</p>
          <button type="button" onClick={() => this.setState({ error: null })}>
            {this.props.retryLabel}
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
import './App.css'
import type { Locale } from './shared/types'
import { STRINGS } from './shared/i18n/strings'
import { RentalPanelPage } from './panels/rental-investment'
import { FlipPanelPage } from './panels/property-flip'
import { ComparisonPanelPage } from './panels/comparison'
import type { AppSection } from './shared/types'
import {
  loadRentalSimulation,
  loadPropertyFlippingSimulation,
  saveRentalSimulation,
  savePropertyFlippingSimulation,
  saveUserLanguage,
  loadUserLanguage,
  saveCurrentSimulationComparisonId,
  saveUiMode,
  loadUiMode,
} from './shared/utils/storage'
import type { SimulationFormValues } from './panels/rental-investment/model/types'
import type { MarchandDeBiensValues } from './panels/property-flip/model/types'

export type UiMode = 'simple' | 'expert'

function App() {
  // Load saved language preference or default to 'fr'
  const [locale, setLocale] = useState<Locale>(() => {
    const saved = loadUserLanguage()
    return (saved === 'en' || saved === 'fr') ? saved : 'fr'
  })
  const [appSection, setAppSection] = useState<AppSection>('investissement_locatif')

  // Mode Essentiel / Expert : les utilisateurs existants (simulation déjà
  // enregistrée) restent en Expert, les nouveaux découvrent le mode Essentiel.
  const [uiMode, setUiMode] = useState<UiMode>(() => {
    const saved = loadUiMode()
    if (saved) return saved
    return loadRentalSimulation<SimulationFormValues>() ? 'expert' : 'simple'
  })
  const handleUiModeChange = (mode: UiMode) => {
    setUiMode(mode)
    saveUiMode(mode)
  }

  // Track initial values for each simulation type
  const [rentalInitialValues, setRentalInitialValues] = useState<SimulationFormValues | null>(null)
  const [propertyFlippingInitialValues, setPropertyFlippingInitialValues] = useState<MarchandDeBiensValues | null>(null)

  // Refs to access current values from child components
  const rentalValuesRef = useRef<SimulationFormValues | null>(null)
  const propertyFlippingValuesRef = useRef<MarchandDeBiensValues | null>(null)

  // Load saved data when switching sections
  useEffect(() => {
    if (appSection === 'investissement_locatif') {
      const saved = loadRentalSimulation<SimulationFormValues>()
      setRentalInitialValues(saved)
    } else if (appSection === 'marchand_de_biens') {
      const saved = loadPropertyFlippingSimulation<MarchandDeBiensValues>()
      setPropertyFlippingInitialValues(saved)
    }
    // Comparison panel doesn't need to load simulation data
  }, [appSection])

  // Handle opening simulation from comparison panel
  const handleOpenSimulation = (simulationData: SimulationFormValues | MarchandDeBiensValues, type: 'rental' | 'property-flipping', comparisonId?: string) => {
    if (type === 'rental') {
      const rentalData = simulationData as SimulationFormValues
      saveRentalSimulation(rentalData)
      setRentalInitialValues(rentalData)
      if (comparisonId) {
        saveCurrentSimulationComparisonId(comparisonId)
      }
      setAppSection('investissement_locatif')
    } else {
      const flipData = simulationData as MarchandDeBiensValues
      savePropertyFlippingSimulation(flipData)
      setPropertyFlippingInitialValues(flipData)
      if (comparisonId) {
        saveCurrentSimulationComparisonId(comparisonId)
      }
      setAppSection('marchand_de_biens')
    }
  }

  const strings = STRINGS[locale]

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="app-header-main">
          <div className="app-brand">
            <div className="app-logo-mark" aria-hidden="true">JM</div>
            <div>
              <h1>RentaLoc</h1>
              <p className="app-subtitle">{strings.brandBy}</p>
            </div>
          </div>
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
            <button
              type="button"
              className={`section-tab ${appSection === 'comparison' ? 'section-tab-active' : ''}`}
              onClick={() => setAppSection('comparison')}
            >
              {strings.comparisonPanel}
            </button>
          </div>
        </div>
        <div className="app-header-side">
          {appSection === 'investissement_locatif' && (
            <div className="mode-toggle" role="group" aria-label="Mode">
              <button
                type="button"
                className={uiMode === 'simple' ? 'mode-toggle-active' : ''}
                onClick={() => handleUiModeChange('simple')}
              >
                {strings.modeSimple}
              </button>
              <button
                type="button"
                className={uiMode === 'expert' ? 'mode-toggle-active' : ''}
                onClick={() => handleUiModeChange('expert')}
              >
                {strings.modeExpert}
              </button>
            </div>
          )}
          <div className="language-switcher">
            <label className="field-label" htmlFor="language-select">
              {strings.languageLabel}
            </label>
            <select
              id="language-select"
              className="language-select"
              value={locale}
              onChange={(event) => {
                const newLocale = event.target.value as Locale
                setLocale(newLocale)
                saveUserLanguage(newLocale)
              }}
            >
              <option value="en">{strings.languageEnglish}</option>
              <option value="fr">{strings.languageFrench}</option>
            </select>
          </div>
        </div>
      </header>

      <ErrorBoundary message={strings.errorFallbackMessage} retryLabel={strings.errorFallbackRetry}>
        {appSection === 'comparison' ? (
          <ComparisonPanelPage
            locale={locale}
            strings={STRINGS[locale]}
            onOpenSimulation={handleOpenSimulation}
          />
        ) : appSection === 'marchand_de_biens' ? (
          <FlipPanelPage
            locale={locale}
            strings={STRINGS[locale]}
            initialValues={propertyFlippingInitialValues}
            valuesRef={propertyFlippingValuesRef}
          />
        ) : (
          <RentalPanelPage
            locale={locale}
            strings={STRINGS[locale]}
            initialValues={rentalInitialValues}
            valuesRef={rentalValuesRef}
            uiMode={uiMode}
            onRequestExpertMode={() => handleUiModeChange('expert')}
          />
        )}
      </ErrorBoundary>
    </div>
  )
}

export default App
