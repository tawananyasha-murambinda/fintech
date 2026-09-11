import { describe, it, expect } from 'vitest'
import { escapeCsvField, toCsv, exportFilename } from '../csv'

describe('escapeCsvField', () => {
  it('leaves ordinary values alone', () => {
    expect(escapeCsvField('Tesco')).toBe('Tesco')
    expect(escapeCsvField(12.5)).toBe('12.5')
  })

  it('quotes fields containing a comma, quote or newline', () => {
    expect(escapeCsvField('Smith, John')).toBe('"Smith, John"')
    expect(escapeCsvField('He said "hi"')).toBe('"He said ""hi"""')
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"')
  })

  it('neutralises formula injection', () => {
    // A merchant named "=cmd|..." would execute when the file is opened in a
    // spreadsheet. This is the bug that keeps turning up in expense tools.
    expect(escapeCsvField('=1+1')).toBe("'=1+1")
    expect(escapeCsvField('+44 7700')).toBe("'+44 7700")
    expect(escapeCsvField('-cmd')).toBe("'-cmd")
    expect(escapeCsvField('@SUM(A1)')).toBe("'@SUM(A1)")
  })

  it('quotes a dangerous field that also needs quoting', () => {
    expect(escapeCsvField('=cmd,"x"')).toBe('"\'=cmd,""x"""')
  })

  it('leaves real numbers alone, including negative amounts', () => {
    // Quoting these would make every debit import as text, not a number.
    expect(escapeCsvField('-12.50')).toBe('-12.50')
    expect(escapeCsvField(-12.5)).toBe('-12.5')
    expect(escapeCsvField('+3')).toBe('+3')
  })

  it('renders null and undefined as empty', () => {
    expect(escapeCsvField(null)).toBe('')
    expect(escapeCsvField(undefined)).toBe('')
  })
})

describe('toCsv', () => {
  it('writes a header row and CRLF line endings', () => {
    const csv = toCsv([{ Date: '2026-06-01', Amount: '-12.50' }])
    expect(csv).toBe('Date,Amount\r\n2026-06-01,-12.50')
  })

  it('keeps column order stable across rows', () => {
    const csv = toCsv(
      [
        { a: 1, b: 2 },
        { b: 4, a: 3 },
      ],
      ['a', 'b']
    )
    expect(csv.split('\r\n')[2]).toBe('3,4')
  })

  it('returns nothing for no rows', () => {
    expect(toCsv([])).toBe('')
  })
})

describe('exportFilename', () => {
  it('dates the file so downloads sort chronologically', () => {
    expect(exportFilename('fintrack-transactions', new Date('2026-06-15T10:00:00Z'))).toBe(
      'fintrack-transactions-2026-06-15.csv'
    )
  })
})
