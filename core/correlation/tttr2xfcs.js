// Photon arrival-time correlator for time-tagged (TTTR) data.
//
// Ported from tttr2xfcs in
// legacy/point/focuspoint/correlation_methods/correlation_methods.py, which
// translates the MATLAB code of:
//   M. Wahl, I. Gregor, M. Patting, J. Enderlein, "Fast calculation of
//   fluorescence correlation data with asynchronous time-correlated
//   single-photon counting", Opt. Express 11, 3583 (2003).
// fib4.dividAndConquer (Cython) is the sorted-array intersection below.
//
// The port follows the Python step by step (np.round's round-half-to-even,
// fib4's intersection), with one fix, on by default: when photons are merged
// into coarser time bins, each bin's weight is the sum of the weights of the
// photons in it. The MATLAB original got this from cumsum/diff at the index
// unique() returned, which was the *last* occurrence before MATLAB R2013a;
// np.unique (and MATLAB since R2013a) return the *first* occurrence, which
// shifts weight between neighbouring bins. options.legacy = true reproduces
// FoCuS-point exactly. See docs/porting-notes.md in the FoCuS-Fit-Pro repository.

FocusCore.define('correlation/tttr2xfcs', [], function () {
  'use strict'

  /** np.round(x, 0): round half to even. */
  function roundHalfEven (x) {
    const f = Math.floor(x)
    const d = x - f
    if (d > 0.5) return f + 1
    if (d < 0.5) return f
    return f % 2 === 0 ? f : f + 1
  }

  /**
   * np.unique(y, return_index=True): the sorted distinct values of y and,
   * for each, the index of its first occurrence in y.
   * @param {Float64Array} y
   * @returns {{values: Float64Array, first: Uint32Array}}
   */
  function uniqueFirst (y) {
    const n = y.length
    let sorted = true
    for (let i = 1; i < n; i++) if (y[i] < y[i - 1]) { sorted = false; break }
    let order = null
    if (!sorted) {
      // Stable argsort (np.unique uses a mergesort when return_index is set).
      order = new Uint32Array(n)
      for (let i = 0; i < n; i++) order[i] = i
      order.sort((a, b) => (y[a] - y[b]) || (a - b))
    }
    const values = new Float64Array(n)
    const first = new Uint32Array(n)
    let m = 0
    for (let p = 0; p < n; p++) {
      const i = sorted ? p : order[p]
      const v = y[i]
      if (m === 0 || v !== values[m - 1]) {
        values[m] = v
        first[m] = i
        m++
      }
    }
    return { values: values.slice(0, m), first: first.slice(0, m) }
  }

  /**
   * Merge photons that share a time: the sorted distinct times and, for
   * each, the summed weight of its photons in each channel. This is what the
   * MATLAB cumsum/diff step computed with last-occurrence indices; unlike
   * that step it does not need the times to be sorted.
   * @param {Float64Array} y times
   * @param {Float64Array} w0 channel-0 weight of each time
   * @param {Float64Array} w1 channel-1 weight of each time
   * @returns {{values: Float64Array, w0: Float64Array, w1: Float64Array}}
   */
  function groupSums (y, w0, w1) {
    const n = y.length
    let sorted = true
    for (let i = 1; i < n; i++) if (y[i] < y[i - 1]) { sorted = false; break }
    let order = null
    if (!sorted) {
      order = new Uint32Array(n)
      for (let i = 0; i < n; i++) order[i] = i
      order.sort((a, b) => (y[a] - y[b]) || (a - b))
    }
    const values = new Float64Array(n)
    const s0 = new Float64Array(n)
    const s1 = new Float64Array(n)
    let m = 0
    for (let p = 0; p < n; p++) {
      const i = sorted ? p : order[p]
      const v = y[i]
      if (m === 0 || v !== values[m - 1]) {
        values[m] = v
        m++
      }
      s0[m - 1] += w0[i]
      s1[m - 1] += w1[i]
    }
    return { values: values.slice(0, m), w0: s0.slice(0, m), w1: s1.slice(0, m) }
  }

  /**
   * Correlate photon arrival times.
   * @param {Float64Array} yIn arrival times of the photons of both channels,
   *   in ns (any time unit works; autotime is returned in that unit / 1e6)
   * @param {Float64Array[]} numIn two weight arrays, one per channel: 1 where
   *   the photon at that index belongs to the channel, else 0
   * @param {number} NcascStart first cascade level that is correlated
   * @param {number} NcascEnd number of cascade levels
   * @param {number} Nsub lags per cascade level
   * @param {{legacy?: boolean, onProgress?: function(number)}} [options]
   *   legacy: reproduce FoCuS-point's first-occurrence binning exactly
   *   (default false: summed bin weights). onProgress: called after each
   *   cascade level with an estimate of the fraction done (0-1); it does not
   *   affect the result.
   * @returns {{auto: Float64Array, autotime: Float64Array, channels: number}}
   *   auto: un-normalised correlations, auto[t*4 + a*2 + b] for lag t and
   *   channels a, b (a=b auto, a!=b cross), as auto[t, a, b] in the Python.
   *   autotime: lag times in ms (for yIn in ns). Lags that are never
   *   computed (zero autotime) are removed, as in the Python.
   */
  function tttr2xfcs (yIn, numIn, NcascStart, NcascEnd, Nsub, options) {
    const legacy = !!(options && options.legacy)
    const onProgress = options && typeof options.onProgress === 'function' ? options.onProgress : null
    // Work per level is about (distinct times left) x Nsub. After level k the
    // times are in bins of 2^(k+1), so at most dt / 2^(k+1) remain: the work
    // left is estimated as sum over later levels of min(n now, dt / 2^k).
    let workDone = 0
    const C = 2
    let n = yIn.length
    let yMin = Infinity
    let yMax = -Infinity
    for (let i = 0; i < n; i++) {
      if (yIn[i] < yMin) yMin = yIn[i]
      if (yIn[i] > yMax) yMax = yIn[i]
    }
    const dt = yMax - yMin
    let y = new Float64Array(n)
    for (let i = 0; i < n; i++) y[i] = roundHalfEven(yIn[i])
    let num0 = Float64Array.from(numIn[0])
    let num1 = Float64Array.from(numIn[1])

    const rows = (NcascEnd + 1) * (Nsub + 1)
    const autotime = new Float64Array(rows)
    const auto = new Float64Array(rows * C * C)
    let shift = 0
    let delta = 1

    for (let j = 0; j < NcascEnd; j++) {
      if (!legacy) {
        // Merge photons that share a time; each bin carries their summed weight.
        const g = groupSums(y, num0, num1)
        y = g.values
        n = y.length
        num0 = g.w0
        num1 = g.w1
      } else {
        // Legacy (FoCuS-point): unique photon times, and weights from cumsum +
        // diff at np.unique's first-occurrence indices.
        const u = uniqueFirst(y)
        const k1 = u.first
        const m = k1.length
        let cs0 = 0
        let cs1 = 0
        const cum0 = new Float64Array(n)
        const cum1 = new Float64Array(n)
        for (let i = 0; i < n; i++) {
          cs0 += num0[i]; cum0[i] = cs0
          cs1 += num1[i]; cum1[i] = cs1
      }
      const next0 = new Float64Array(m)
      const next1 = new Float64Array(m)
      let prev0 = 0
      let prev1 = 0
      for (let q = 0; q < m; q++) {
        const c0 = cum0[k1[q]]
        const c1 = cum1[k1[q]]
        next0[q] = c0 - prev0
        next1[q] = c1 - prev1
        prev0 = c0
        prev1 = c1
      }
      y = u.values
      n = m
      num0 = next0
      num1 = next1
      }

      for (let k = 0; k < Nsub; k++) {
        shift = shift + delta
        const lag = roundHalfEven(shift / delta)
        if (j >= NcascStart) {
          // fib4.dividAndConquer(y, y + lag): walk the sorted arrays and pair
          // each time t with t - lag. a indexes y, b indexes y + lag.
          let s00 = 0; let s01 = 0; let s10 = 0; let s11 = 0
          let found = false
          let a = 0
          let b = 0
          while (a < n && b < n) {
            const ya = y[a]
            const yb = y[b] + lag
            if (ya < yb) a++
            else if (yb < ya) b++
            else {
              s00 += num0[a] * num0[b]
              s01 += num0[a] * num1[b]
              s10 += num1[a] * num0[b]
              s11 += num1[a] * num1[b]
              found = true
              a++
            }
          }
          if (found) {
            const r = (k + j * Nsub) * 4
            auto[r] = s00 / delta
            auto[r + 1] = s01 / delta
            auto[r + 2] = s10 / delta
            auto[r + 3] = s11 / delta
          }
        }
        autotime[k + j * Nsub] = shift
      }
      if (onProgress) {
        workDone += n
        let workLeft = 0
        for (let k = j + 1; k < NcascEnd; k++) workLeft += Math.min(n, dt / Math.pow(2, k) + 1)
        onProgress(workDone / (workDone + workLeft))
      }
      // Equivalent to MATLAB round when numbers are .5
      const halved = new Float64Array(n)
      for (let i = 0; i < n; i++) halved[i] = Math.ceil(0.5 * y[i])
      y = halved
      delta = 2 * delta
    }

    for (let t = 0; t < rows; t++) {
      for (let q = 0; q < 4; q++) auto[t * 4 + q] = auto[t * 4 + q] * dt / (dt - autotime[t])
    }
    // Remove the trailing zeros.
    const keep = []
    for (let t = 0; t < rows; t++) if (autotime[t] / 1000000 !== 0) keep.push(t)
    const outTime = new Float64Array(keep.length)
    const outAuto = new Float64Array(keep.length * 4)
    keep.forEach((t, i) => {
      outTime[i] = autotime[t] / 1000000
      outAuto.set(auto.subarray(t * 4, t * 4 + 4), i * 4)
    })
    return { auto: outAuto, autotime: outTime, channels: C }
  }

  return { tttr2xfcs, roundHalfEven, uniqueFirst, groupSums }
})
