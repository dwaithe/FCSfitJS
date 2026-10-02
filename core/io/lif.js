// Leica .lif files.
//
// Import_lif in legacy/scan/focusscan/simport_methods.py reads the XML header
// and lists every Element (at any depth) that has a ./Memory child of
// non-zero Size and whose first .//ATLConfocalSettingDefinition has
// ScanMode="xt" (a line scan). For each it keeps:
//   name        Element Name
//   memid       the Memory's MemoryBlockID
//   lutname     LUTName of every .//ChannelDescription (the channels)
//   diminfo     NumberOfElements of every .//DimensionDescription
//   bytesinc    BytesInc of the first .//DimensionDescription (1: uint8, 2: uint16)
//   linetime    ATLConfocalSettingDefinition LineTime (s)
//   dwelltime   ATLConfocalSettingDefinition PixelDwellTime (s)
// (.// searches include nested child Elements, as in the Python.)
// import_lif_sing then reads the memory blocks in file order and keeps the
// raw values of the listed ones. The carpets are formed later from diminfo
// and the channels (scanObject, core/correlation/carpets.js).

FocusCore.define('io/lif', [], function () {
  'use strict'

  // ------------------------------------------------------------------ XML
  // A small XML reader: elements with attributes and children, enough for
  // the LIF header (Web Workers have no DOMParser). Text, comments and
  // processing instructions are skipped.

  const ENTITIES = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" }
  function unescape (s) {
    return s.replace(/&(#x[0-9a-fA-F]+|#\d+|\w+);/g, (m, e) => {
      if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10))
      return ENTITIES[e] !== undefined ? ENTITIES[e] : m
    })
  }

  /** Parse XML into {tag, attrs, children} nodes; returns the root element. */
  function parseXml (text) {
    const root = { tag: '#document', attrs: {}, children: [] }
    const stack = [root]
    const re = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|<!DOCTYPE[^>]*>|<\/([^\s>]+)\s*>|<([^\s/>]+)((?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/g
    const attrRe = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g
    let m
    while ((m = re.exec(text)) !== null) {
      if (m[1]) { // closing tag
        if (stack.length > 1) stack.pop()
      } else if (m[2]) { // opening tag
        const attrs = {}
        let a
        attrRe.lastIndex = 0
        while ((a = attrRe.exec(m[3] || '')) !== null) attrs[a[1]] = unescape(a[2] !== undefined ? a[2] : a[3])
        const node = { tag: m[2], attrs, children: [] }
        stack[stack.length - 1].children.push(node)
        if (!m[4]) stack.push(node)
      }
    }
    return root.children[0] || root
  }

  /** All descendants of node with this tag, in document order (ElementTree .//tag). */
  function findAll (node, tag, out) {
    out = out || []
    for (const c of node.children) {
      if (c.tag === tag) out.push(c)
      findAll(c, tag, out)
    }
    return out
  }
  function find (node, tag) {
    for (const c of node.children) {
      if (c.tag === tag) return c
      const d = find(c, tag)
      if (d) return d
    }
    return null
  }

  // ------------------------------------------------------------------ file

  function view (data) {
    const u8 = data instanceof Uint8Array ? data : new Uint8Array(data)
    return { u8, dv: new DataView(u8.buffer, u8.byteOffset, u8.byteLength) }
  }

  function utf16 (u8, pos, chars) {
    return new TextDecoder('utf-16le').decode(u8.subarray(pos, pos + 2 * chars))
  }

  /** The line-scan series Import_lif lists, from the XML header. */
  function listSeries (xml) {
    const root = parseXml(xml)
    const out = []
    for (const el of findAll(root, 'Element')) {
      for (const mem of el.children.filter((c) => c.tag === 'Memory')) {
        if (!(parseInt(mem.attrs.Size, 10) > 0)) continue
        const conf = find(el, 'ATLConfocalSettingDefinition')
        if (!conf || conf.attrs.ScanMode !== 'xt') continue
        const dims = findAll(el, 'DimensionDescription')
        if (!dims.length) continue // (the Python would fail here and skip the element)
        out.push({
          name: el.attrs.Name,
          memId: mem.attrs.MemoryBlockID,
          lutNames: findAll(el, 'ChannelDescription').map((c) => c.attrs.LUTName),
          dimInfo: dims.map((d) => parseInt(d.attrs.NumberOfElements, 10)),
          bytesInc: parseInt(dims[0].attrs.BytesInc, 10),
          lineTimeS: parseFloat(conf.attrs.LineTime),
          dwellTimeS: parseFloat(conf.attrs.PixelDwellTime)
        })
      }
    }
    return out
  }

  /**
   * Read a .lif file: the line-scan series and their raw data.
   * @param {ArrayBuffer|Uint8Array} data the whole file
   * @returns {{format: string, series: Array<{name: string, memId: string, lutNames: string[],
   *   dimInfo: number[], bytesInc: number, lineTimeS: number, dwellTimeS: number,
   *   dtype: ?string, data: ?(Uint8Array|Uint16Array),
   *   suggest: {lineFrequencyHz: number, pixelTimeUs: number}}>}}
   *   data: the memory block's values (null if the block is not in the file);
   *   suggest: the line frequency and dwell time the import dialog shows
   */
  function readLif (data) {
    const { u8, dv } = view(data)
    if (dv.getInt32(0, true) !== 0x70 || u8[8] !== 0x2a) throw new Error('lif: not a Leica .lif file')
    const chars = dv.getInt32(9, true)
    const series = listSeries(utf16(u8, 13, chars))
    // Memory blocks, in file order: id -> [data offset, size]
    const blocks = {}
    let p = 13 + 2 * chars
    while (p + 22 <= u8.length && dv.getInt32(p, true) === 0x70) {
      const size = Number(dv.getBigInt64(p + 9, true))
      const c = dv.getInt32(p + 18, true)
      const id = utf16(u8, p + 22, c).replace(/\0/g, '')
      blocks[id] = [p + 22 + 2 * c, size]
      p += 22 + 2 * c + size
    }
    for (const s of series) {
      const b = blocks[s.memId]
      s.dtype = null
      s.data = null
      if (b && b[1] > 0 && b[0] + b[1] <= u8.length) {
        if (s.bytesInc === 1) {
          s.dtype = 'uint8'
          s.data = u8.slice(b[0], b[0] + b[1])
        } else if (s.bytesInc === 2) {
          s.dtype = 'uint16'
          s.data = new Uint16Array(b[1] >> 1)
          for (let i = 0; i < s.data.length; i++) s.data[i] = dv.getUint16(b[0] + 2 * i, true)
        } else {
          throw new Error(`lif: ${s.bytesInc}-byte samples are not supported`)
        }
      }
      s.suggest = { lineFrequencyHz: 1 / s.lineTimeS, pixelTimeUs: s.dwellTimeS * 1e6 }
    }
    return { format: 'lif', series }
  }

  return { readLif, listSeries, parseXml, findAll, find }
})
