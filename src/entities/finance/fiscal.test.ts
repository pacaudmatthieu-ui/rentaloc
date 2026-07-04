import { describe, expect, it } from 'vitest'
import {
  computeIS,
  computeMarginalIS,
  computePVParticuliers,
  computeSurtaxePV,
} from './fiscal'

describe('computeIS — barème IS 15 % / 25 %', () => {
  it('applique 15 % sous le seuil de 42 500 €', () => {
    expect(computeIS(40000)).toBeCloseTo(6000, 2)
  })
  it('applique 25 % au-delà du seuil', () => {
    // 42 500 × 15 % + 57 500 × 25 % = 6 375 + 14 375
    expect(computeIS(100000)).toBeCloseTo(20750, 2)
  })
  it('retourne 0 pour un résultat négatif ou nul', () => {
    expect(computeIS(0)).toBe(0)
    expect(computeIS(-5000)).toBe(0)
  })
})

describe('computeMarginalIS — la tranche à 15 % ne se consomme qu’une fois par exercice', () => {
  it('taxe le gain au taux marginal quand le résultat courant a épuisé la tranche réduite', () => {
    // Résultat courant 42 500 € (tranche 15 % épuisée) + gain 10 000 € → gain taxé à 25 %
    expect(computeMarginalIS(42500, 10000)).toBeCloseTo(2500, 2)
  })
  it('laisse le gain profiter du reliquat de tranche à 15 %', () => {
    // Résultat courant 20 000 € → il reste 22 500 € de tranche 15 %
    // Gain 30 000 € → 22 500 × 15 % + 7 500 × 25 % = 3 375 + 1 875
    expect(computeMarginalIS(20000, 30000)).toBeCloseTo(5250, 2)
  })
  it('retourne 0 sans gain', () => {
    expect(computeMarginalIS(50000, 0)).toBe(0)
  })
})

describe('computeSurtaxePV — art. 1609 nonies G du CGI (barème légal)', () => {
  it('est nulle jusqu’à 50 000 €', () => {
    expect(computeSurtaxePV(50000)).toBe(0)
  })
  it('applique le lissage de la première tranche : PV 55 000 € → 850 €', () => {
    // 2 % × 55 000 − (60 000 − 55 000) × 1/20 = 1 100 − 250 = 850
    expect(computeSurtaxePV(55000)).toBeCloseTo(850, 2)
  })
  it('applique 2 % de la PV ENTIÈRE entre 60 et 100 k€', () => {
    expect(computeSurtaxePV(80000)).toBeCloseTo(1600, 2)
  })
  it('applique le lissage 100-110 k€ avec le coefficient 1/10', () => {
    // 3 % × 105 000 − (110 000 − 105 000) × 1/10 = 3 150 − 500 = 2 650
    expect(computeSurtaxePV(105000)).toBeCloseTo(2650, 2)
  })
  it('applique 6 % au-delà de 260 k€', () => {
    expect(computeSurtaxePV(300000)).toBeCloseTo(18000, 2)
  })
})

describe('computePVParticuliers — plus-value des particuliers', () => {
  it('sans abattement avant 6 ans de détention', () => {
    // PV 80 000 € : IR 19 % = 15 200, PS 17,2 % = 13 760, surtaxe(80 000) = 1 600
    expect(computePVParticuliers(230000, 150000, 5)).toBeCloseTo(30560, 2)
  })
  it('exonère l’IR après 22 ans et les PS après 30 ans', () => {
    const after22 = computePVParticuliers(300000, 100000, 23)
    // Seuls les PS restent (avec abattement partiel)
    expect(after22).toBeGreaterThan(0)
    expect(computePVParticuliers(300000, 100000, 31)).toBe(0)
  })
  it('réintègre les amortissements LMNP déduits (LF 2025, art. 150 VB III)', () => {
    // Sans réintégration : PV = 200 000 − 150 000 = 50 000 → IR 9 500 + PS 8 600 = 18 100
    const sans = computePVParticuliers(200000, 150000, 5, 0)
    expect(sans).toBeCloseTo(18100, 2)
    // Avec 30 000 € d'amortissements déduits : PV = 200 000 − 120 000 = 80 000
    const avec = computePVParticuliers(200000, 150000, 5, 30000)
    expect(avec).toBeCloseTo(30560, 2)
    expect(avec).toBeGreaterThan(sans)
  })
  it('retourne 0 en moins-value', () => {
    expect(computePVParticuliers(100000, 150000, 5)).toBe(0)
  })
})
