// Shared helpers for the time-tagged (TTTR) photon file readers in core/io/.
//
// Every reader returns the same shape as the FoCuS-point importers
// (import_methods.py), which return (chanArr, trueTimeArr, dTimeArr, resolution):
//   {
//     channel:  Uint8Array   detector channel of each record
//     trueTime: Float64Array macro-time of each record (units: see each reader, ns for PicoQuant)
//     dTime:    Int32Array   micro-time (TCSPC channel) of each record
//     resolution: number|null  as returned by the Python (units differ by format, see reader)
//     length:   number        number of records
//   }
// Readers take the file as one ArrayBuffer/Uint8Array, or as a sequence of
// chunks via their decoder's push(), so large files never have to be
// concatenated.

FocusCore.define('io/records', [], function () {
  'use strict'

  /** Growable output arrays for photon records. */
  function createPhotonArrays (capacity) {
    let cap = Math.max(16, capacity | 0)
    let channel = new Uint8Array(cap)
    let trueTime = new Float64Array(cap)
    let dTime = new Int32Array(cap)
    let n = 0

    function grow () {
      cap *= 2
      const c = new Uint8Array(cap); c.set(channel); channel = c
      const t = new Float64Array(cap); t.set(trueTime); trueTime = t
      const d = new Int32Array(cap); d.set(dTime); dTime = d
    }

    return {
      push (ch, t, d) {
        if (n === cap) grow()
        channel[n] = ch
        trueTime[n] = t
        dTime[n] = d
        n++
      },
      get length () { return n },
      /** The filled part of the arrays plus resolution, as returned by readers. */
      result (resolution) {
        return {
          channel: channel.subarray(0, n),
          trueTime: trueTime.subarray(0, n),
          dTime: dTime.subarray(0, n),
          resolution: resolution === undefined ? null : resolution,
          length: n
        }
      }
    }
  }

  /**
   * Feeds a byte stream, in chunks of any size, to onRecord as 32-bit
   * little-endian unsigned integers. Bytes of a record split across two
   * chunks are carried over.
   */
  function createUint32Stream (onRecord) {
    const carry = new Uint8Array(4)
    let carried = 0
    let count = 0
    return {
      push (chunk) {
        const bytes = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk)
        let i = 0
        if (carried) {
          while (carried < 4 && i < bytes.length) carry[carried++] = bytes[i++]
          if (carried < 4) return
          onRecord((carry[0] | (carry[1] << 8) | (carry[2] << 16) | (carry[3] << 24)) >>> 0, count++)
          carried = 0
        }
        const whole = (bytes.length - i) & ~3
        const view = new DataView(bytes.buffer, bytes.byteOffset + i, whole)
        for (let p = 0; p < whole; p += 4) onRecord(view.getUint32(p, true), count++)
        i += whole
        while (i < bytes.length) carry[carried++] = bytes[i++]
      },
      /** Records delivered so far. */
      get count () { return count },
      /** Bytes left over that do not make a whole record. */
      get leftover () { return carried }
    }
  }

  /** Throw if an integer counter can no longer be represented exactly. */
  function assertSafe (value, what) {
    if (!(value <= Number.MAX_SAFE_INTEGER)) {
      throw new RangeError(`${what} exceeds Number.MAX_SAFE_INTEGER; the file is too long to read exactly`)
    }
  }

  /** Normalise an ArrayBuffer / typed array / DataView to a Uint8Array. */
  function toBytes (data) {
    if (data instanceof Uint8Array) return data
    if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
    return new Uint8Array(data)
  }

  return { createPhotonArrays, createUint32Stream, assertSafe, toBytes }
})
