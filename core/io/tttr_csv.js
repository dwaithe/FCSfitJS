// FoCuS time-tag .csv files ("pt uncorrelated", version 2).
//
// Ported from csvimport in legacy/point/focuspoint/import_methods/import_methods.py.
// That function uses Python 2's reader.next(), so it does not run under
// Python 3; this follows its Python 2 behaviour. Not to be confused with the
// correlated-curve .csv files read by scripts/impt_csv.js.

FocusCore.define('io/tttr_csv', ['io/records', 'io/text'], function (records, text) {
  'use strict'

  /**
   * Read a whole time-tag .csv file:
   *   version,2
   *   type,pt uncorrelated
   *   <label>,<resolution>
   *   channel,trueTime,dTime    (one row per photon)
   *   ...
   *   end
   * @param {ArrayBuffer|Uint8Array} data the file contents
   * @returns {object} records as described in io/records; trueTime and
   *   resolution in the units written in the file
   */
  function readTttrCsv (data) {
    const rows = text.lines(text.bytesToText(data)).map((l) => l.replace(/\r$/, '').split(','))
    let r = 0
    const next = () => {
      if (r >= rows.length) throw new Error('csv: file ended before the "end" line')
      return rows[r++]
    }
    const lineOne = next()
    if (!(lineOne.length > 1 && text.pyFloat(lineOne[1], 'csv version') === 2)) {
      throw new Error(`csv: version not known: ${lineOne[1]}`)
    }
    const type = next()[1]
    if (type !== 'pt uncorrelated') throw new Error(`csv: type not recognised: ${type}`)
    const Resolution = text.pyFloat(next()[1], 'csv resolution')
    const out = records.createPhotonArrays(1 << 16)
    let line = next()
    while (line[0] !== 'end') {
      out.push(text.pyInt(line[0], 'csv channel'), text.pyFloat(line[1], 'csv trueTime'), text.pyInt(line[2], 'csv dTime'))
      line = next()
    }
    return out.result(Resolution)
  }

  return { readTttrCsv }
})
