// Becker & Hickl .asc photon lists (text).
//
// Ported from asc_file_import in legacy/point/focuspoint/import_methods/import_methods.py.
// That function was written for Python 2 (it compares bytes lines with str
// literals, so it does not run under Python 3); this follows its Python 2
// behaviour. See docs/porting-notes.md in the FoCuS-Fit-Pro repository.

FocusCore.define('io/asc', ['io/records', 'io/text'], function (records, text) {
  'use strict'

  /**
   * Read a whole .asc file.
   * Header lines starting "Macro" give the macro-time unit (the number after
   * ':' and before ','); lines starting "Micro" give the micro-time
   * resolution. After the line starting "End of info header", one more line
   * is skipped, then each line is "macrotime dtime <unused> channel",
   * separated by single spaces.
   * @param {ArrayBuffer|Uint8Array} data the file contents
   * @returns {object} records as described in io/records;
   *   trueTime = macrotime * macro unit, resolution = micro-time value from
   *   the header (units as written in the file)
   */
  function readAsc (data) {
    const all = text.lines(text.bytesToText(data))
    const out = records.createPhotonArrays(1 << 16)
    let macro_time
    let micro_time
    let readHeader = true
    for (let i = 0; i < all.length; i++) {
      const line = all[i]
      if (readHeader) {
        if (line.slice(0, 5) === 'Macro') macro_time = text.pyFloat(line.split(':')[1].split(',')[0], 'asc Macro')
        if (line.slice(0, 5) === 'Micro') micro_time = text.pyFloat(line.split(':')[1], 'asc Micro')
        if (line.slice(0, 18) === 'End of info header') {
          readHeader = false
          i++ // skips blank line
        }
        continue
      }
      const v = line.split(' ')
      if (v.length < 4) throw new Error(`asc: line ${i + 1} has fewer than 4 fields`)
      out.push(text.pyInt(v[3], 'asc channel'), text.pyInt(v[0], 'asc macrotime'), text.pyInt(v[1], 'asc dtime'))
    }
    if (macro_time === undefined) throw new Error('asc: no "Macro" line in the header')
    if (micro_time === undefined) throw new Error('asc: no "Micro" line in the header')
    const res = out.result(micro_time)
    for (let i = 0; i < res.length; i++) res.trueTime[i] = res.trueTime[i] * macro_time
    return res
  }

  return { readAsc }
})
