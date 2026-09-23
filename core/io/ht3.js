// HydraHarp / TimeHarp 260 / MultiHarp T3 records, as found in .ptu files.
//
// Ported from ReadHT3 in legacy/point/focuspoint/import_methods/import_methods.py.

FocusCore.define('io/ht3', ['io/records'], function (records) {
  'use strict'

  const T3WRAPAROUND = 1024

  /**
   * Decoder for HydraHarp-style T3 records (ReadHT3). Only photon records
   * are kept; special records carry overflows and markers.
   * channel = record channel + 1 (as the Python), dTime = TCSPC bin,
   * trueTime (ns) = (overflow + nsync) * globalResolution * 1e9.
   * @param {number} version 1 for HydraHarp V1 (each overflow record counts
   *   once), 2 otherwise (an overflow record carries its count in nsync)
   * @param {{records: number, globalResolution: number, resolution: number}} header
   *   globalResolution and resolution in s (PTU MeasDesc_* tags)
   * @returns {{push: function(Uint8Array), finish: function(): object}}
   *   finish() gives resolution = MeasDesc_Resolution * 1e6, as the Python
   *   returns it (note: 1e6 here, 1e9 for PicoHarp T3)
   */
  function createHydraHarpT3Decoder (version, header) {
    const out = records.createPhotonArrays(header.records)
    const GlobalResolution = header.globalResolution
    let OverflowCorrection = 0
    const stream = records.createUint32Stream(function (rec, recNum) {
      if (recNum >= header.records) return
      const special = (rec >>> 31) & 1
      const channel = (rec >>> 25) & 63
      const dtime = (rec >>> 10) & 32767
      const nsync = rec & 1023
      if (special === 1) {
        if (channel === 63) {
          if (nsync === 0 || version === 1) {
            OverflowCorrection = OverflowCorrection + T3WRAPAROUND
          } else {
            OverflowCorrection = OverflowCorrection + T3WRAPAROUND * nsync
          }
          records.assertSafe(OverflowCorrection, 'ht3 overflow count')
        }
        // channels 1-15: markers, not stored
      } else {
        const trueNSync = OverflowCorrection + nsync
        const truetime = trueNSync * GlobalResolution * 1e9
        out.push(channel + 1, truetime, dtime)
      }
    })
    return {
      push: (chunk) => stream.push(chunk),
      finish () {
        if (stream.count < header.records) {
          throw new Error(`ptu: file ended after ${stream.count} of ${header.records} records`)
        }
        return out.result(header.resolution * 1e6)
      }
    }
  }

  return { createHydraHarpT3Decoder }
})
