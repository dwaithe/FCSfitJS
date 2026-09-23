// Chooses the photon file reader from the file extension, as
// picoObject.processData does (correlation_objects.py).

FocusCore.define('io/tttr', ['io/pt3', 'io/ptu', 'io/pt2', 'io/spc', 'io/asc', 'io/tttr_csv'],
  function (pt3, ptu, pt2, spc, asc, csv) {
    'use strict'

    const READERS = {
      pt3: pt3.readPt3,
      ptu: ptu.readPtu,
      pt2: pt2.readPt2,
      spc: spc.readSpc,
      asc: asc.readAsc,
      csv: csv.readTttrCsv
    }

    /** Lower-case extension after the last '.', as picoObject uses it. */
    function extension (name) {
      const parts = String(name).split('/').pop().split('\\').pop().split('.')
      return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
    }

    /**
     * Read a photon file of any supported type.
     * @param {string} name file name (only the extension is used)
     * @param {ArrayBuffer|Uint8Array} data the file contents
     * @returns {object} records as described in io/records
     */
    function readTttr (name, data) {
      const ext = extension(name)
      const reader = READERS[ext]
      if (!reader) throw new Error(`Unsupported photon file type ".${ext}" (${name})`)
      return reader(data)
    }

    /**
     * Streaming reader for the binary formats (pt3, ptu, pt2, spc): give it
     * the first chunk (which must contain the whole header), then push the
     * rest, then call finish(). Text formats are collected and parsed at the end.
     */
    function createTttrDecoder (name, firstChunk) {
      const ext = extension(name)
      let header, dec
      if (ext === 'pt3') { header = pt3.parsePt3Header(firstChunk); dec = pt3.createPt3Decoder(header) }
      else if (ext === 'pt2') { header = pt2.parsePt2Header(firstChunk); dec = pt2.createPt2Decoder(header) }
      else if (ext === 'ptu') { header = ptu.parsePtuHeader(firstChunk); dec = ptu.createPtuDecoder(header) }
      else if (ext === 'spc') { header = spc.parseSpcHeader(firstChunk); dec = spc.createSpcDecoder(header) }
      else if (READERS[ext]) {
        const chunks = [firstChunk]
        return {
          push: (c) => chunks.push(c),
          finish () {
            let n = 0
            for (const c of chunks) n += c.byteLength
            const all = new Uint8Array(n)
            let p = 0
            for (const c of chunks) { all.set(new Uint8Array(c.buffer || c, c.byteOffset || 0, c.byteLength), p); p += c.byteLength }
            return READERS[ext](all)
          }
        }
      } else throw new Error(`Unsupported photon file type ".${ext}" (${name})`)
      const first = firstChunk instanceof Uint8Array ? firstChunk : new Uint8Array(firstChunk)
      dec.push(first.subarray(header.headerBytes))
      return dec
    }

    return { readTttr, createTttrDecoder, extension, EXTENSIONS: Object.keys(READERS) }
  })
