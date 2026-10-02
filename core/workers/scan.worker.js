// Reading and correlating scanning-FCS files off the main thread (the
// Carpets view, scripts/carpet_view.js).
//
// A file is read once (openScan) and kept where it was read, in the worker
// or, without a worker, on the main thread; each of its carpets (the file
// itself, an .msr stack or a .lif series) can then be correlated with the
// user's settings (correlateScan). Only the results travel back: the
// correlation carpets (columns x lags) and a binned copy of the raw carpet
// for display. createScanner (main thread) starts the worker from a Blob of
// the core sources, as workers/correlate does.

FocusCore.define('workers/scan', ['io/scan', 'correlation/carpets'], function (scanIo, carpets) {
  'use strict'

  const files = new Map() // file id -> {name, read}

  function shapeText (lines, pixels) {
    return `${lines.toLocaleString()} lines × ${pixels} pixels`
  }

  /** The carpets a file offers, as FoCuS-scan's import dialogs list them. */
  function listEntries (name, read) {
    if (read.format === 'msr') {
      // Import_msr lists the time series with more than 500 lines.
      return read.stacks.map((st, i) => st.selectable
        ? { key: i, label: `${st.name} (${shapeText(st.shape[0], st.shape[1])})`, name: st.name, needsTimings: true, suggest: { lineFrequencyHz: null, pixelTimeUs: null }, channels: 1 }
        : null).filter(Boolean)
    }
    if (read.format === 'lif') {
      return read.series.map((s, i) => {
        const d = s.dimInfo
        const lines = d.length >= 3 ? d[1] * d[2] : d[1]
        return {
          key: i,
          label: `${s.name} (${shapeText(lines, d[0])}${s.lutNames.length > 1 ? ', ' + s.lutNames.length + ' channels' : ''})`,
          name: s.name,
          needsTimings: false,
          suggest: s.suggest,
          channels: s.lutNames.length,
          missing: !s.data
        }
      })
    }
    const base = name.replace(/\.[^.]+$/, '')
    const sh = read.shape
    let label = sh.join(' × ')
    let channels = 1
    if (read.format === 'czi' && sh.length === 7) { label = shapeText(sh[1], sh[5]); channels = sh[2] }
    else if (sh.length === 2) label = shapeText(sh[0], sh[1])
    else if (sh.length === 3 && sh[0] <= 2) { label = shapeText(sh[1], sh[2]); channels = sh[0] }
    if (channels > 1) label += `, ${channels} channels`
    return [{ key: 0, label: `${name} (${label})`, name: base, needsTimings: true, suggest: read.suggest, channels }]
  }

  function sourceOf (read, key) {
    if (read.format === 'msr') return { format: 'msr', stack: read.stacks[key] }
    if (read.format === 'lif') return { format: 'lif', series: read.series[key] }
    return read
  }

  /**
   * Read a scanning-FCS file and keep it for correlateScan.
   * @param {Blob} blob the file
   * @param {string} name file name (the extension picks the reader)
   * @param {number} id an id for the file, unique on the page
   * @returns {Promise<{id: number, name: string, format: string, entries: object[]}>}
   */
  async function openScan (blob, name, id) {
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const read = await scanIo.readScan(name, bytes)
    files.set(id, { name, read })
    return { id, name, format: read.format, entries: listEntries(name, read) }
  }

  /**
   * The intensity carpet binned in time for display: at most maxBins rows,
   * each the mean of `bin` lines.
   */
  function preview (ch, maxBins) {
    const rows = ch.CH0.rows
    const cols = ch.CH0.cols
    const bin = Math.max(1, Math.ceil(rows / maxBins))
    const bins = Math.ceil(rows / bin)
    const one = (m) => {
      if (!m) return null
      const out = new Float32Array(bins * cols)
      for (let r = 0; r < rows; r++) {
        const b = Math.floor(r / bin)
        for (let c = 0; c < cols; c++) out[b * cols + c] += m.data[r * cols + c]
      }
      for (let b = 0; b < bins; b++) {
        const n = Math.min(bin, rows - b * bin)
        for (let c = 0; c < cols; c++) out[b * cols + c] /= n
      }
      return out
    }
    return { rows, cols, bin, bins, ch0: one(ch.CH0), ch1: one(ch.CH1) }
  }

  /**
   * Correlate one carpet of an opened file (see correlation/carpets).
   * @param {number} id file id from openScan
   * @param {number} key entry key from openScan's entries
   * @param {object} settings scanChannels options (lineFrequencyHz,
   *   pixelTimeUs, crop) and correlateCarpets options (m, spatialBin, intTime)
   * @param {function(number)} [onProgress] fraction done
   * @returns {object} correlateCarpets result plus preview (the binned raw carpet)
   */
  function correlateScan (id, key, settings, onProgress) {
    const f = files.get(id)
    if (!f) throw new Error('scan: this file is no longer open')
    const ch = carpets.scanChannels(sourceOf(f.read, key), settings)
    const res = carpets.correlateCarpets(ch, Object.assign({}, settings, { onProgress }))
    res.preview = preview(ch, settings.previewBins || 1600)
    return res
  }

  function closeScan (id) { files.delete(id) }

  /** Message loop run inside the worker. */
  function workerMain (scope) {
    const api = scope.FocusCore.require('workers/scan')
    scope.onmessage = async function (e) {
      const { job, cmd, args } = e.data
      try {
        let result
        if (cmd === 'open') {
          result = await api.openScan(args.file, args.name, args.id)
        } else if (cmd === 'correlate') {
          let last = 0
          result = api.correlateScan(args.id, args.key, args.settings, (f) => {
            if (f - last >= 0.01 || f >= 1) { last = f; scope.postMessage({ job, progress: f }) }
          })
        } else if (cmd === 'close') {
          api.closeScan(args.id)
        }
        scope.postMessage({ job, result })
      } catch (err) {
        scope.postMessage({ job, error: String(err && err.message ? err.message : err) })
      }
    }
  }

  /**
   * Main-thread access to the scan worker (or, if no worker can be started,
   * the same functions run on the main thread).
   * @param {object} core the FocusCore registry (for workerSource)
   */
  function createScanner (core) {
    let worker = null
    try {
      const url = URL.createObjectURL(new Blob([core.workerSource(workerMain)], { type: 'text/javascript' }))
      worker = new Worker(url)
    } catch (e) {
      worker = null
    }
    let nextJob = 1
    let nextFile = 1
    const pending = new Map()
    const blobs = new Map() // file id -> File, to reopen on the main thread if the worker fails
    const local = new Set() // file ids opened on the main thread

    async function runLocal (cmd, args, onProgress) {
      if (cmd === 'open') { local.add(args.id); return openScan(args.file, args.name, args.id) }
      if (!local.has(args.id) && blobs.has(args.id)) { // opened in a worker that has since failed
        await openScan(blobs.get(args.id), blobs.get(args.id).name, args.id)
        local.add(args.id)
      }
      if (cmd === 'correlate') {
        await new Promise((resolve) => setTimeout(resolve, 0)) // let the page show the status first
        return correlateScan(args.id, args.key, args.settings, onProgress)
      }
      if (cmd === 'close') return closeScan(args.id)
    }

    function call (cmd, args, onProgress) {
      const cb = onProgress || function () {}
      if (!worker) return runLocal(cmd, args, cb)
      return new Promise((resolve, reject) => {
        const job = nextJob++
        pending.set(job, { resolve, reject, onProgress: cb, cmd, args })
        worker.postMessage({ job, cmd, args })
      })
    }

    if (worker) {
      worker.onmessage = (e) => {
        const p = pending.get(e.data.job)
        if (!p) return
        if (e.data.progress !== undefined) { p.onProgress(e.data.progress); return }
        pending.delete(e.data.job)
        if (e.data.error) p.reject(new Error(e.data.error))
        else p.resolve(e.data.result)
      }
      worker.onerror = (e) => {
        const jobs = [...pending.values()]
        pending.clear()
        worker = null
        for (const p of jobs) runLocal(p.cmd, p.args, p.onProgress).then(p.resolve, p.reject)
        if (e && e.preventDefault) e.preventDefault()
      }
    }

    return {
      get usesWorker () { return worker !== null },
      /** Read a File; resolves to {id, name, format, entries}. */
      open (file) {
        const id = nextFile++
        blobs.set(id, file)
        return call('open', { file, name: file.name, id })
      },
      /** Correlate entry `key` of file `id`; onProgress(fraction). */
      correlate (id, key, settings, onProgress) { return call('correlate', { id, key, settings }, onProgress) },
      close (id) { blobs.delete(id); return call('close', { id }) }
    }
  }

  return { openScan, correlateScan, closeScan, listEntries, preview, workerMain, createScanner }
})
