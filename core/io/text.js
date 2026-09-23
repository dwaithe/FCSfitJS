// Helpers for the text photon formats (.asc, time-tag .csv): Python-style
// number parsing, so the JS accepts and rejects the same fields as int() and
// float() in the legacy importers.

FocusCore.define('io/text', ['io/records'], function (records) {
  'use strict'

  /** Bytes to string, one character per byte (as Python 2 str). */
  function bytesToText (data) {
    const bytes = records.toBytes(data)
    let s = ''
    const CHUNK = 0x8000
    for (let i = 0; i < bytes.length; i += CHUNK) {
      s += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK))
    }
    return s
  }

  /** Python int(s): optional surrounding whitespace, optional sign, digits. */
  function pyInt (s, what) {
    const t = String(s).trim()
    if (!/^[+-]?\d+(_\d+)*$/.test(t)) throw new Error(`${what}: invalid integer ${JSON.stringify(s)}`)
    const v = Number(t.replace(/_/g, ''))
    records.assertSafe(Math.abs(v), what)
    return v
  }

  /** Python float(s). */
  function pyFloat (s, what) {
    const t = String(s).trim()
    const lower = t.toLowerCase()
    if (/^[+-]?(inf|infinity)$/.test(lower)) return lower.startsWith('-') ? -Infinity : Infinity
    if (/^[+-]?nan$/.test(lower)) return NaN
    if (!/^[+-]?((\d+(_\d+)*)?\.?\d+(_\d+)*|\d+(_\d+)*\.)([eE][+-]?\d+)?$/.test(t)) {
      throw new Error(`${what}: invalid number ${JSON.stringify(s)}`)
    }
    return Number(t.replace(/_/g, ''))
  }

  /** Split text into lines as Python readline() would, without the final empty piece. */
  function lines (text) {
    const out = text.split('\n')
    if (out.length && out[out.length - 1] === '') out.pop()
    return out
  }

  return { bytesToText, pyInt, pyFloat, lines }
})
