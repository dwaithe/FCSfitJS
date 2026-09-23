// PicoQuant PicoHarp .pt2 files (T2 mode).
//
// Ported from pt2import in legacy/point/focuspoint/import_methods/import_methods.py.
// The header layout is the one pt2import reads, identical to .pt3.

FocusCore.define('io/pt2', ['io/records', 'io/pt3'], function (records, pt3) {
  'use strict'

  const WRAPAROUND = 210698240
  const RESOL = 4e-12 // s, PicoHarp T2 time tag resolution (4 ps)

  /**
   * Decoder for the records of a .pt2 file. Every record is kept.
   * channel = record channel + 1 (so overflow/marker records are 16),
   * trueTime (ns) = ((overflow + timetag) * 4e-12) * 1e9, dTime = 0.
   * @param {object} header from io/pt3 parsePt3Header
   * @returns {{push: function(Uint8Array), finish: function(): object}}
   *   finish() gives resolution = the header's float32 Resolution
   */
  function createPt2Decoder (header) {
    const out = records.createPhotonArrays(header.records)
    let ofltime = 0
    const stream = records.createUint32Stream(function (T2Record, b) {
      if (b >= header.records) return
      const T2time = T2Record & 268435455
      const chan = (T2Record >>> 28) & 15
      if (chan === 15) {
        const markers = T2Record & 15
        if (markers === 0) {
          ofltime = ofltime + WRAPAROUND
          records.assertSafe(ofltime, 'pt2 overflow time')
        }
      }
      const time = T2time + ofltime
      out.push(chan + 1, (time * RESOL) * 1000000000, 0)
    })
    return {
      push: (chunk) => stream.push(chunk),
      finish () {
        if (stream.count < header.records) {
          throw new Error(`pt2: file ended after ${stream.count} of ${header.records} records`)
        }
        return out.result(header.resolution)
      }
    }
  }

  /**
   * Read a whole .pt2 file.
   * @param {ArrayBuffer|Uint8Array} data the file contents
   * @returns {object} records as described in io/records; trueTime in ns
   */
  function readPt2 (data) {
    const bytes = records.toBytes(data)
    const header = pt3.parsePt3Header(bytes)
    const dec = createPt2Decoder(header)
    dec.push(bytes.subarray(header.headerBytes))
    return dec.finish()
  }

  return { createPt2Decoder, readPt2, parsePt2Header: pt3.parsePt3Header }
})
