// PicoQuant unified .ptu files.
//
// Ported from ptuimport in legacy/point/focuspoint/import_methods/import_methods.py
// (itself based on PicoQuant's demo code). Supported record types are the
// ones the Python reads: PicoHarp T3, HydraHarp V1/V2 T3, TimeHarp 260 N/P T3
// and MultiHarp T3. T2 files and header tags the Python cannot read raise an
// error instead of returning wrong data (see docs/porting-notes.md in the FoCuS-Fit-Pro repository).

FocusCore.define('io/ptu', ['io/records', 'io/pt3', 'io/ht3'], function (records, pt3, ht3) {
  'use strict'

  const tyEmpty8 = 0xFFFF0008
  const tyBool8 = 0x00000008
  const tyInt8 = 0x10000008
  const tyBitSet64 = 0x11000008
  const tyColor8 = 0x12000008
  const tyFloat8 = 0x20000008
  const tyTDateTime = 0x21000008
  const tyFloat8Array = 0x2001FFFF
  const tyAnsiString = 0x4001FFFF
  const tyWideString = 0x4002FFFF
  const tyBinaryBlob = 0xFFFFFFFF

  const RECORD_TYPES = {
    0x00010303: { name: 'PicoHarp T3', kind: 'pt3' },
    0x00010203: { name: 'PicoHarp T2', kind: 't2' },
    0x00010304: { name: 'HydraHarp V1 T3', kind: 'ht3', version: 1 },
    0x00010204: { name: 'HydraHarp V1 T2', kind: 't2' },
    0x01010304: { name: 'HydraHarp V2 T3', kind: 'ht3', version: 2 },
    0x01010204: { name: 'HydraHarp V2 T2', kind: 't2' },
    0x00010305: { name: 'TimeHarp260N T3', kind: 'ht3', version: 2 },
    0x00010205: { name: 'TimeHarp260N T2', kind: 't2' },
    0x00010306: { name: 'TimeHarp260P T3', kind: 'ht3', version: 2 },
    0x00010206: { name: 'TimeHarp260P T2', kind: 't2' },
    0x00010307: { name: 'MultiHarp T3', kind: 'ht3', version: 2 },
    0x00010207: { name: 'MultiHarp T2', kind: 't2' }
  }

  // Unsigned 64-bit tag value, as the Python's struct 'Q'. Values above
  // Number.MAX_SAFE_INTEGER (e.g. booleans stored as -1, negative CFD
  // levels) are kept exactly as BigInt; only the tags the reader uses must
  // be safe integers (checked in parsePtuHeader).
  function readU64 (view, p) {
    const v = view.getBigUint64(p, true)
    return v <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(v) : v
  }

  function safeInt (value, name) {
    if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
      throw new RangeError(`ptu: tag ${name} is missing or not a usable integer`)
    }
    return value
  }

  function latin1 (bytes) {
    let s = ''
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
    return s
  }

  // windows-1252 differs from latin-1 only in 0x80-0x9F.
  const CP1252 = '€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008dŽ\u008f' +
    '\u0090‘’“”•–—˜™š›œ\u009džŸ'
  function windows1252 (bytes) {
    let s = ''
    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i]
      s += b >= 0x80 && b <= 0x9F ? CP1252[b - 0x80] : String.fromCharCode(b)
    }
    return s
  }

  /**
   * Read the tagged .ptu header.
   * @param {ArrayBuffer|Uint8Array} data bytes from the start of the file,
   *   including the whole header
   * @returns {{tags: Object<string, *>, headerBytes: number, recordType: number,
   *   recordName: string, records: number, globalResolution: number, resolution: number}}
   *   globalResolution and resolution in s, as stored in the tags
   */
  function parsePtuHeader (data) {
    const bytes = records.toBytes(data)
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    if (bytes.length < 16 || latin1(bytes.subarray(0, 6)) !== 'PQTTTR') {
      throw new Error('ptu: not a .ptu file (missing PQTTTR magic)')
    }
    const tags = {}
    let p = 16 // magic (8) + version (8)
    for (;;) {
      if (p + 48 > bytes.length) throw new Error('ptu: header is truncated (no Header_End tag found)')
      const TagIdent = latin1(bytes.subarray(p, p + 32)).replace(/\x00/g, '')
      const TagIdx = view.getInt32(p + 32, true)
      const TagTyp = view.getUint32(p + 36, true)
      p += 40
      let EvalName = TagIdx > -1 ? `${TagIdent}(${TagIdx + 1})` : TagIdent
      switch (TagTyp) {
        case tyEmpty8:
          p += 8
          break
        case tyBool8:
          tags[EvalName] = view.getBigUint64(p, true) !== 0n
          p += 8
          break
        case tyInt8:
        case tyBitSet64:
        case tyColor8:
          tags[EvalName] = readU64(view, p)
          p += 8
          break
        case tyFloat8:
        case tyTDateTime:
          tags[EvalName] = view.getFloat64(p, true)
          p += 8
          break
        case tyAnsiString:
        case tyWideString: {
          const len = safeInt(readU64(view, p), TagIdent + ' length')
          p += 8
          const raw = bytes.subarray(p, p + len)
          p += len
          if (TagIdx > -1) EvalName = `${TagIdent}{${TagIdx + 1}}`
          // The Python decodes AnsiString as windows-1252 and WideString as
          // UTF-8 (then drops NULs), which suits ASCII text.
          tags[EvalName] = (TagTyp === tyAnsiString ? windows1252(raw) : new TextDecoder('utf-8').decode(raw)).replace(/\x00/g, '')
          break
        }
        case tyFloat8Array:
        case tyBinaryBlob:
          // ptuimport cannot skip these correctly (absolute seek / crash), so
          // this reader refuses rather than guess. See porting notes.
          throw new Error(`ptu: header tag ${TagIdent} has type 0x${TagTyp.toString(16)}, which FoCuS-point cannot read`)
        default:
          throw new Error(`ptu: illegal tag type 0x${TagTyp.toString(16)} (${TagIdent}); broken file?`)
      }
      if (TagIdent === 'Header_End') break
    }
    const recordType = tags.TTResultFormat_TTTRRecType
    const type = RECORD_TYPES[recordType]
    return {
      tags,
      headerBytes: p,
      recordType,
      recordName: type ? type.name : 'unknown',
      records: safeInt(tags.TTResult_NumberOfRecords, 'TTResult_NumberOfRecords'),
      globalResolution: tags.MeasDesc_GlobalResolution,
      resolution: tags.MeasDesc_Resolution
    }
  }

  /**
   * Decoder for the records of a .ptu file.
   * @param {object} header from parsePtuHeader
   * @returns {{push: function(Uint8Array), finish: function(): object}}
   */
  function createPtuDecoder (header) {
    const type = RECORD_TYPES[header.recordType]
    if (!type) throw new Error(`ptu: record type 0x${(header.recordType >>> 0).toString(16)} is not supported`)
    if (type.kind === 't2') throw new Error(`ptu: ${type.name} files are not supported (FoCuS-point reads T3 only)`)
    if (type.kind === 'pt3') return pt3.createPicoHarpT3Decoder(header)
    return ht3.createHydraHarpT3Decoder(type.version, header)
  }

  /**
   * Read a whole .ptu file.
   * @param {ArrayBuffer|Uint8Array} data the file contents
   * @returns {object} records as described in io/records; trueTime in ns.
   *   resolution: MeasDesc_Resolution * 1e9 for PicoHarp T3,
   *   * 1e6 for the HydraHarp-type T3 formats (as the Python).
   */
  function readPtu (data) {
    const bytes = records.toBytes(data)
    const header = parsePtuHeader(bytes)
    const dec = createPtuDecoder(header)
    dec.push(bytes.subarray(header.headerBytes))
    return dec.finish()
  }

  return { parsePtuHeader, createPtuDecoder, readPtu, RECORD_TYPES }
})
