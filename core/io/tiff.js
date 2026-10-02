// Baseline TIFF reader for scanning-FCS carpets.
//
// FoCuS-scan reads .tif files with tifffile (Import_tiff in
// legacy/scan/focusscan/simport_methods.py: tif.asarray()) and .lsm files as
// TIFF page 0 (tif_fn.imread(filename, key=0)). This reads what those calls
// return for uncompressed, classic (not Big) TIFF files:
//  - a page: [rows, columns] for one sample per pixel; [samples, rows,
//    columns] for planar samples (PlanarConfiguration 2); [rows, columns,
//    samples] for interleaved samples;
//  - a file: its first page, or all its full-resolution pages stacked as
//    [pages, ...page shape] when there are several of the same shape, or the
//    shape tifffile wrote into the ImageDescription ({"shape": [...]}).
// Compressed files are refused with a clear error.

FocusCore.define('io/tiff', [], function () {
  'use strict'

  const TYPE_SIZE = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8, 13: 4 }
  const TAG = {
    NewSubfileType: 254,
    ImageWidth: 256,
    ImageLength: 257,
    BitsPerSample: 258,
    Compression: 259,
    ImageDescription: 270,
    StripOffsets: 273,
    SamplesPerPixel: 277,
    RowsPerStrip: 278,
    StripByteCounts: 279,
    PlanarConfiguration: 284,
    SampleFormat: 339
  }

  function view (data) {
    const u8 = data instanceof Uint8Array ? data : new Uint8Array(data)
    return { u8, dv: new DataView(u8.buffer, u8.byteOffset, u8.byteLength) }
  }

  /** The values of one IFD entry: numbers, or a string for ASCII. */
  function entryValues (dv, little, type, count, valuePos) {
    const size = (TYPE_SIZE[type] || 1) * count
    const pos = size <= 4 ? valuePos : dv.getUint32(valuePos, little)
    if (type === 2) {
      let s = ''
      for (let i = 0; i < count; i++) {
        const c = dv.getUint8(pos + i)
        if (c === 0) break
        s += String.fromCharCode(c)
      }
      return s
    }
    const out = new Array(count)
    for (let i = 0; i < count; i++) {
      switch (type) {
        case 1: case 7: out[i] = dv.getUint8(pos + i); break
        case 6: out[i] = dv.getInt8(pos + i); break
        case 3: out[i] = dv.getUint16(pos + 2 * i, little); break
        case 8: out[i] = dv.getInt16(pos + 2 * i, little); break
        case 4: case 13: out[i] = dv.getUint32(pos + 4 * i, little); break
        case 9: out[i] = dv.getInt32(pos + 4 * i, little); break
        case 5: out[i] = dv.getUint32(pos + 8 * i, little) / dv.getUint32(pos + 8 * i + 4, little); break
        case 10: out[i] = dv.getInt32(pos + 8 * i, little) / dv.getInt32(pos + 8 * i + 4, little); break
        case 11: out[i] = dv.getFloat32(pos + 4 * i, little); break
        case 12: out[i] = dv.getFloat64(pos + 8 * i, little); break
        default: out[i] = dv.getUint8(pos + i)
      }
    }
    return out
  }

  /**
   * Parse the header and every IFD.
   * @param {ArrayBuffer|Uint8Array} data the whole file
   * @returns {{little: boolean, pages: Array<{offset: number, tags: Object<number, {type: number,
   *   count: number, valuePos: number, values: (number[]|string)}>}>}}
   */
  function readIfds (data) {
    const { dv } = view(data)
    const order = dv.getUint16(0, false)
    if (order !== 0x4949 && order !== 0x4d4d) throw new Error('tiff: not a TIFF file')
    const little = order === 0x4949
    const magic = dv.getUint16(2, little)
    if (magic === 43) throw new Error('tiff: BigTIFF files are not supported yet')
    if (magic !== 42) throw new Error('tiff: not a TIFF file')
    const pages = []
    const seen = new Set()
    let ifd = dv.getUint32(4, little)
    while (ifd !== 0 && !seen.has(ifd) && ifd + 2 <= dv.byteLength) {
      seen.add(ifd)
      const n = dv.getUint16(ifd, little)
      const tags = {}
      for (let i = 0; i < n; i++) {
        const pos = ifd + 2 + 12 * i
        const tag = dv.getUint16(pos, little)
        const type = dv.getUint16(pos + 2, little)
        const count = dv.getUint32(pos + 4, little)
        tags[tag] = { type, count, valuePos: pos + 8, values: null }
      }
      for (const t of Object.keys(tags)) {
        const e = tags[t]
        // Large private tags (e.g. the LSM info block) are read by their owners.
        if (e.count * (TYPE_SIZE[e.type] || 1) <= 1 << 20 || Number(t) === TAG.StripOffsets || Number(t) === TAG.StripByteCounts) {
          e.values = entryValues(dv, little, e.type, e.count, e.valuePos)
        }
      }
      pages.push({ offset: ifd, tags })
      ifd = dv.getUint32(ifd + 2 + 12 * n, little)
    }
    return { little, pages }
  }

  function tagValue (page, tag, fallback) {
    const e = page.tags[tag]
    if (!e || e.values === null) return fallback
    return typeof e.values === 'string' ? e.values : e.values[0]
  }

  function dtypeOf (bits, format) {
    if (format === 3) {
      if (bits === 32) return 'float32'
      if (bits === 64) return 'float64'
    } else if (format === 2) {
      if (bits === 8) return 'int8'
      if (bits === 16) return 'int16'
      if (bits === 32) return 'int32'
    } else {
      if (bits === 8) return 'uint8'
      if (bits === 16) return 'uint16'
      if (bits === 32) return 'uint32'
    }
    throw new Error(`tiff: ${bits}-bit samples (format ${format}) are not supported`)
  }

  const ARRAYS = {
    uint8: Uint8Array, int8: Int8Array, uint16: Uint16Array, int16: Int16Array,
    uint32: Uint32Array, int32: Int32Array, float32: Float32Array, float64: Float64Array
  }

  /** Shape and sample type of a page, as tifffile gives them. */
  function pageInfo (page) {
    const width = tagValue(page, TAG.ImageWidth, 0)
    const length = tagValue(page, TAG.ImageLength, 0)
    const spp = tagValue(page, TAG.SamplesPerPixel, 1)
    const bits = tagValue(page, TAG.BitsPerSample, 1)
    const format = tagValue(page, TAG.SampleFormat, 1)
    const planar = tagValue(page, TAG.PlanarConfiguration, 1)
    const shape = spp === 1 ? [length, width] : planar === 2 ? [spp, length, width] : [length, width, spp]
    return { width, length, spp, bits, format, planar, shape, dtype: dtypeOf(bits, format) }
  }

  /**
   * Decode one page (uncompressed strips) into a typed array in C order.
   * @param {ArrayBuffer|Uint8Array} data the whole file
   * @param {{little: boolean}} tiff from readIfds
   * @param {object} page from readIfds
   * @param {{fixOffsets?: boolean}} [options] fixOffsets: undo 32-bit wrap-around
   *   of strip offsets (Zeiss LSM files larger than 4 GB)
   * @returns {{shape: number[], dtype: string, data: TypedArray}}
   */
  function readPage (data, tiff, page, options) {
    const { u8, dv } = view(data)
    const info = pageInfo(page)
    const compression = tagValue(page, TAG.Compression, 1)
    if (compression !== 1) throw new Error(`tiff: compressed images (compression ${compression}) are not supported yet`)
    const offsets = (page.tags[TAG.StripOffsets] || {}).values
    const counts = (page.tags[TAG.StripByteCounts] || {}).values
    if (!offsets || !counts) throw new Error('tiff: image has no strips')
    const offs = offsets.slice()
    if (options && options.fixOffsets) {
      let wrap = 0
      for (let i = 1; i < offs.length; i++) {
        if (offsets[i] < offsets[i - 1]) wrap += 2 ** 32
        offs[i] = offsets[i] + wrap
      }
    }
    const bytesPer = info.bits / 8
    const total = info.width * info.length * info.spp
    const Arr = ARRAYS[info.dtype]
    const out = new Arr(total)
    const little = tiff.little
    let k = 0
    for (let s = 0; s < offs.length && k < total; s++) {
      const start = offs[s]
      const n = Math.min(counts[s] / bytesPer, total - k)
      if (start + n * bytesPer > u8.length) throw new Error('tiff: image data runs past the end of the file')
      if (bytesPer === 1) {
        out.set(info.format === 2 ? new Int8Array(u8.buffer, u8.byteOffset + start, n) : u8.subarray(start, start + n), k)
      } else {
        for (let i = 0; i < n; i++) {
          const p = start + i * bytesPer
          switch (info.dtype) {
            case 'uint16': out[k + i] = dv.getUint16(p, little); break
            case 'int16': out[k + i] = dv.getInt16(p, little); break
            case 'uint32': out[k + i] = dv.getUint32(p, little); break
            case 'int32': out[k + i] = dv.getInt32(p, little); break
            case 'float32': out[k + i] = dv.getFloat32(p, little); break
            case 'float64': out[k + i] = dv.getFloat64(p, little); break
          }
        }
      }
      k += n
    }
    if (k < total) throw new Error('tiff: image data is shorter than the image size')
    return { shape: info.shape, dtype: info.dtype, data: out }
  }

  /**
   * tif.asarray(): the image data of a TIFF file.
   * @param {ArrayBuffer|Uint8Array} data the whole file
   * @returns {{shape: number[], dtype: string, data: TypedArray, pages: number}}
   */
  function readTiff (data) {
    const tiff = readIfds(data)
    // Full-resolution pages only (reduced-resolution images are thumbnails).
    const pages = tiff.pages.filter((p) => (tagValue(p, TAG.NewSubfileType, 0) & 1) === 0)
    if (!pages.length) throw new Error('tiff: no images in the file')
    const first = pageInfo(pages[0])
    const same = []
    for (const p of pages) {
      const i = pageInfo(p)
      if (i.dtype !== first.dtype || i.shape.join() !== first.shape.join()) break
      same.push(p)
    }
    const arrays = same.map((p) => readPage(data, tiff, p))
    let shape = same.length > 1 ? [same.length].concat(first.shape) : first.shape
    const Arr = ARRAYS[first.dtype]
    let out = arrays[0].data
    if (arrays.length > 1) {
      out = new Arr(arrays.length * arrays[0].data.length)
      arrays.forEach((a, i) => out.set(a.data, i * a.data.length))
    }
    // tifffile records the shape it wrote in the first ImageDescription.
    const desc = tagValue(pages[0], TAG.ImageDescription, '')
    if (typeof desc === 'string' && desc.startsWith('{')) {
      try {
        const meta = JSON.parse(desc)
        if (Array.isArray(meta.shape) && meta.shape.reduce((a, b) => a * b, 1) === out.length) shape = meta.shape.slice()
      } catch (e) { /* not tifffile's JSON */ }
    }
    return { shape, dtype: first.dtype, data: out, pages: same.length }
  }

  return { readIfds, readPage, readTiff, pageInfo, entryValues, TAG }
})
