// PicoQuant PicoHarp .pt3 files (T3 mode), and the PicoHarp T3 record
// decoder used inside .ptu files.
//
// Ported from legacy/point/focuspoint/import_methods/import_methods.py:
//   pt3import  -> readPt3 / createPt3Decoder
//   ReadPT3    -> createPicoHarpT3Decoder (used by io/ptu)
// The two Python functions differ (see docs/porting-notes.md in the FoCuS-Fit-Pro repository); each is
// reproduced as written.

FocusCore.define('io/pt3', ['io/records'], function (records) {
  'use strict'

  const T3WRAPAROUND = 65536

  // Byte offsets in the fixed .pt3 header, following the field-by-field reads
  // in pt3import (text header, then 4-byte fields).
  const OFFSET = {
    Resolution: 584, // float32, ns
    CntRate0: 704, // int32, sync rate in Hz
    Records: 720, // int32, number of records
    ImgHdrSize: 724 // int32
  }
  const FIXED_HEADER_BYTES = 728

  /**
   * Read the .pt3 header.
   * @param {ArrayBuffer|Uint8Array} data at least the first 728 bytes (+ ImgHdrSize)
   * @returns {{resolution: number, cntRate0: number, syncPeriod: number,
   *   records: number, imgHdrSize: number, headerBytes: number}}
   *   resolution in ns (float32 as stored), syncPeriod in ns (1e9 / CntRate0)
   */
  function parsePt3Header (data) {
    const bytes = records.toBytes(data)
    if (bytes.length < FIXED_HEADER_BYTES) throw new Error('pt3: file too short for its header')
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    const resolution = view.getFloat32(OFFSET.Resolution, true)
    const cntRate0 = view.getInt32(OFFSET.CntRate0, true)
    const recordCount = view.getInt32(OFFSET.Records, true)
    const imgHdrSize = view.getInt32(OFFSET.ImgHdrSize, true)
    // pt3import reads ImgHdrSize bytes after the header when it is > 0.
    const headerBytes = FIXED_HEADER_BYTES + (imgHdrSize > 0 ? imgHdrSize : 0)
    return {
      resolution,
      cntRate0,
      syncPeriod: 1e9 / cntRate0,
      records: recordCount,
      imgHdrSize,
      headerBytes
    }
  }

  /**
   * Decoder for the records of a .pt3 file (pt3import). Every record is kept,
   * including overflow and marker records (channel 15), as in the Python.
   * trueTime (ns) = (overflow + nsync) * syncPeriod + dtime * resolution;
   * dtime is only set for channels 1-4, otherwise 0.
   * @param {object} header from parsePt3Header
   * @returns {{push: function(Uint8Array), finish: function(): object}}
   */
  function createPt3Decoder (header) {
    const out = records.createPhotonArrays(header.records)
    const syncperiod = header.syncPeriod
    const Resolution = header.resolution
    let ofltime = 0
    const stream = records.createUint32Stream(function (T3Record, b) {
      if (b >= header.records) return // pt3import reads exactly Records records
      const nsync = T3Record & 65535
      const chan = (T3Record >>> 28) & 15
      let dtime = 0
      if (chan >= 1 && chan <= 4) {
        dtime = (T3Record >>> 16) & 4095
      } else if (chan === 15) {
        const markers = (T3Record >>> 16) & 15
        if (markers === 0) {
          ofltime = ofltime + T3WRAPAROUND
          records.assertSafe(ofltime, 'pt3 overflow time')
        }
      }
      const truensync = ofltime + nsync
      const truetime = (truensync * syncperiod) + (dtime * Resolution)
      out.push(chan, truetime, dtime)
    })
    return {
      push: (chunk) => stream.push(chunk),
      finish () {
        if (stream.count < header.records) {
          throw new Error(`pt3: file ended after ${stream.count} of ${header.records} records`)
        }
        return out.result(Resolution)
      }
    }
  }

  /**
   * Read a whole .pt3 file.
   * @param {ArrayBuffer|Uint8Array} data the file contents
   * @returns {object} records as described in io/records; trueTime in ns,
   *   resolution in ns (the header's float32 Resolution)
   */
  function readPt3 (data) {
    const bytes = records.toBytes(data)
    const header = parsePt3Header(bytes)
    const dec = createPt3Decoder(header)
    dec.push(bytes.subarray(header.headerBytes))
    return dec.finish()
  }

  /**
   * Decoder for PicoHarp T3 records inside a .ptu file (ReadPT3). Unlike
   * pt3import, only photon records are kept (overflows and markers are
   * dropped) and trueTime has no micro-time term.
   * trueTime (ns) = (overflow + nsync) * globalResolution * 1e9.
   * @param {{records: number, globalResolution: number, resolution: number}} header
   *   globalResolution and resolution in s (PTU MeasDesc_* tags)
   * @returns {{push: function(Uint8Array), finish: function(): object}}
   *   finish() gives resolution = MeasDesc_Resolution * 1e9 (ns)
   */
  function createPicoHarpT3Decoder (header) {
    const out = records.createPhotonArrays(header.records)
    const GlobalResolution = header.globalResolution
    let oflcorrection = 0
    const stream = records.createUint32Stream(function (rec, recNum) {
      if (recNum >= header.records) return
      const channel = (rec >>> 28) & 15
      const dtime = (rec >>> 16) & 4095
      const nsync = rec & 65535
      if (channel === 15) {
        if (dtime === 0) { // not a marker, so overflow
          oflcorrection += T3WRAPAROUND
          records.assertSafe(oflcorrection, 'ptu overflow count')
        }
        // markers are not stored
      } else {
        const truensync = oflcorrection + nsync
        const truetime = truensync * GlobalResolution * 1e9
        out.push(channel, truetime, dtime)
      }
    })
    return {
      push: (chunk) => stream.push(chunk),
      finish () {
        if (stream.count < header.records) {
          throw new Error(`ptu: file ended after ${stream.count} of ${header.records} records`)
        }
        return out.result(header.resolution * 1e9)
      }
    }
  }

  return { parsePt3Header, createPt3Decoder, readPt3, createPicoHarpT3Decoder, FIXED_HEADER_BYTES }
})
