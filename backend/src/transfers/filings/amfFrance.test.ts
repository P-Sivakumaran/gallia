import { describe, expect, it } from 'vitest'
import { classifyLyonTitle, isPlayerFilingTitle, parseLyonAnnouncementText } from './amfFrance.js'
import { normalizeFilingText, parseDecimal, parseEnglishDate } from './text.js'

// Synthetic releases in the shape of Olympique Lyonnais' English press releases, including the
// extractor's split glyphs. Players and figures are invented; no real filings are committed.
const day = new Date('2026-09-02T17:00:00Z')
const url = 'https://fr.ftp.opendatasoft.com/datadila/INFOFI/ACT/2026/09/SYNTHETIC.pdf'
const iso = (d: Date | null | undefined) => d?.toISOString().slice(0, 10) ?? null

describe('text helpers', () => {
  it('repairs split glyphs from the PDF extractor', () => {
    expect(normalizeFilingText('Austrian defender F e lix Bracke , from GD Estoril Praia')).toContain('Felix Bracke')
    expect(normalizeFilingText('Ainsley Maitland - Niles on a season - long loan')).toBe('Ainsley Maitland-Niles on a season-long loan')
    expect(normalizeFilingText('September 2 nd, 2026 - 6: 3 0 p.m.')).toBe('September 2nd, 2026 - 6:30 p.m.')
  })

  it('reads decimal commas and English dates', () => {
    expect(parseDecimal('4,3')).toBe(4.3)
    expect(parseDecimal('12,5')).toBe(12.5)
    expect(parseDecimal('1,250')).toBe(1250)
    expect(iso(parseEnglishDate('June 30th 2031'))).toBe('2031-06-30')
    expect(iso(parseEnglishDate('30 June 2030'))).toBe('2030-06-30')
    expect(iso(parseEnglishDate('June 30, 2029'))).toBe('2029-06-30')
    expect(iso(parseEnglishDate('June 2027'))).toBe('2027-06-30')
  })
})

describe('Lyon filing titles', () => {
  const ol = /^(?:OL|OLYMPIQUE LYONNAIS|LYON)$/i
  it('keeps English player filings and drops corporate and French ones', () => {
    expect(isPlayerFilingTitle('TRANSFER OF JEAN TESTARD TO SUNDERLAND')).toBe(true)
    expect(isPlayerFilingTitle('PIERRE EXEMPLE LOANED TO OLYMPIQUE LYONNAIS UNTIL JUNE 2027')).toBe(true)
    expect(isPlayerFilingTitle('TRANSFERT DE JEAN TESTARD A SUNDERLAND')).toBe(false)
    expect(isPlayerFilingTitle('PROPOSED TRANSFER OF LISTING TO EURONEXT GROWTH')).toBe(false)
    expect(isPlayerFilingTitle('CARLOS EXEMPLO APPOINTED NEW HEAD COACH OF OLYMPIQUE LYONNAIS')).toBe(false)
  })

  it('classifies direction and loan from the title', () => {
    expect(classifyLyonTitle('JEAN TESTARD LOANED TO OLYMPIQUE LYONNAIS UNTIL JUNE 2027', ol)).toMatchObject({ direction: 'acquisition', loan: true })
    expect(classifyLyonTitle('Pierre Exemple loaned to Getafe', ol)).toMatchObject({ direction: 'disposal', loan: true, counterparty: 'GETAFE' })
    expect(classifyLyonTitle('LUC MODELE TRANSFERRED TO AL DIRIYAH', ol)).toMatchObject({ direction: 'disposal', counterparty: 'AL DIRIYAH' })
    expect(classifyLyonTitle('MARC ESSAI EXTENDS HIS CONTRACT UNTIL 2029', ol)).toMatchObject({ direction: 'extension' })
  })
})

