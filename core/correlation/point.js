// Point-FCS analysis of a photon file: channels, micro-time decay
// histograms, intensity time series, count statistics, auto- and
// cross-correlation, and lifetime (micro-time) gating.
//
// Ported from legacy/point/focuspoint/correlation_objects.py:
//   picoObject.processData, picoObject.crossAndAuto,
//   picoObject.subArrayGeneration / subPicoObject (gating),
//   photonCountingStats, calc_coincidence_value
// and delayTime2bin from correlation_methods.py. GUI state is left out.

FocusCore.define('correlation/point', ['correlation/tttr2xfcs'], function (xfcs) {
  'use strict'

  /**
   * FoCuS-point GUI defaults (correlation_gui.py; photonCountBin is fixed at
   * 25). legacy: false uses summed bin weights in tttr2xfcs; true reproduces
   * FoCuS-point exactly (see correlation/tttr2xfcs).
   */
  const DEFAULTS = Object.freeze({ NcascStart: 0, NcascEnd: 25, Nsub: 6, winInt: 10, photonCountBin: 25, legacy: false })

  /** np.linspace(start, stop, num) with endpoint=True. */
  function linspace (start, stop, num) {
    const out = new Float64Array(num)
    const div = num - 1
    const delta = stop - start
    if (div > 0) {
      const step = delta / div
      for (let i = 0; i < num; i++) out[i] = step === 0 ? (i / div) * delta + start : i * step + start
      out[num - 1] = stop
    } else if (num === 1) {
      out[0] = start
    }
    return out
  }

  /**
   * np.histogram(values, edges) for explicit edges: bin i holds
   * edges[i] <= x < edges[i+1], the last bin also holds x == edges[last];
   * values outside the edges are not counted.
   */
  function histogram (values, edges) {
    const nb = edges.length - 1
    const counts = new Float64Array(Math.max(nb, 0))
    if (nb <= 0) return counts
    const lo = edges[0]
    const hi = edges[nb]
    for (let k = 0; k < values.length; k++) {
      const x = values[k]
      if (!(x >= lo && x <= hi)) continue
      // largest i with edges[i] <= x
      let a = 0
      let b = nb
      while (a < b) {
        const mid = (a + b + 1) >> 1
        if (edges[mid] <= x) a = mid
        else b = mid - 1
      }
      counts[a === nb ? nb - 1 : a]++
    }
    return counts
  }

  /**
   * delayTime2bin: histogram of one channel's times from 0 in bins of
   * winInt, dropping the incomplete last bin.
   * @param {ArrayLike<number>} times per-record times (micro-time channels for
   *   the decay; macro-time in ms for the intensity trace)
   * @param {Uint8Array} channel per-record channel
   * @param {number} chanNum channel to histogram
   * @param {number} winInt bin width, in the units of times
   * @returns {{counts: Float64Array, centres: Float64Array}} photons per bin
   *   and bin centres (units of times)
   */
  function delayTime2bin (times, channel, chanNum, winInt) {
    const sel = []
    let max = -Infinity
    for (let i = 0; i < times.length; i++) {
      if (channel[i] === chanNum) {
        sel.push(times[i])
        if (times[i] > max) max = times[i]
      }
    }
    // np.max(...).astype(np.int32): truncate toward zero
    const tempLastDecayTime = Math.trunc(max) | 0
    const numBins = Math.floor((tempLastDecayTime - 0) / winInt)
    const lastDecayTime = numBins * winInt
    const bins = linspace(0, lastDecayTime, numBins + 1)
    const counts = histogram(sel, bins)
    const centres = new Float64Array(Math.max(numBins, 0))
    for (let i = 0; i < centres.length; i++) centres[i] = bins[i] + (winInt / 2)
    return { counts, centres }
  }

  /** Pairwise-free mean, as np.average for these array sizes (tolerance 1e-6). */
  function mean (a) {
    let s = 0
    for (let i = 0; i < a.length; i++) s += a[i]
    return s / a.length
  }

  /**
   * photonCountingStats: count rate and number & brightness from an
   * intensity trace.
   * @param {Float64Array} timeSeries photons per bin
   * @param {Float64Array} timeSeriesScale bin centres (ms)
   * @returns {{kcount: number, brightnessNandB: number, numberNandB: number}}
   *   kcount: mean photons per bin (per photonCountBin ms, as in FoCuS-point);
   *   brightnessNandB: (var - mean) / mean / unit, unit = last centre / bins (ms);
   *   numberNandB: mean^2 / (var - mean), or 0 when var == mean
   */
  function photonCountingStats (timeSeries, timeSeriesScale) {
    const unit = timeSeriesScale[timeSeriesScale.length - 1] / timeSeriesScale.length
    const kcount = mean(timeSeries)
    const raw = kcount
    let v = 0
    for (let i = 0; i < timeSeries.length; i++) { const d = timeSeries[i] - raw; v += d * d }
    const varCount = v / timeSeries.length
    const brightnessNandB = ((varCount - raw) / raw) / unit
    const numberNandB = (varCount - raw) === 0 ? 0 : (raw * raw) / (varCount - raw)
    return { kcount, brightnessNandB, numberNandB }
  }

  /**
   * calc_coincidence_value between two intensity traces.
   * @returns {number} CV (dimensionless)
   */
  function calcCoincidenceValue (ts1, ts2) {
    const bincount = (ts) => {
      let max = 0
      for (let i = 0; i < ts.length; i++) max = Math.max(max, Math.trunc(ts[i]))
      const c = new Float64Array(max + 1)
      for (let i = 0; i < ts.length; i++) c[Math.trunc(ts[i])]++
      return c
    }
    const N1 = bincount(ts1)
    const N2 = bincount(ts2)
    const n = Math.max(N1.length, N2.length)
    let s12 = 0; let s1 = 0; let s2 = 0
    for (let i = 0; i < n; i++) {
      const a = i < N1.length ? N1[i] : 0
      const b = i < N2.length ? N2[i] : 0
      s12 += a * b; s1 += a; s2 += b
    }
    return (s12 / (s1 * s2)) * n
  }

  /**
   * crossAndAuto: correlate two channels (or one) and normalise.
   * G = auto * ceil(max trueTime) / (count_a * count_b) - 1.
   * @param {Float64Array} trueTime macro-times of all records (ns)
   * @param {Uint8Array} channel channel of each record
   * @param {number[]} channelsToUse [first, second] channel numbers
   * @param {number} numOfCH number of channels in the file (1 = autocorrelation only)
   * @param {object} params NcascStart, NcascEnd, Nsub, legacy
   * @param {function(number)} [onProgress] fraction of the correlation done (0-1)
   * @returns {{G: Float64Array[][], autotime: Float64Array, count0: number, count1: number}}
   *   G[a][b] for a, b in {0, 1}; autotime in ms
   */
  function crossAndAuto (trueTime, channel, channelsToUse, numOfCH, params, onProgress) {
    const [c0, c1] = channelsToUse
    let n = 0
    for (let i = 0; i < channel.length; i++) {
      if (channel[i] === c0 || (numOfCH > 1 && channel[i] === c1)) n++
    }
    const y = new Float64Array(n)
    const num0 = new Float64Array(n)
    const num1 = new Float64Array(n)
    let p = 0
    let count0 = 0
    let count1 = 0
    let maxAll = -Infinity
    for (let i = 0; i < channel.length; i++) {
      if (trueTime[i] > maxAll) maxAll = trueTime[i]
      const ch = channel[i]
      if (ch === c0 || (numOfCH > 1 && ch === c1)) {
        y[p] = trueTime[i]
        if (ch === c0) { num0[p] = 1; count0++ }
        if (numOfCH > 1 && ch === c1) { num1[p] = 1; count1++ }
        p++
      }
    }
    const r = xfcs.tttr2xfcs(y, [num0, num1], params.NcascStart, params.NcascEnd, params.Nsub, { legacy: !!params.legacy, onProgress: onProgress })
    const maxY = Math.ceil(maxAll)
    const L = r.autotime.length
    const G = [[new Float64Array(L), new Float64Array(L)], [new Float64Array(L), new Float64Array(L)]]
    for (let t = 0; t < L; t++) {
      G[0][0][t] = ((r.auto[t * 4] * maxY) / (count0 * count0)) - 1
      if (numOfCH > 1) {
        G[1][1][t] = ((r.auto[t * 4 + 3] * maxY) / (count1 * count1)) - 1
        G[1][0][t] = ((r.auto[t * 4 + 2] * maxY) / (count1 * count0)) - 1
        G[0][1][t] = ((r.auto[t * 4 + 1] * maxY) / (count0 * count1)) - 1
      }
    }
    return { G, autotime: r.autotime, count0, count1 }
  }

  /**
   * subArrayGeneration: lifetime gating. Records whose micro-time is outside
   * [xmin, xmax] (inclusive; the limits may be given in either order) are
   * moved to channel 16, which is then ignored.
   * @param {Uint8Array} channel
   * @param {Int32Array} dTime micro-time (TCSPC channels)
   * @returns {Uint8Array} a gated copy of channel
   */
  function gateChannels (channel, dTime, xmin, xmax) {
    if (xmax < xmin) { const t = xmin; xmin = xmax; xmax = t }
    const out = Uint8Array.from(channel)
    for (let i = 0; i < out.length; i++) {
      if (!(dTime[i] >= xmin && dTime[i] <= xmax)) out[i] = 16
    }
    return out
  }

  /**
   * picoObject.processData: everything FoCuS-point computes for one file.
   * @param {{channel: Uint8Array, trueTime: Float64Array, dTime: Int32Array}} data
   *   records from a core/io reader (trueTime in ns)
   * @param {object} [options] NcascStart, NcascEnd, Nsub, winInt (decay bin,
   *   TCSPC channels), photonCountBin (intensity bin, ms); gate: [xmin, xmax]
   *   in TCSPC channels to correlate only photons in that micro-time window
   * @param {function(number)} [onProgress] called during the correlation with
   *   the fraction done (0-1), over all channel pairs
   * @returns {object} see the fields below; times in ms unless stated
   */
  function analysePoint (data, options, onProgress) {
    const p = Object.assign({}, DEFAULTS, options || {})
    const channel = p.gate ? gateChannels(data.channel, data.dTime, p.gate[0], p.gate[1]) : data.channel
    const trueTime = data.trueTime

    // Channels present, ignoring anything above 8 (overflows, gated-out photons).
    const seen = new Set(channel)
    const chPresent = [...seen].filter((c) => c <= 8).sort((a, b) => a - b)
    const numOfCH = chPresent.length
    if (numOfCH === 0) throw new Error('No photons in channels 0-8')

    const trueTimeMs = new Float64Array(trueTime.length)
    for (let i = 0; i < trueTime.length; i++) trueTimeMs[i] = trueTime[i] / 1000000

    const perChannel = chPresent.map((ch) => {
      const decay = delayTime2bin(data.dTime, channel, ch, p.winInt)
      let dmin = Infinity; let dmax = -Infinity; let dsum = 0
      for (const v of decay.counts) { dmin = Math.min(dmin, v); dsum += v }
      const decayMin = decay.counts.map((v) => v - dmin)
      for (const v of decayMin) dmax = Math.max(dmax, v)
      const trace = delayTime2bin(trueTimeMs, channel, ch, p.photonCountBin)
      const stats = photonCountingStats(trace.counts, trace.centres)
      return {
        channel: ch,
        photonDecay: decay.counts,
        decayScale: decay.centres,
        photonDecayNorm: dsum > 0 ? decayMin.map((v) => v / dmax) : null,
        timeSeries: trace.counts,
        timeSeriesScale: trace.centres,
        kcount: stats.kcount,
        brightnessNandB: stats.brightnessNandB,
        numberNandB: stats.numberNandB
      }
    })

    // Correlate each pair of channels once; take the autocorrelations from
    // the first pair a channel appears in, as the Python does.
    const corr = chPresent.map(() => chPresent.map(() => null))
    let autotime = null
    const counts = {}
    // Progress over all the pairs: pair k of numPairs covers [k, k+1) / numPairs.
    const numPairs = numOfCH > 1 ? numOfCH * (numOfCH - 1) / 2 : 1
    let pairIndex = 0
    const pairProgress = onProgress
      ? (f) => onProgress((pairIndex + f) / numPairs)
      : undefined
    for (let i = 0; i < numOfCH; i++) {
      for (let j = i + 1; j < numOfCH; j++) {
        const r = crossAndAuto(trueTime, channel, [chPresent[i], chPresent[j]], numOfCH, p, pairProgress)
        pairIndex++
        if (!corr[i][i]) corr[i][i] = r.G[0][0]
        if (!corr[j][j]) corr[j][j] = r.G[1][1]
        corr[i][j] = r.G[0][1]
        corr[j][i] = r.G[1][0]
        autotime = r.autotime
        counts[`${i}_${j}`] = [r.count0, r.count1]
      }
    }
    if (numOfCH === 1) {
      const r = crossAndAuto(trueTime, channel, [chPresent[0], chPresent[0]], 1, p, pairProgress)
      corr[0][0] = r.G[0][0]
      autotime = r.autotime
    }

    // Curves in FoCuS-point's order: all autocorrelations, then the crosses.
    const curves = []
    for (let i = 0; i < numOfCH; i++) curves.push([i, i])
    for (let i = 0; i < numOfCH; i++) for (let j = 0; j < numOfCH; j++) if (i !== j) curves.push([i, j])

    return {
      params: p,
      chPresent,
      numOfCH,
      perChannel,
      autotime,
      corr,
      pairCounts: counts,
      curves: curves.map(([i, j]) => ({
        i,
        j,
        label: `CH${i + 1}_CH${j + 1}_${i === j ? 'Auto_Corr' : 'Cross_Corr'}`,
        autotime,
        autoNorm: corr[i][j],
        // As FoCuS-point passes to the fitter: kcount for autocorrelations,
        // CV for cross-correlations (N&B stay in perChannel).
        kcount: i === j ? perChannel[i].kcount : null,
        CV: i !== j ? calcCoincidenceValue(perChannel[i].timeSeries, perChannel[j].timeSeries) : null
      }))
    }
  }

  return {
    DEFAULTS,
    linspace,
    histogram,
    delayTime2bin,
    photonCountingStats,
    calcCoincidenceValue,
    crossAndAuto,
    gateChannels,
    analysePoint
  }
})
