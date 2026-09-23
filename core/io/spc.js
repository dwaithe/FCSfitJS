// Becker & Hickl .spc files (SPC-130/830 FIFO format).
//
// Ported from spc_file_import in legacy/point/focuspoint/import_methods/import_methods.py.

FocusCore.define('io/spc', ['io/records'], function (records) {
  'use strict'

  const HEADER_BYTES = 4

  /**
   * Read the 4-byte .spc header.
   * @returns {{macroTime: number, headerBytes: number}} macroTime = first byte * 0.1
   *   (the macro-time clock period; the Python treats it as ns)
   */
  function parseSpcHeader (data) {
    const bytes = records.toBytes(data)
    if (bytes.length < HEADER_BYTES) throw new Error('spc: file too short for its header')
    return { macroTime: bytes[0] * 0.1, headerBytes: HEADER_BYTES }
  }

  /**
   * Decoder for .spc records. Invalid photons are dropped; a macro-time
   * overflow flag adds 4096 even on an invalid record, as in the Python.
   * trueTime = (macrotime + overflow) * macroTime, dTime = 4095 - ADC value.
   * @returns {{push: function(Uint8Array), finish: function(): object}}
   *   finish() gives resolution = null (the Python returns None)
   */
  function createSpcDecoder (header) {
    const out = records.createPhotonArrays(1 << 16)
    const macro_time = header.macroTime
    let overflow = 0
    const stream = records.createUint32Stream(function (rec) {
      const byte0 = rec & 0xFF
      const byte1 = (rec >>> 8) & 0xFF
      const byte2 = (rec >>> 16) & 0xFF
      const byte3 = (rec >>> 24) & 0xFF
      const INVALID = (byte3 >> 7) & 1
      const MTOV = (byte3 >> 6) & 1
      if (MTOV === 1) {
        overflow += 4096
        records.assertSafe(overflow, 'spc overflow')
      }
      if (INVALID !== 1) {
        const chan = byte1 >> 4
        const trueTime = (((byte1 & 0x0F) << 8) | byte0) + overflow
        const dtime = 4095 - (((byte3 & 0x0F) << 8) | byte2)
        out.push(chan, trueTime * macro_time, dtime)
      }
    })
    return {
      push: (chunk) => stream.push(chunk),
      finish () {
        if (stream.leftover) throw new Error('spc: file ends part-way through a record')
        return out.result(null)
      }
    }
  }

  /**
   * Read a whole .spc file.
   * @param {ArrayBuffer|Uint8Array} data the file contents
   * @returns {object} records as described in io/records; trueTime in
   *   macro-time units * macroTime (ns)
   */
  function readSpc (data) {
    const bytes = records.toBytes(data)
    const header = parseSpcHeader(bytes)
    const dec = createSpcDecoder(header)
    dec.push(bytes.subarray(header.headerBytes))
    return dec.finish()
  }

  return { parseSpcHeader, createSpcDecoder, readSpc }
})