describe('parseLyonAnnouncementText', () => {
  it('reads a sale with a ceiling that includes bonuses and a sell-on', () => {
    const text = `1 PRESS RELEAsE Transfer of Jean Testard to Sunderland Wednesday, September 2 nd, 2026 - 1: 15 A M
      Olympique Lyonnais announces the transfer of its Belgian international forward Jean Testard to Sunderland for a fee
      that could reach €35.0 million, including €5.0 million in bonuses, plus a possible 12.5% sell - on clause on any
      future capital gain. Having joined OL on a free transfer in 2024, Jean Testard played 84 matches.`
    const f = parseLyonAnnouncementText(text, 'TRANSFER OF JEAN TESTARD TO SUNDERLAND', day, url)!
    expect(f).toMatchObject({ playerName: 'Jean Testard', counterpartyName: 'Sunderland', direction: 'disposal', transferType: 'permanent' })
    expect(f.feeAmount).toBe(30_000_000)
    expect(f.addOnsAmount).toBe(5_000_000)
    expect(f.details.maxTotal).toBe(35_000_000)
    expect(f.sellOnPercent).toBe(12.5)
    expect(f.feeStatus).toBe('disclosed')
  })

  it('reads a signing with fixed fee, add-on ceiling, sell-on and contract end', () => {
    const text = `1 PRESS RELEASE Austrian defender F e lix Bracke signs with OL until 2031 Sunday, 2 August 2026 - 10:00 A M
      Olympique Lyonnais announce s the signing of Austrian defender F e lix Bracke, from GD Estoril Praia, for 5 seasons,
      until June 30 th 2031. The transfer fee amounts to €4,3m, with a maximum of €0.8m in bonuses, and a 12,5% sell - on
      clause on any future capital gain. Aged 25, he joined Freiburg in 2019 for €2,0m.`
    const f = parseLyonAnnouncementText(text, 'Austrian defender FElix Bracke signs with OL until 2031', day, url)!
    expect(f).toMatchObject({ playerName: 'Felix Bracke', counterpartyName: 'GD Estoril Praia', direction: 'acquisition', transferType: 'permanent' })
    expect(f.feeAmount).toBe(4_300_000)
    expect(f.addOnsAmount).toBe(800_000)
    expect(f.sellOnPercent).toBe(12.5)
    expect(iso(f.contractExpiresOn)).toBe('2031-06-30')
  })

  it('reads a signing whose add-ons and sell-on come after the fee', () => {
    const text = `1 PRESS RELEAsE Japanese international Kenji Probe signs a 4 - year contract with OL
      Olympique Lyonnais is delighted to announce the arrival of Japanese international Kenji Probe from Stade de Reims, on a
      four - year contract until 30 June 2030. The transfer amounts to a fixed fee of €1.0 million, with variable add - ons
      that could reach a maximum of €19.0 million, plus a possible sell - on clause of up to 12.5% on any future capital gain.`
    const f = parseLyonAnnouncementText(text, 'JAPANESE INTERNATIONAL KENJI PROBE SIGNS A 4-YEAR CONTRACT WITH OL', day, url)!
    expect(f).toMatchObject({ playerName: 'Kenji Probe', counterpartyName: 'Stade de Reims', direction: 'acquisition' })
    expect(f.feeAmount).toBe(1_000_000)
    expect(f.addOnsAmount).toBe(19_000_000)
    expect(f.sellOnPercent).toBe(12.5)
    expect(iso(f.contractExpiresOn)).toBe('2030-06-30')
  })

  it('reads a loan in with a loan fee and no contract date', () => {
    const text = `1 PRESS RELEAsE PIERRE EXEMPLE JOINS OLYMPIQUE LYONNAIS UNTIL THE END OF THE SEASON
      Olympique Lyonnais is delighted to announce that an agreement has been reached with Juventus FC for the arrival of
      Belgian international striker Pierre Exemple on a season - long loan, with a loan fee of €3.5 million.`
    const f = parseLyonAnnouncementText(text, 'PIERRE EXEMPLE JOINS OLYMPIQUE LYONNAIS UNTIL THE END OF THE SEASON', day, url)!
    expect(f).toMatchObject({ playerName: 'Pierre Exemple', counterpartyName: 'Juventus FC', direction: 'acquisition', transferType: 'loan', isLoan: true })
    expect(f.feeAmount).toBe(3_500_000)
    expect(f.contractExpiresOn).toBeNull()
  })

  it('reads a loan in with an end date and no purchase option', () => {
    const text = `1 PRESS RELEAsE LUC MODELE LOANED TO OLYMPIQUE LYONNAIS UNTIL JUNE 2027 Friday, August 14, 2026 - 6:00 PM
      Olympique Lyonnais is pleased to announce the arrival of Swiss defender Luc Modele, who joins the club on loan from
      AC Milan until 30 June 2027, with no purchase option.`
    const f = parseLyonAnnouncementText(text, 'LUC MODELE LOANED TO OLYMPIQUE LYONNAIS UNTIL JUNE 2027', day, url)!
    expect(f).toMatchObject({ playerName: 'Luc Modele', counterpartyName: 'AC Milan', transferType: 'loan', loanOptionOrObligation: 'none' })
    expect(f.details.loanUntil).toBe('2027-06-30')
    expect(f.contractExpiresOn).toBeNull()
    expect(f.feeStatus).toBe('undisclosed')
  })

  it('reads a loan out with a purchase option', () => {
    const text = `1 PRESS RELEAsE Marc Essai loaned to Getafe Olympique Lyonnais announces the loan of Marc Essai to Getafe until
      30 June 2027, with a purchase option of €6.0 million.`
    const f = parseLyonAnnouncementText(text, 'Marc Essai loaned to Getafe', day, url)!
    expect(f).toMatchObject({ playerName: 'Marc Essai', counterpartyName: 'Getafe', direction: 'disposal', transferType: 'loan', loanOptionOrObligation: 'option' })
  })

  it('reads a contract extension as a contract event', () => {
    const text = `1 PRESS RELEAsE TOM PROTO EXTENDS HIS CONTRACT UNTIL 2029 Monday, July 6, 2026 - 6:00 p.m. Olympique Lyonnais is
      delighted to announce that club captain Tom Proto has signed a two - year contract extension, keeping him at his
      boyhood club until June 30, 2029. He joined Bayern Munich in 2017 until June 30, 2022.`
    const f = parseLyonAnnouncementText(text, 'TOM PROTO EXTENDS HIS CONTRACT UNTIL 2029', day, url)!
    expect(f).toMatchObject({ playerName: 'Tom Proto', direction: 'extension', transferType: 'unknown', counterpartyName: null })
    expect(iso(f.contractExpiresOn)).toBe('2029-06-30')
  })

  it('reads amounts the extractor ran together, and keeps club names like Milan intact', () => {
    const text = `1 Press release TRANSFER OF LUC MODELE Thursday, June 18, 2026 Olympique Lyonnais announces the transfer of Luc Modele
      to Bayer Leverkusen for a fee that couldreach€33.6million,including€4.1millioninadd-ons, as well as a 10% sell-on clause.
      HavingjoinedOLinthesummerof2025 from AC Milan for €2 million, he became a regular.`
    const f = parseLyonAnnouncementText(text, 'TRANSFER OF LUC MODELE', day, url)!
    expect(f).toMatchObject({ playerName: 'Luc Modele', direction: 'disposal', counterpartyName: 'Bayer Leverkusen' })
    expect(f.feeAmount).toBe(29_500_000)
    expect(f.addOnsAmount).toBe(4_100_000)
    expect(f.sellOnPercent).toBe(10)
  })

  it('treats an exercised purchase option as a permanent move with its fee and new contract', () => {
    const text = `1 PRESS RELEASE TRANSFER OF NOE SPECIMEN Wednesday, June 10, 2026 Olympique Lyonnais announces that it has exercised
      the purchase option for French U20 international Noe Specimen. Having arrived on loan from Paris Saint-Germain this winter,
      the defender is now under contract with the club through June 30, 2030. The permanent transfer fee amounts to €4.1 million,
      with a maximum of €2 million in bonuses and an additional 20% sell-on clause on any future capital gain.`
    const f = parseLyonAnnouncementText(text, 'TRANSFER OF NOE SPECIMEN', day, url)!
    expect(f).toMatchObject({ direction: 'acquisition', transferType: 'permanent', isLoan: false, counterpartyName: 'Paris Saint-Germain' })
    expect(f.feeAmount).toBe(4_100_000)
    expect(f.addOnsAmount).toBe(2_000_000)
    expect(iso(f.contractExpiresOn)).toBe('2030-06-30')
  })

  it('keeps a loan option price out of the fee', () => {
    const text = `1 PRESS RELEASE Ivan Muster loaned to OL with purchase option Olympique Lyonnais is delighted to announce the arrival of
      Ukrainian international striker Ivan Muster until June 30, 2026, on a loan deal worth €1.5 million, with a purchase option set at €5 million.`
    const f = parseLyonAnnouncementText(text, 'IVAN MUSTER LOANED TO OL WITH PURCHASE OPTION', day, url)!
    expect(f).toMatchObject({ direction: 'acquisition', transferType: 'loan', loanOptionOrObligation: 'option' })
    expect(f.feeAmount).toBe(1_500_000)
    expect(f.details.optionPrice).toBe(5_000_000)
    expect(f.details.loanUntil).toBe('2026-06-30')
  })

  it('falls back to the title when the PDF yields no text', () => {
    const f = parseLyonAnnouncementText('1 PRESS RELEASE', 'ENGLISH MIDFIELDER TOM SAMPLE JOINS OLYMPIQUE LYONNAIS UNTIL 2030', day, url)!
    expect(f).toMatchObject({ playerName: 'Tom Sample', direction: 'acquisition', transferType: 'permanent', feeStatus: 'unknown' })
    expect(iso(f.contractExpiresOn)).toBe('2030-06-30')
    expect(f.details.textExtracted).toBe(false)
    const out = parseLyonAnnouncementText('', 'OREL TEST ON LOAN TO EVERTON UNTIL THE END OF THE SEASON', day, url)!
    expect(out).toMatchObject({ playerName: 'Orel Test', direction: 'disposal', transferType: 'loan', counterpartyName: 'Everton' })
    const away = parseLyonAnnouncementText('', 'MAMA PROBE JOINS BREST', day, url)!
    expect(away).toMatchObject({ direction: 'disposal', counterpartyName: 'Brest' })
  })

  it('skips staff moves and releases that cover two moves', () => {
    expect(parseLyonAnnouncementText('Olympique Lyonnais announces the departure of Paul Coach from his role as head coach', 'PAUL COACH JOINS SPORTING PORTUGAL', day, url)).toBeNull()
    expect(parseLyonAnnouncementText('', "OL TRIGGER MARC ESSAI'S PURCHASE OPTION AHEAD OF HIS LOAN TO GETAFE", day, url)).toBeNull()
  })

  it('returns null for a filing that is not about a player move', () => {
    expect(parseLyonAnnouncementText('Disclosure of voting rights', 'DISCLOSURE OF TOTAL NUMBER OF VOTING RIGHTS', day, url)).toBeNull()
  })
})
