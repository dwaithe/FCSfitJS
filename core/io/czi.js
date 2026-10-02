// Zeiss CZI files (ZISRAW segments).
//
// Import_czi in legacy/scan/focusscan/simport_methods.py reads
//   data_array = czi_fn.imread(filename)
// and suggests timings from the metadata XML: for every element in document
// order, PixelTime -> np.round(PixelTime*1e6, 8) (us) and LineTime ->
// np.round(1/LineTime, 8) (a line frequency, Hz); the last one found wins.
//
// czifile.imread (the version FoCuS-scan uses) returns an array whose axes
// are the dimensions of the first directory entry in stored order (without
// M), plus a trailing sample axis; each axis runs over the extent of all
// subblocks. This reads uncompressed Gray8/16/32 and Gray32Float/64Float
// subblocks stored at full size. Compressed CZI (JPEG XR, zstd) is refused:
// see CLAUDE.md (Phase 5: CZI) before adding it.

FocusCore.define('io/czi', [], function () {
  'use strict'

  // Pixel types czifile maps to one-sample numpy dtypes.
  const PIXEL_TYPES = {
    0: { name: 'Gray8', dtype: 'uint8', bytes: 1 },
    1: { name: 'Gray16', dtype: 'uint16', bytes: 2 },
    2: { name: 'Gray32Float', dtype: 'float32', bytes: 4 },
    12: { name: 'Gray32', dtype: 'int32', bytes: 4 },
    13: { name: 'Gray64Float', dtype: 'float64', bytes: 8 }
  }
  const ARRAYS = { uint8: Uint8Array, uint16: Uint16Array, int32: Int32Array, float32: Float32Array, float64: Float64Array }

  function view (data) {
    const u8 = data instanceof Uint8Array ? data : new Uint8Array(data)
    return { u8, dv: new DataView(u8.buffer, u8.byteOffset, u8.byteLength) }
  }

  function segmentId (u8, pos) {
    let s = ''
    for (let i = 0; i < 16; i++) {
      const c = u8[pos + i]
      if (c === 0) break
      s += String.fromCharCode(c)
    }
    return s
  }

  function int64 (dv, pos) {
    const v = dv.getBigInt64(pos, true)
    if (v > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('czi: file position too large')
    return Number(v)
  }

  /** DirectoryEntryDV at pos: {pixelType, filePosition, compression, dims, size}. */
  function directoryEntry (u8, dv, pos) {
    if (u8[pos] !== 0x44 || u8[pos + 1] !== 0x56) throw new Error('czi: bad directory entry') // 'DV'
    const count = dv.getInt32(pos + 28, true)
    const dims = []
    for (let i = 0; i < count; i++) {
      const p = pos + 32 + 20 * i
      let name = ''
      for (let k = 0; k < 4; k++) { const c = u8[p + k]; if (c) name += String.fromCharCode(c) }
      dims.push({ dimension: name, start: dv.getInt32(p + 4, true), size: dv.getInt32(p + 8, true), storedSize: dv.getInt32(p + 16, true) })
    }
    // Stored fastest-varying first (X, Y, ...); czifile reverses them, so the
    // axes read e.g. HTCZYX and the pixel data is in C order over them.
    dims.reverse()
    return {
      pixelType: dv.getInt32(pos + 2, true),
      filePosition: int64(dv, pos + 6),
      compression: dv.getInt32(pos + 18, true),
      dims,
      size: 32 + 20 * count
    }
  }

  /** The file header, subblock directory and metadata XML. */
  function readStructure (data) {
    const { u8, dv } = view(data)
    if (segmentId(u8, 0) !== 'ZISRAWFILE') throw new Error('czi: not a CZI file')
    const dirPos = int64(dv, 32 + 52)
    const metaPos = int64(dv, 32 + 60)
    if (segmentId(u8, dirPos) !== 'ZISRAWDIRECTORY') throw new Error('czi: subblock directory not found')
    const n = dv.getInt32(dirPos + 32, true)
    const entries = []
    let p = dirPos + 32 + 128
    for (let i = 0; i < n; i++) {
      const e = directoryEntry(u8, dv, p)
      entries.push(e)
      p += e.size
    }
    let xml = ''
    if (metaPos > 0 && segmentId(u8, metaPos) === 'ZISRAWMETADATA') {
      const xmlSize = dv.getInt32(metaPos + 32, true)
      xml = new TextDecoder('utf-8').decode(u8.subarray(metaPos + 32 + 256, metaPos + 32 + 256 + xmlSize))
    }
    return { entries, xml }
  }

  /** np.round(x, 8): round half to even at the 8th decimal. */
  function round8 (x) {
    const y = x * 1e8
    const f = Math.floor(y)
    const d = y - f
    const r = d > 0.5 ? f + 1 : d < 0.5 ? f : (f % 2 === 0 ? f : f + 1)
    return r / 1e8
  }

  /** The timings Import_czi suggests from the metadata XML. */
  function suggestTimings (xml) {
    const out = { lineFrequencyHz: null, pixelTimeUs: null }
    const re = /<(PixelTime|LineTime)(?:\s[^>]*)?>([^<]*)<\/\1>/g
    let m
    while ((m = re.exec(xml)) !== null) {
      const v = parseFloat(m[2])
      if (m[1] === 'PixelTime') out.pixelTimeUs = round8(v * 1e6)
      else out.lineFrequencyHz = round8(1 / v)
    }
    return out
  }

  /**
   * czi_fn.imread(filename) and the suggested timings.
   * @param {ArrayBuffer|Uint8Array} data the whole file
   * @returns {{format: string, axes: string, shape: number[], dtype: string, data: TypedArray,
   *   suggest: {lineFrequencyHz: ?number, pixelTimeUs: ?number}}}
   */
  function readCzi (data) {
    const { u8, dv } = view(data)
    const { entries, xml } = readStructure(data)
    if (!entries.length) throw new Error('czi: no image data')
    for (const e of entries) {
      if (e.compression !== 0) throw new Error(`czi: compressed image data (compression ${e.compression}, e.g. JPEG XR or zstd) is not supported yet`)
      if (!PIXEL_TYPES[e.pixelType]) throw new Error(`czi: pixel type ${e.pixelType} is not supported`)
      if (e.pixelType !== entries[0].pixelType) throw new Error('czi: mixed pixel types are not supported')
      for (const d of e.dims) {
        if (d.dimension !== 'M' && d.storedSize !== d.size) throw new Error('czi: sub/supersampled image data is not supported')
      }
    }
    const pt = PIXEL_TYPES[entries[0].pixelType]
    const dimsOf = (e) => e.dims.filter((d) => d.dimension !== 'M')
    const axes = dimsOf(entries[0]).map((d) => d.dimension).join('') + '0'
    const nd = dimsOf(entries[0]).length
    const start = new Array(nd).fill(Infinity)
    const stop = new Array(nd).fill(-Infinity)
    for (const e of entries) {
      dimsOf(e).forEach((d, i) => {
        start[i] = Math.min(start[i], d.start)
        stop[i] = Math.max(stop[i], d.start + d.size)
      })
    }
    const shape = stop.map((s, i) => s - start[i]).concat([1])
    const strides = new Array(shape.length)
    strides[shape.length - 1] = 1
    for (let i = shape.length - 2; i >= 0; i--) strides[i] = strides[i + 1] * shape[i + 1]
    const total = shape.reduce((a, b) => a * b, 1)
    const out = new ARRAYS[pt.dtype](total)

    for (const e of entries) {
      const sb = e.filePosition
      if (segmentId(u8, sb) !== 'ZISRAWSUBBLOCK') throw new Error('czi: subblock not found')
      const metaSize = dv.getInt32(sb + 32, true)
      const entry = directoryEntry(u8, dv, sb + 48)
      const dataPos = sb + 48 + entry.size + Math.max(240 - entry.size, 0) + metaSize
      const dims = dimsOf(e)
      const tileShape = dims.map((d) => d.size)
      const count = tileShape.reduce((a, b) => a * b, 1)
      if (dataPos + count * pt.bytes > u8.length) throw new Error('czi: image data runs past the end of the file')
      // Copy the tile (C order over its dimensions) into the output, one run
      // along the last dimension at a time.
      const run = tileShape[nd - 1]
      const idx = new Array(nd).fill(0)
      for (let k = 0; k < count; k += run) {
        let o = 0
        for (let i = 0; i < nd; i++) o += (dims[i].start - start[i] + idx[i]) * strides[i]
        const src = dataPos + k * pt.bytes
        for (let j = 0; j < run; j++) {
          const q = src + j * pt.bytes
          switch (pt.dtype) {
            case 'uint8': out[o + j] = u8[q]; break
            case 'uint16': out[o + j] = dv.getUint16(q, true); break
            case 'int32': out[o + j] = dv.getInt32(q, true); break
            case 'float32': out[o + j] = dv.getFloat32(q, true); break
            case 'float64': out[o + j] = dv.getFloat64(q, true); break
          }
        }
        // next index (the last dimension is covered by the run)
        for (let i = nd - 2; i >= 0; i--) {
          if (++idx[i] < tileShape[i]) break
          idx[i] = 0
        }
      }
    }
    return { format: 'czi', axes, shape, dtype: pt.dtype, data: out, suggest: suggestTimings(xml) }
  }

  return { readCzi, readStructure, suggestTimings }
})
