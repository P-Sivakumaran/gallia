import { describe, expect, it } from 'vitest'
import { htmlToText, isPlayerSaleHeadline, parseParkenSale } from './dkOam.js'

// Synthetic notices in the shape of PARKEN Sport & Entertainment's inside-information announcements.
// Players and figures are invented; no real filings are committed.
const day = new Date('2025-07-23T10:00:00Z')
const url = 'https://saesappublicprd.blob.core.windows.net/stc-public-submissions/2025/07/x/documents/SYNTHETIC-da.html'

describe('Danish OAM sale notices', () => {
  it('keeps sale notices and drops rumours and non-football sales', () => {
    expect(isPlayerSaleHeadline('Salg af kontraktrettighed - Anders Prøve')).toBe(true)
    expect(isPlayerSaleHeadline('Salg af Anders Prøve er endeligt')).toBe(true)
    expect(isPlayerSaleHeadline('Der er dags dato konstateret rygter i markedet om en mulig transfer af fodboldspilleren Anders Prøve')).toBe(false)
    expect(isPlayerSaleHeadline('Salg af vindmølleparken Gehlenberg')).toBe(false)
    expect(isPlayerSaleHeadline('Forventninger til 2026')).toBe(false)
  })

  it('reads buyer and profit-before-tax effect from a Danish notice', () => {
    const text = htmlToText(`<p>F.C. København har indgået aftale om salg af kontraktrettigheden på Anders Prøve til FUTEBOL CLUBE DO PORTO.
      Salget vil have en positiv virkning på resultat før skat for 2025 på ca. 137 mio. kr.</p>
      <p>PARKEN Sport &amp; Entertainment A/S fastholder forventningerne til 2025 om et resultat før skat på 100 til 150 mio. kr.</p>`)
    const f = parseParkenSale(text, 'Salg af kontraktrettighed - Anders Prøve', day, url)!
    expect(f).toMatchObject({ playerName: 'Anders Prøve', counterpartyName: 'Futebol Clube Do Porto', direction: 'disposal', feeStatus: 'undisclosed', feeAmount: null })
    expect(f.details.profitBeforeTaxImpact).toEqual({ year: 2025, amount: 137_000_000, currency: 'DKK' })
    expect(f.details.conditional).toBe(false)
  })

  it('marks a conditional sale and stops the club name at the comma', () => {
    const text = 'F.C. København har indgået aftale om salg af kontraktrettigheden på Bo Eksempel til REAL SOCIEDAD DE FÚTBOL, S.A.D. Aftalen indeholder enkelte betingelser, som alle forventes opfyldt.'
    const f = parseParkenSale(text, 'Salg af kontraktrettighed - Bo Eksempel', day, url)!
    expect(f).toMatchObject({ playerName: 'Bo Eksempel', counterpartyName: 'Real Sociedad De Fútbol' })
    expect(f.details.conditional).toBe(true)
  })

  it('reads a completion notice, dropping the nationality adjective and the date', () => {
    const f = parseParkenSale('Betingelserne for salget af Jens Test nu er opfyldt. Jens Test skifter til tyske VfL Wolfsburg pr. 31. januar 2022.', 'Salg af kontraktrettighed', day, url)!
    expect(f).toMatchObject({ playerName: 'Jens Test', counterpartyName: 'VfL Wolfsburg' })
    const g = parseParkenSale('alle betingelserne for salget af Lars Proto til Galatasaray Sportif A.S. nu er opfyldt, og salget er dermed endeligt. Salget forventes at have en positiv virkning på resultat før skat for 2024 på ca. 63 mio. kr.', 'Salg af Lars Proto er endeligt', day, url)!
    expect(g).toMatchObject({ playerName: 'Lars Proto', counterpartyName: 'Galatasaray Sportif A.S' })
    expect(g.details.profitBeforeTaxImpact).toEqual({ year: 2024, amount: 63_000_000, currency: 'DKK' })
  })

  it('reads an English notice', () => {
    const text = 'F.C. Copenhagen has entered into an agreement on the sale of the contract rights for Anders Prøve to FUTEBOL CLUBE DO PORTO. The sale will have a positive effect on profit before tax for 2025 of approx. DKK 137 million.'
    const f = parseParkenSale(text, 'Sale of contract rights - Anders Prøve', day, url)!
    expect(f).toMatchObject({ playerName: 'Anders Prøve', counterpartyName: 'Futebol Clube Do Porto' })
    expect(f.details.profitBeforeTaxImpact).toEqual({ year: 2025, amount: 137_000_000, currency: 'DKK' })
  })

  it('takes the name from the title, before any comma, when the body has none', () => {
    const f = parseParkenSale('Betingelserne er opfyldt.', 'Salg af kontraktrettighed - Ole Probe, betingelser opfyldt Ole Probe', day, url)!
    expect(f.playerName).toBe('Ole Probe')
    expect(f.counterpartyName).toBeNull()
  })

  it('skips rumour notices', () => {
    expect(parseParkenSale('rygter i markedet', 'Rygter i markedet', day, url)).toBeNull()
  })
})
