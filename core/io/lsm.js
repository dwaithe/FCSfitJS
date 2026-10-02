// Zeiss LSM files (a TIFF with the CZ_LSMINFO block, tag 34412).
//
// Import_lsm in legacy/scan/focusscan/simport_methods.py reads
//   data_array = tif_fn.imread(filename, key=0)            (the first page)
//   suggest_line_time = 1.0/float(cz_lsm_info.value[23])  (1 / TimeIntervall)
// The suggestion is a line frequency in Hz (the dialog asks for the "line
// sampling (Hz)"); TimeIntervall is in seconds.

FocusCore.define('io/lsm', ['io/tiff'], function (tiff) {
  'use strict'

  const CZ_LSMINFO = 34412

  /**
   * The CZ_LSMINFO fields FoCuS-scan and FoCuS-Fit-JS use.
   * @returns {object} dimensions, voxel sizes (m), ScanType and TimeIntervall (s)
   */
  function readLsmInfo (data, t, page) {
    const u8 = data instanceof Uint8Array ? data : new Uint8Array(data)
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength)
    const e = page.tags[CZ_LSMINFO]
    if (!e) throw new Error('lsm: no CZ_LSMINFO block (not a Zeiss LSM file)')
    const p = dv.getUint32(e.valuePos, t.little)
    const L = t.little
    const magic = dv.getUint32(p, L)
    if (magic !== 0x00300494c && magic !== 0x0400494c) throw new Error('lsm: CZ_LSMINFO has an unknown magic number')
    return {
      DimensionX: dv.getInt32(p + 8, L),
      DimensionY: dv.getInt32(p + 12, L),
      DimensionZ: dv.getInt32(p + 16, L),
      DimensionChannels: dv.getInt32(p + 20, L),
      DimensionTime: dv.getInt32(p + 24, L),
      DataType: dv.getInt32(p + 28, L),
      VoxelSizeX: dv.getFloat64(p + 40, L),
      VoxelSizeY: dv.getFloat64(p + 48, L),
      VoxelSizeZ: dv.getFloat64(p + 56, L),
      ScanType: dv.getUint16(p + 88, L),
      TimeIntervall: dv.getFloat64(p + 112, L)
    }
  }

  /**
   * Read an LSM file as FoCuS-scan does.
   * @param {ArrayBuffer|Uint8Array} data the whole file
   * @returns {{format: string, shape: number[], dtype: string, data: TypedArray,
   *   suggest: {lineFrequencyHz: ?number, pixelTimeUs: ?number}, info: object}}
   *   shape [lines, pixels] for one channel, [channels, lines, pixels] for
   *   several (page 0, as tifffile returns it)
   */
  function readLsm (data) {
    const t = tiff.readIfds(data)
    if (!t.pages.length) throw new Error('lsm: no images in the file')
    const page = t.pages[0]
    const info = readLsmInfo(data, t, page)
    const img = tiff.readPage(data, t, page, { fixOffsets: true })
    const interval = info.TimeIntervall
    return {
      format: 'lsm',
      shape: img.shape,
      dtype: img.dtype,
      data: img.data,
      suggest: { lineFrequencyHz: interval > 0 ? 1.0 / interval : null, pixelTimeUs: null },
      info
    }
  }

  return { readLsm, readLsmInfo }
})
