// Imspector .msr files (Abberior "OMAS_BF" format).
//
// Import_msr in legacy/scan/focusscan/simport_methods.py reads every image
// stack in the file (Linux/macOS branch: 8-byte longs), keeps those with data
// type 8 (int16), unpacks the first size[0] x size[1] values as signed 16-bit
// integers (zlib-decompressed when compression_type is 1) and forms
//   image = values.reshape(size[1], size[0]).T
// A stack is a time series if its metadata XML has an <item> whose text is
// "ExpControl T" (or if it has no metadata); the import dialog lists the time
// series with more than 500 lines. FoCuS-scan then uses image.T, i.e. the
// values in file order as a carpet of size[1] lines x size[0] pixels; that
// is what this returns. No timings are suggested (the user enters them).

FocusCore.define('io/msr', [], function () {
  'use strict'

  function view (data) {
    const u8 = data instanceof Uint8Array ? data : new Uint8Array(data)
    return { u8, dv: new DataView(u8.buffer, u8.byteOffset, u8.byteLength) }
  }

  function int64 (dv, pos) {
    const v = dv.getBigInt64(pos, true)
    if (v > BigInt(Number.MAX_SAFE_INTEGER) || v < -BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('msr: position too large')
    return Number(v)
  }

  /** zlib inflate (RFC 1950), with the platform's DecompressionStream. */
  async function inflate (bytes) {
    if (typeof DecompressionStream === 'undefined') throw new Error('msr: this browser cannot decompress zlib data (no DecompressionStream)')
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'))
    return new Uint8Array(await new Response(stream).arrayBuffer())
  }

  const TIMESERIES = /<item(?:\s[^>]*)?>ExpControl T<\/item>/

  /**
   * Read every stack of an .msr file.
   * @param {ArrayBuffer|Uint8Array} data the whole file
   * @returns {Promise<{format: string, stacks: Array<{name: string, size: number[],
   *   compression: number, timeseries: boolean, selectable: boolean,
   *   shape: number[], dtype: string, data: Int16Array}>}>}
   *   shape [lines, pixels] = [size[1], size[0]]; data in C order
   */
  async function readMsr (data) {
    const { u8, dv } = view(data)
    const magic = String.fromCharCode.apply(null, u8.subarray(0, 7))
    if (magic !== 'OMAS_BF') throw new Error('msr: not an Imspector .msr file')
    let next = int64(dv, 14)
    const stacks = []
    const seen = new Set()
    while (next !== 0) {
      if (seen.has(next) || next < 0 || next >= u8.length) throw new Error('msr: bad stack position')
      seen.add(next)
      const pos = next
      const rank = dv.getUint32(pos + 20, true) - 1
      const size = []
      for (let i = 0; i < rank; i++) size.push(dv.getUint32(pos + 24 + 4 * i, true))
      const base = pos + 24 + 60 + 120 + 120 // after sizes, lengths and offsets
      const dtype = dv.getUint32(base, true)
      const compression = dv.getUint32(base + 4, true)
      const nameLen = dv.getUint32(base + 12, true)
      const descLen = dv.getUint32(base + 16, true)
      const dataLen = int64(dv, base + 28)
      next = int64(dv, base + 36)
      if (dtype !== 8) continue // Import_msr skips other data types
      const namePos = base + 44
      const name = new TextDecoder('utf-8').decode(u8.subarray(namePos, namePos + nameLen))
      const dataPos = namePos + nameLen + descLen
      let raw = u8.subarray(dataPos, dataPos + dataLen)
      if (compression === 1) raw = await inflate(raw)
      const n = size[0] * size[1]
      if (raw.length < 2 * n) throw new Error('msr: image data is shorter than the image size')
      const values = new Int16Array(n)
      const rdv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength)
      for (let i = 0; i < n; i++) values[i] = rdv.getInt16(2 * i, true)
      // Footer: its size, then (after it) one name per dimension, then the metadata XML.
      const footer = dataPos + dataLen
      const footSize = dv.getUint32(footer, true)
      const metaLen = dv.getUint32(footer + 4 + 60 + 60, true)
      let q = footer + footSize
      for (let b = 0; b < rank + 1; b++) q += 4 + dv.getUint32(q, true)
      const meta = metaLen > 0 ? new TextDecoder('utf-8').decode(u8.subarray(q, q + metaLen)) : ''
      const timeseries = meta.length === 0 ? true : TIMESERIES.test(meta)
      stacks.push({
        name,
        size,
        compression,
        timeseries,
        selectable: timeseries && size[1] > 500,
        shape: [size[1], size[0]],
        dtype: 'int16',
        data: values
      })
    }
    return { format: 'msr', stacks }
  }

  return { readMsr, inflate }
})
