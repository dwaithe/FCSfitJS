// Scanning-FCS carpets and their correlation, ported from
// legacy/scan/focusscan/scorrelation_objects.py (scanObject.processData,
// calc_carpet, calc_signal_to_noise). GUI state is left out.
//
// A carpet is lines (time) x pixels (position along the scanned line). Each
// column (optionally summed with its neighbours, "spatial binning") is
// correlated over time with the multiple-tau correlator, giving one G(tau)
// curve per column: the correlation carpet. With two channels, each channel
// is autocorrelated and the channels are cross-correlated.
//
// Two steps, as in scanObject:
//   scanChannels(source, opts)    the channel carpets formed from a reader's
//                                 output (processData, per file format), with
//                                 FoCuS-scan's crop (start/end line, columns)
//   correlateCarpets(ch, opts)    the correlation carpets and per-column
//                                 statistics (processData tail, calc_carpet)
//
// Quirks of the Python are kept on purpose (CLAUDE.md: port faithfully) and
// listed in docs/porting-notes.md in the FoCuS-Fit-Pro repository. Three are fixed, as agreed with the
// maintainer (README.md, implementation notes): the correlator's last level,
// spatial binning (s centred pixels) and the crop (applied once, all pixels
// by default).

FocusCore.define('correlation/carpets', ['correlation/multipletau'], function (mt) {
  'use strict'

  const { pairwiseSum, mean, variance } = mt // (numpy's summation order)

  // ------------------------------------------------------------ helpers

  /** A carpet: rows x cols, row-major Float64Array. */
  function matrix (rows, cols, data) {
    return { rows, cols, data: data || new Float64Array(rows * cols) }
  }

  /** Bounds of the Python slice [start:stop] (null = omitted) on a length. */
  function pySlice (len, start, stop) {
    const norm = (v, dflt) => {
      if (v === null || v === undefined) return dflt
      if (v < 0) return Math.max(0, len + v)
      return Math.min(v, len)
    }
    const lo = norm(start, 0)
    const hi = norm(stop, len)
    return [lo, Math.max(lo, hi)]
  }

  /** mat[r0:r1, c0:c1] with Python slice rules (a copy). */
  function crop (mat, r0, r1, c0, c1) {
    const [a, b] = pySlice(mat.rows, r0, r1)
    const [c, d] = pySlice(mat.cols, c0, c1)
    const out = matrix(b - a, d - c)
    for (let r = a; r < b; r++) {
      for (let q = c; q < d; q++) out.data[(r - a) * out.cols + (q - c)] = mat.data[r * mat.cols + q]
    }
    return out
  }

  /** A sub-array of a C-order array of the given shape, taken as a matrix. */
  function planeOf (data, offset, rows, cols) {
    const out = matrix(rows, cols)
    for (let i = 0; i < rows * cols; i++) out.data[i] = data[offset + i]
    return out
  }

  function maxOf (arr) {
    let v = -Infinity
    for (let i = 0; i < arr.length; i++) if (arr[i] > v) v = arr[i]
    return v
  }

  function total (arr) {
    let s = 0
    for (let i = 0; i < arr.length; i++) s += arr[i]
    return s
  }

  // ------------------------------------------------------------ channels

  /**
   * The channel carpets scanObject forms from an imported file
   * (processData, before correlation).
   *
   * @param {object} source what io/scan's readScan returned, for .lsm, .czi
   *   and .tif; for .msr {format: 'msr', stack} with one of its stacks; for
   *   .lif {format: 'lif', series} with one of its series
   * @param {object} [opts]
   * @param {number} [opts.lineFrequencyHz] line sampling (Hz), as typed in
   *   the import dialog (not used for .lif, which stores its line time)
   * @param {number} [opts.pixelTimeUs] pixel dwell time (us), as typed in the
   *   import dialog (not used for .lif)
   * @param {number} [opts.startPt=0] first line kept (crop)
   * @param {number} [opts.endPt=0] line after the last kept; 0 = no crop
   * @param {?number} [opts.cmin=null] first column kept (crop; with cmax)
   * @param {?number} [opts.cmax=null] column after the last kept
   * @returns {{numOfCH: number, CH0: {rows, cols, data: Float64Array},
   *   CH1: ?{rows, cols, data: Float64Array}, deltatMs: number, dwellTimeS: number}}
   *   deltatMs: time between lines (ms); dwellTimeS: pixel dwell time (s)
   */
  function scanChannels (source, opts) {
    const o = opts || {}
    const startPt = Math.trunc(o.startPt || 0)
    const endPt = Math.trunc(o.endPt || 0)
    let cmin = null
    let cmax = null
    if (o.cmin !== null && o.cmin !== undefined && o.cmax !== null && o.cmax !== undefined) {
      cmin = Math.trunc(o.cmin)
      cmax = Math.trunc(o.cmax)
    }
    const fmt = source.format
    let CH0 = null
    let CH1 = null
    let numOfCH
    let deltat
    let dwell
    const dialogTimes = () => {
      if (!(o.lineFrequencyHz > 0) || !(o.pixelTimeUs > 0)) throw new Error('carpets: the line frequency (Hz) and pixel time (us) are needed for this file')
    }

    if (fmt === 'czi') {
      dialogTimes()
      deltat = 1000 / o.lineFrequencyHz
      dwell = o.pixelTimeUs / 1000000
      const s = source.shape
      if (s.length !== 7) throw new Error(`carpets: unrecognised czi file shape [${s}]`)
      numOfCH = s[2]
      if (numOfCH === 1) {
        if (source.data.length !== s[1] * s[5]) throw new Error(`carpets: cannot reshape czi data of shape [${s}] into ${s[1]} lines x ${s[5]} pixels`)
        CH0 = planeOf(source.data, 0, s[1], s[5])
      } else if (numOfCH === 2) {
        // temp[:, :, c].reshape(s1, s5)
        if (s[0] * s[3] * s[4] * s[6] !== 1) throw new Error(`carpets: cannot reshape czi data of shape [${s}] into ${s[1]} lines x ${s[5]} pixels`)
        const mk = (c) => {
          const out = matrix(s[1], s[5])
          for (let t = 0; t < s[1]; t++) {
            const off = (t * s[2] + c) * s[5]
            for (let x = 0; x < s[5]; x++) out.data[t * s[5] + x] = source.data[off + x]
          }
          return out
        }
        CH0 = mk(0)
        CH1 = mk(1)
      } else {
        throw new Error(`carpets: unrecognised czi file shape [${s}] (${numOfCH} channels)`)
      }
      if (cmin === null) cmin = 0
      if (cmax === null) cmax = CH0.cols
      if (endPt !== 0) {
        CH0 = crop(CH0, startPt, endPt, cmin, cmax)
        if (numOfCH === 2) CH1 = crop(CH1, startPt, endPt, cmin, cmax)
      }
    } else if (fmt === 'tif') {
      dialogTimes()
      deltat = 1000 / o.lineFrequencyHz
      dwell = o.pixelTimeUs / 1000000
      numOfCH = 1
      const s = source.shape
      const d = source.data
      if (s.length === 2) {
        CH0 = planeOf(d, 0, s[0], s[1])
      } else if (s.length === 3 && s[0] === 1) {
        // temp.reshape(s0, s1): only possible for a single-pixel line
        if (d.length !== s[0] * s[1]) throw new Error(`carpets: cannot reshape tif data of shape [${s}] into ${s[0]} x ${s[1]}`)
        CH0 = planeOf(d, 0, s[0], s[1])
      } else if (s.length === 3 && s[0] > 2) {
        CH0 = planeOf(d, 0, s[0] * s[1], s[2]) // pages stacked in time
      } else if (s.length === 3 && s[0] === 2) {
        CH0 = planeOf(d, 0, s[1], s[2])
        CH1 = planeOf(d, s[1] * s[2], s[1], s[2])
        numOfCH = 2
        // (FoCuS-scan cropped here as well as below, so a start line or first
        // column other than 0 was applied twice; fixed: cropped once, below.)
        if (total(CH1.data) === 0) numOfCH = 1
      } else if (s.length === 4) {
        // temp[:, 0] of each 4-D block (CH1 is the same channel, and unused)
        const rows = s[0] * s[2]
        CH0 = matrix(rows, s[3])
        const plane = s[2] * s[3]
        for (let a = 0; a < s[0]; a++) {
          for (let i = 0; i < plane; i++) CH0.data[a * plane + i] = d[a * s[1] * plane + i]
        }
      } else {
        throw new Error(`carpets: unrecognised tif file shape [${s}]`)
      }
      if (cmin === null) cmin = 0
      if (cmax === null) cmax = CH0.cols
      if (endPt !== 0 && numOfCH === 1) CH0 = crop(CH0, startPt, endPt, cmin, cmax)
      if (endPt !== 0 && numOfCH === 2) {
        CH0 = crop(CH0, startPt, endPt, cmin, cmax)
        CH1 = crop(CH1, startPt, endPt, cmin, cmax)
      }
    } else if (fmt === 'lsm') {
      dialogTimes()
      const s = source.shape
      const d = source.data
      let ch0
      let ch1 = null
      let dimSize
      if (s.length > 3) throw new Error(`carpets: unrecognised lsm file shape [${s}]`)
      if (s.length === 3) {
        dimSize = [s[1], s[2]]
        numOfCH = 2
        ch0 = planeOf(d, 0, s[1], s[2])
        ch1 = planeOf(d, s[1] * s[2], s[1], s[2])
        // An empty channel is replaced by the other one (the Python copies it
        // over every channel of the stack).
        if (total(ch0.data) === 0) { ch0 = matrix(ch1.rows, ch1.cols, ch1.data.slice()); numOfCH = 1 }
        if (total(ch1.data) === 0) { ch1 = matrix(ch0.rows, ch0.cols, ch0.data.slice()); numOfCH = 1 }
      } else {
        dimSize = [s[0], s[1]]
        numOfCH = 1
        ch0 = planeOf(d, 0, s[0], s[1])
      }
      deltat = 1000 / o.lineFrequencyHz
      dwell = o.pixelTimeUs / 1000000
      if (cmin === null) cmin = 0
      if (cmax === null) cmax = dimSize[1] // all pixels (FoCuS-scan: dimSize[0], the number of lines)
      CH0 = endPt !== 0 ? crop(ch0, startPt, endPt, cmin, cmax) : ch0
      if (numOfCH === 2) CH1 = endPt !== 0 ? crop(ch1, startPt, endPt, cmin, cmax) : ch1
    } else if (fmt === 'msr') {
      dialogTimes()
      const st = source.stack
      dwell = o.pixelTimeUs / 1000000
      if (st.size.length < 3) throw new Error('carpets: msr stack has fewer than 3 dimensions')
      deltat = (1.0 / o.lineFrequencyHz) * 1000
      numOfCH = 1 // (the importer names one channel, 'Red')
      CH0 = planeOf(st.data, 0, st.shape[0], st.shape[1]) // image.T
      if (cmin === null) cmin = 0
      if (cmax === null) cmax = CH0.cols
      if (endPt !== 0) CH0 = crop(CH0, startPt, endPt, cmin, cmax)
    } else if (fmt === 'lif') {
      const se = source.series
      if (!se.data) throw new Error('carpets: this lif series has no data in the file')
      dwell = se.dwellTimeS
      if (se.dimInfo.length < 3) throw new Error(`carpets: lif series "${se.name}" has fewer than 3 dimensions`)
      const [d0, d1, d2] = se.dimInfo
      deltat = se.lineTimeS * 1000
      numOfCH = se.lutNames.length
      if (cmin === null) cmin = 0
      if (cmax === null) cmax = d0
      if (numOfCH === 1) {
        if (se.data.length !== d0 * d1 * d2) throw new Error(`carpets: cannot reshape lif data (${se.data.length} values) into ${d1 * d2} x ${d0}`)
        CH0 = planeOf(se.data, 0, d1 * d2, d0)
        if (endPt !== 0) CH0 = crop(CH0, startPt, endPt, cmin, cmax)
      } else if (numOfCH === 2) {
        // Channel planes alternate, one frame (d1 lines x d0 pixels) at a time.
        const unit = d1 * d0
        if (se.data.length < 2 * unit * d2) throw new Error(`carpets: cannot reshape lif data (${se.data.length} values) into 2 x ${d1 * d2} x ${d0}`)
        CH0 = matrix(d1 * d2, d0)
        CH1 = matrix(d1 * d2, d0)
        for (let b = 0; b < d2; b++) {
          for (let i = 0; i < unit; i++) {
            CH0.data[b * unit + i] = se.data[2 * b * unit + i]
            CH1.data[b * unit + i] = se.data[(2 * b + 1) * unit + i]
          }
        }
        if (endPt !== 0) {
          CH0 = crop(CH0, startPt, endPt, cmin, cmax)
          CH1 = crop(CH1, startPt, endPt, cmin, cmax)
        }
      } else {
        throw new Error(`carpets: lif series with ${numOfCH} channels are not supported (FoCuS-scan reads 1 or 2)`)
      }
    } else {
      throw new Error(`carpets: unknown format ${fmt}`)
    }
    return { numOfCH, CH0, CH1: numOfCH === 2 ? CH1 : null, deltatMs: deltat, dwellTimeS: dwell }
  }

  // ------------------------------------------------------------ correlation

  /** Row sums (np.sum(carpet, 1)) and column sums (np.sum(carpet, 0)). */
  function lineSums (mat) {
    const out = new Float64Array(mat.rows)
    for (let r = 0; r < mat.rows; r++) out[r] = 0 + pairwiseSum(mat.data, r * mat.cols, mat.cols)
    return out
  }
  function columnSums (mat) {
    const out = new Float64Array(mat.cols)
    for (let r = 0; r < mat.rows; r++) {
      for (let c = 0; c < mat.cols; c++) out[c] += mat.data[r * mat.cols + c]
    }
    return out
  }

  /** np.sum(carpet[:lines, lo:hi], 1): the (binned) intensity of a column over time. */
  function columnTrace (mat, lines, lo, hi) {
    const out = new Float64Array(lines)
    const w = hi - lo
    if (w <= 0) return out
    for (let r = 0; r < lines; r++) out[r] = 0 + pairwiseSum(mat.data, r * mat.cols + lo, w)
    return out
  }

  /** Counts summed over int_time lines (the last window is dropped, as in the Python). */
  function countWindows (trace, intTime) {
    if (intTime <= 1) return trace
    const n = Math.ceil(trace.length / intTime) - 1
    const out = new Float64Array(Math.max(0, n))
    for (let i = 1; i <= n; i++) out[i - 1] = 0 + pairwiseSum(trace, intTime * (i - 1), intTime)
    return out
  }

  /** np.bincount of values truncated to integers. */
  function bincount (values, scale) {
    let max = -1
    const idx = new Array(values.length)
    for (let i = 0; i < values.length; i++) {
      const v = Math.trunc(scale === 1 ? values[i] : values[i] / scale)
      if (v < 0) throw new Error("carpets: bincount of negative counts ('list' argument must have no negative elements)")
      idx[i] = v
      if (v > max) max = v
    }
    const out = new Float64Array(max + 1)
    for (const v of idx) out[v] += 1
    return out
  }

  /**
   * calc_signal_to_noise: mean |G / sd(G)|, with var(G) estimated from the
   * variance of the products of the mean-subtracted, zero-padded trace.
   * Lags that give the same product index (usually most of them, see the
   * porting notes) share one variance; the value is the same.
   */
  function signalToNoise (trace, ac, deltat) {
    const size = trace.length
    const hf = Math.floor(size / 2)
    const aMean = mean(trace)
    const padded = new Float64Array(size + 2 * hf)
    for (let i = 0; i < size; i++) padded[hf + i] = trace[i] - aMean
    const P = padded.length
    const [lo, hi] = pySlice(P, hf, -hf)
    const len1 = hi - lo
    const prod = new Float64Array(Math.max(1, len1))
    const known = new Map()
    const c = new Float64Array(ac.tau.length)
    for (let t = 0; t < ac.tau.length; t++) {
      const tau = Math.trunc(ac.tau[t] * deltat / 1000.0) // np.int32 (see porting notes)
      if (known.has(tau)) { c[t] = known.get(tau); continue }
      const [a, b] = pySlice(P, tau, size + tau)
      if (b - a !== len1) throw new Error('carpets: operands could not be broadcast together (signal to noise)')
      // np.var(padded[hf:-hf] * padded[tau:size+tau]), in numpy's order
      for (let i = 0; i < len1; i++) prod[i] = padded[lo + i] * padded[a + i]
      const mu = (0 + pairwiseSum(prod, 0, len1)) / len1
      for (let i = 0; i < len1; i++) { const d = prod[i] - mu; prod[i] = d * d }
      c[t] = (0 + pairwiseSum(prod, 0, len1)) / len1
      known.set(tau, c[t])
    }
    const k = 1.0 / (size * Math.pow(aMean, 4))
    const r = new Float64Array(c.length)
    for (let t = 0; t < c.length; t++) r[t] = Math.abs(ac.g[t] / Math.sqrt(k * c[t]))
    return mean(r)
  }

  /**
   * Correlate channel carpets column by column (scanObject.processData after
   * the format handling, and calc_carpet).
   *
   * @param {object} ch the result of scanChannels
   * @param {object} [opts]
   * @param {number} [opts.m=30] points per multiple-tau level (FoCuS-scan's default); must be even
   * @param {number} [opts.spatialBin=1] pixels summed, centred on each column (odd)
   * @param {number} [opts.intTime=1] lines summed for the count statistics
   * @param {function(number)} [opts.onProgress] called with the fraction done
   * @returns {object} {
   *   numOfCH, lines (lines correlated: even), columns, lenG, deltatMs, dwellTimeS,
   *   tau: Float64Array(lenG) lag times (ms) of the last column (zeros if it had no counts),
   *   autoCH0, autoCH1, cross01: Float64Array(columns * lenG), column c's G at
   *     [c * lenG, (c + 1) * lenG); autoCH1/cross01 null for one channel,
   *   kcountCH0/CH1 (kHz), numberCH0/CH1, brightnessCH0/CH1 (kHz per molecule),
   *   s2nCH0/CH1, cv: per column (Float64Array; empty when not computed),
   *   lineSumCH0/CH1 (counts per line, all lines), columnSumCH0/CH1 (counts per column),
   *   maxCountCH0/CH1 }
   *   Throws if the carpet has no counts (FoCuS-scan drops such files).
   */
  function correlateCarpets (ch, opts) {
    const o = opts || {}
    const m = o.m === undefined ? 30 : o.m
    const spatialBin = o.spatialBin === undefined ? 1 : o.spatialBin
    const intTime = o.intTime === undefined ? 1 : Math.trunc(o.intTime)
    const onProgress = o.onProgress
    const { numOfCH, CH0, CH1, deltatMs: deltat, dwellTimeS: dwell } = ch

    const res = { numOfCH, deltatMs: deltat, dwellTimeS: dwell, m, spatialBin, intTime }
    res.lineSumCH0 = lineSums(CH0)
    res.columnSumCH0 = columnSums(CH0)
    if (0 + pairwiseSum(res.lineSumCH0, 0, res.lineSumCH0.length) === 0) throw new Error('carpets: the carpet contains no intensity signal')
    res.maxCountCH0 = maxOf(res.lineSumCH0)
    if (numOfCH === 2) {
      res.lineSumCH1 = lineSums(CH1)
      res.columnSumCH1 = columnSums(CH1)
      res.maxCountCH1 = maxOf(res.lineSumCH1)
    }

    let lines = CH0.rows
    if (lines % 2 === 1) lines -= 1
    // (FoCuS-scan fails for odd or fractional m: the correlator makes m even
    // while the carpet is sized with the m given.)
    if (!(Number.isInteger(m) && m % 2 === 0 && m > 0)) throw new Error(`carpets: m must be an even whole number (got ${m})`)
    // Lags per curve: the correlator's output length (shorter by two when the
    // last level runs out of data; see correlation/multipletau).
    const lenG = mt.outputLength(lines, m)
    // Spatial binning sums the s pixels centred on each column, so s is odd.
    // (FoCuS-scan summed s - 1 pixels, i - (s-1)/2 .. i + (s-1)/2 - 1; fixed
    // as agreed with the maintainer, see README.md implementation notes.)
    if (!(Number.isInteger(spatialBin) && spatialBin >= 1 && spatialBin % 2 === 1)) throw new Error(`carpets: spatial binning must be an odd number of pixels (got ${spatialBin})`)
    const mar = (spatialBin - 1) / 2
    const columns = CH0.cols - 2 * mar
    if (columns <= 0) throw new Error('carpets: no columns to correlate (spatial binning wider than the carpet)')
    res.lines = lines
    res.columns = columns
    res.lenG = lenG

    const autoCH0 = new Float64Array(columns * lenG)
    const autoCH1 = numOfCH === 2 ? new Float64Array(columns * lenG) : null
    const cross01 = numOfCH === 2 ? new Float64Array(columns * lenG) : null
    const stats = {}
    for (const key of ['kcountCH0', 'kcountCH1', 'numberCH0', 'numberCH1', 'brightnessCH0', 'brightnessCH1', 's2nCH0', 's2nCH1', 'cv']) stats[key] = []
    let tau = new Float64Array(lenG)
    const put = (arr, col, g, what) => {
      if (g.length !== lenG) throw new Error(`carpets: could not broadcast the ${what} of column ${col} (${g.length} lags) into the carpet (${lenG} lags)`)
      arr.set(g, col * lenG)
    }
    const counts = (trace) => {
      const out = countWindows(trace, intTime)
      const raw = mean(out)
      const vr = variance(out)
      return { raw, vr, per: intTime * dwell * spatialBin }
    }
    const opt = { m, deltat, normalize: true }
    let intTimeSet = false // (the Python sets it only in the channel-0 branch)

    for (let i = mar, col = 0; i < CH0.cols - mar; i++, col++) {
      const lo = i - mar // pixels lo .. hi - 1: the column and mar on each side
      const hi = i + mar + 1
      const in0 = columnTrace(CH0, lines, lo, hi)
      let in1 = null
      if (numOfCH === 2) in1 = columnTrace(CH1, lines, lo, hi)

      if (0 + pairwiseSum(in0, 0, in0.length) > 0) {
        const ac0 = mt.autocorrelate(in0, opt)
        tau = ac0.tau
        stats.s2nCH0.push(signalToNoise(in0, ac0, deltat))
        intTimeSet = true
        const { raw, vr, per } = counts(in0)
        stats.kcountCH0.push(raw / per / 1000)
        stats.brightnessCH0.push(((vr - raw) / raw) / per / 1000)
        stats.numberCH0.push((vr - raw) === 0 ? 0 : raw * raw / (vr - raw))
        put(autoCH0, col, ac0.g, 'autocorrelation')
      } else {
        tau = new Float64Array(lenG)
        stats.s2nCH0.push(0)
        stats.kcountCH0.push(0)
        stats.brightnessCH0.push(0)
        stats.numberCH0.push(0)
      }

      if (numOfCH === 2) {
        // Coincidence value (CV) of the two channels' count histograms.
        const option = bincount(in0, 1)
        const present = []
        for (let v = 0; v < option.length && present.length < 2; v++) if (option[v] > 0) present.push(v)
        const scale = present.length === 2 ? present[1] - present[0] : 1
        const N1 = bincount(in0, scale)
        const N2 = bincount(in1, scale)
        const n = Math.max(N1.length, N2.length)
        const P = new Float64Array(n)
        const A = new Float64Array(n)
        const B = new Float64Array(n)
        for (let v = 0; v < n; v++) {
          A[v] = v < N1.length ? N1[v] : 0
          B[v] = v < N2.length ? N2[v] : 0
          P[v] = A[v] * B[v]
        }
        stats.cv.push((mt.sum(P) / (mt.sum(A) * mt.sum(B))) * n)

        if (0 + pairwiseSum(in1, 0, in1.length) > 0) {
          if (!intTimeSet) throw new Error("carpets: local variable 'int_time' referenced before assignment (FoCuS-scan fails when the first column has counts only in channel 1)")
          const ac1 = mt.autocorrelate(in1, opt)
          const cc = mt.correlate(in0, in1, opt)
          put(autoCH1, col, ac1.g, 'channel 1 autocorrelation')
          put(cross01, col, cc.g, 'cross-correlation')
          stats.s2nCH1.push(signalToNoise(in1, ac1, deltat))
          const { raw, vr, per } = counts(in1)
          stats.brightnessCH1.push(((vr - raw) / raw) / per / 1000)
          stats.numberCH1.push(raw * raw / (vr - raw))
          stats.kcountCH1.push(raw / per / 1000)
        } else {
          stats.s2nCH1.push(0)
          stats.brightnessCH1.push(0)
          stats.numberCH1.push(0)
          stats.kcountCH1.push(0)
        }
      }
      if (onProgress) onProgress((col + 1) / columns)
    }

    res.tau = tau
    res.autoCH0 = autoCH0
    res.autoCH1 = autoCH1
    res.cross01 = cross01
    for (const key of Object.keys(stats)) res[key] = Float64Array.from(stats[key])
    return res
  }

  /**
   * Line ranges of FoCuS-scan's crop tool (cropDataWindow): the time range
   * startMs .. endMs split into n equal intervals, each converted to lines as
   *   start line = round((startMs + interval k) / deltat)
   *   end line   = round((startMs + interval (k + 1)) / deltat)
   * with numpy's rounding (half to even). One carpet is made per interval
   * (scanChannels startPt/endPt).
   * @param {number} startMs start time (ms from the first line)
   * @param {number} endMs end time (ms)
   * @param {number} n number of intervals (FoCuS-scan: 1-20)
   * @param {number} deltatMs time per line (ms)
   * @returns {Array<{startPt: number, endPt: number}>} lines (end excluded)
   */
  function cropIntervals (startMs, endMs, n, deltatMs) {
    const interval = (endMs - startMs) / n
    const out = []
    for (let k = 0; k < n; k++) {
      out.push({
        startPt: mt.roundHalfEven((startMs + interval * k) / deltatMs),
        endPt: mt.roundHalfEven((startMs + interval * (k + 1)) / deltatMs)
      })
    }
    return out
  }

  /** Column c's curve from a carpet array of correlateCarpets. */
  function column (carpet, lenG, c) {
    return carpet.subarray(c * lenG, (c + 1) * lenG)
  }

  return { scanChannels, correlateCarpets, cropIntervals, column, pySlice, crop }
})
