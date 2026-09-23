// Reading and correlating photon files off the main thread.
//
// correlateBlob reads a File/Blob in chunks, decodes it with core/io and
// runs the point analysis. createCorrelator (main thread) starts a Web
// Worker from a Blob of the core sources (FocusCore.workerSource), which
// works on file:// pages and in Electron, and falls back to running on the
// main thread if a worker cannot be created.

FocusCore.define('workers/correlate', ['io/tttr', 'correlation/point'], function (tttr, point) {
  'use strict'

  const CHUNK_BYTES = 8 * 1024 * 1024

  /**
   * Read, decode and correlate one photon file.
   * @param {Blob} blob the file (a File in the browser)
   * @param {string} name file name; the extension picks the reader
   * @param {object} [options] see correlation/point analysePoint
   * @param {function(object)} [onProgress] called with {stage, fraction}
   * @returns {Promise<object>} analysePoint result plus {name, records}
   */
  async function correlateBlob (blob, name, options, onProgress) {
    const progress = onProgress || function () {}
    const size = blob.size
    let pos = Math.min(size, CHUNK_BYTES)
    const first = new Uint8Array(await blob.slice(0, pos).arrayBuffer())
    const dec = tttr.createTttrDecoder(name, first)
    progress({ stage: 'reading', fraction: size ? pos / size : 1 })
    while (pos < size) {
      const end = Math.min(size, pos + CHUNK_BYTES)
      dec.push(new Uint8Array(await blob.slice(pos, end).arrayBuffer()))
      pos = end
      progress({ stage: 'reading', fraction: pos / size })
    }
    const data = dec.finish()
    progress({ stage: 'correlating', fraction: 0 })
    // Post at most about every 1% so the messages stay cheap.
    let last = 0
    const result = point.analysePoint(data, options, (f) => {
      if (f - last >= 0.01 || f >= 1) { last = f; progress({ stage: 'correlating', fraction: f }) }
    })
    progress({ stage: 'done', fraction: 1 })
    result.name = name
    result.records = data.length
    return result
  }

  /** Message loop run inside the worker (source is copied into the Blob). */
  function workerMain (scope) {
    const run = scope.FocusCore.require('workers/correlate').correlateBlob
    scope.onmessage = async function (e) {
      const { id, file, name, options } = e.data
      try {
        const result = await run(file, name, options, (p) => scope.postMessage({ id, progress: p }))
        scope.postMessage({ id, result })
      } catch (err) {
        scope.postMessage({ id, error: String(err && err.message ? err.message : err) })
      }
    }
  }

  /**
   * Main-thread correlator. Uses a Web Worker when possible.
   * @param {object} core the FocusCore registry (for workerSource)
   * @returns {{correlate: function(File, object, function): Promise<object>, usesWorker: boolean}}
   */
  function createCorrelator (core) {
    let worker = null
    try {
      const url = URL.createObjectURL(new Blob([core.workerSource(workerMain)], { type: 'text/javascript' }))
      worker = new Worker(url)
    } catch (e) {
      worker = null
    }
    let nextId = 1
    const pending = new Map()
    if (worker) {
      worker.onmessage = (e) => {
        const job = pending.get(e.data.id)
        if (!job) return
        if (e.data.progress) { job.onProgress(e.data.progress); return }
        pending.delete(e.data.id)
        if (e.data.error) job.reject(new Error(e.data.error))
        else job.resolve(e.data.result)
      }
      worker.onerror = (e) => {
        // A worker that fails to start: finish outstanding jobs on the main thread.
        const jobs = [...pending.values()]
        pending.clear()
        worker = null
        for (const job of jobs) correlateBlob(job.file, job.file.name, job.options, job.onProgress).then(job.resolve, job.reject)
        if (e && e.preventDefault) e.preventDefault()
      }
    }
    return {
      get usesWorker () { return worker !== null },
      correlate (file, options, onProgress) {
        const cb = onProgress || function () {}
        if (!worker) return correlateBlob(file, file.name, options, cb)
        return new Promise((resolve, reject) => {
          const id = nextId++
          pending.set(id, { resolve, reject, onProgress: cb, file, options })
          worker.postMessage({ id, file, name: file.name, options })
        })
      }
    }
  }

  return { correlateBlob, workerMain, createCorrelator, CHUNK_BYTES }
})
