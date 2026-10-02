// Helpers for the Photon data view: intensity traces at a coarser bin,
// per-channel summaries and CSV tables, from an analysePoint result
// (core/correlation/point.js). New code, not a port: FoCuS-point computes
// the same quantities in its "Load TCSPC" tab.

FocusCore.define('correlation/traces', [], function () {
  'use strict'

  /**
   * Sum an intensity trace into bins `factor` times wider. An incomplete
   * last group is dropped, as delayTime2bin drops an incomplete last bin.
   * @param {ArrayLike<number>} counts photons per bin
   * @param {ArrayLike<number>} centres bin centres (ms)
   * @param {number} factor whole number of bins per new bin (>= 1)
   * @returns {{counts: Float64Array, centres: Float64Array}} photons per new
   *   bin and new bin centres (ms)
   */
  function rebinTrace (counts, centres, factor) {
    const f = Math.max(1, Math.floor(factor))
    const n = Math.floor(counts.length / f)
    const outCounts = new Float64Array(n)
    const outCentres = new Float64Array(n)
    for (let b = 0; b < n; b++) {
      let s = 0
      let c = 0
      for (let i = b * f; i < (b + 1) * f; i++) { s += counts[i]; c += centres[i] }
      outCounts[b] = s
      outCentres[b] = c / f
    }
    return { counts: outCounts, centres: outCentres }
  }

  /**
   * Bin width of a trace from its centres (ms): bins start at 0, so the
   * first centre is half a bin.
   */
  function binWidth (centres) {
    if (centres.length > 1) return centres[1] - centres[0]
    return centres.length ? 2 * centres[0] : 0
  }

  /**
   * Per-channel summary of a point analysis.
   * @param {object} result analysePoint result
   * @returns {{channels: Array<{label: string, photons: number, durationMs: number,
   *   rateKHz: number, brightness: number, number: number}>,
   *   pairs: Array<{label: string, cv: number}>}}
   *   photons and duration over the complete trace bins; rateKHz = photons
   *   per ms; brightness (N&B, counts per ms per molecule, i.e. kHz) and
   *   number (N&B) as FoCuS-point computes them; cv: the coincidence value
   *   of each pair of channels.
   */
  function summarise (result) {
    const channels = result.perChannel.map((pc, i) => {
      let photons = 0
      for (let k = 0; k < pc.timeSeries.length; k++) photons += pc.timeSeries[k]
      const durationMs = pc.timeSeries.length * binWidth(pc.timeSeriesScale)
      return {
        label: `CH${i + 1}`,
        photons,
        durationMs,
        rateKHz: durationMs > 0 ? photons / durationMs : 0,
        brightness: pc.brightnessNandB,
        number: pc.numberNandB
      }
    })
    const pairs = []
    for (const c of result.curves) {
      if (c.i < c.j && c.CV !== null && c.CV !== undefined) pairs.push({ label: `CH${c.i + 1}-CH${c.j + 1}`, cv: c.CV })
    }
    return { channels, pairs }
  }

  /**
   * A CSV table with one column of x values and one column per channel.
   * Channels whose arrays are shorter than x get empty cells.
   * @param {string} xLabel heading of the first column
   * @param {ArrayLike<number>} x
   * @param {string[]} labels channel headings
   * @param {ArrayLike<number>[]} columns one array per channel
   * @returns {string}
   */
  function tableCsv (xLabel, x, labels, columns) {
    const lines = [[xLabel].concat(labels).join(',')]
    for (let i = 0; i < x.length; i++) {
      const row = [x[i]]
      for (const col of columns) row.push(i < col.length ? col[i] : '')
      lines.push(row.join(','))
    }
    return lines.join('\n') + '\n'
  }

  return { rebinTrace, binWidth, summarise, tableCsv }
})
