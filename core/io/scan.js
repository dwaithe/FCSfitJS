// Scanning-FCS image files: pick the reader from the file extension, as
// FoCuS-scan's file import does (Import_lsm, Import_czi, Import_tiff,
// Import_msr, Import_lif).

FocusCore.define('io/scan', ['io/tiff', 'io/lsm', 'io/czi', 'io/msr', 'io/lif'], function (tiff, lsm, czi, msr, lif) {
  'use strict'

  function extension (name) {
    const dot = String(name).lastIndexOf('.')
    return dot < 0 ? '' : String(name).slice(dot + 1).toLowerCase()
  }

  /**
   * Read a scanning-FCS image file (async: .msr data may need decompressing).
   * @param {string} name file name (the extension picks the reader)
   * @param {ArrayBuffer|Uint8Array} data the whole file
   * @returns {Promise<object>} for .lsm/.czi/.tif: {format, shape, dtype, data,
   *   suggest: {lineFrequencyHz, pixelTimeUs}}, the array the FoCuS-scan
   *   importer passes to scanObject (C order) and the timings it suggests;
   *   for .msr: {format, stacks: [...]} (see io/msr); for .lif: {format,
   *   series: [...]} (see io/lif)
   */
  async function readScan (name, data) {
    const ext = extension(name)
    if (ext === 'msr') return msr.readMsr(data)
    if (ext === 'lif') return lif.readLif(data)
    if (ext === 'lsm') return lsm.readLsm(data)
    if (ext === 'czi') return czi.readCzi(data)
    if (ext === 'tif' || ext === 'tiff') {
      const r = tiff.readTiff(data)
      return { format: 'tif', shape: r.shape, dtype: r.dtype, data: r.data, suggest: { lineFrequencyHz: null, pixelTimeUs: null } }
    }
    throw new Error(`Unsupported scan file type: .${ext}`)
  }

  return { readScan, extension, SCAN_EXTENSIONS: ['lsm', 'czi', 'tif', 'tiff', 'msr', 'lif'] }
})
