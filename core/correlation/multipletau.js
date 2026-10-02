// Multiple-tau auto- and cross-correlation on a base-2 logarithmic lag scale,
// ported from legacy/scan/focusscan/scorrelation_methods.py (autocorrelate,
// correlate), which FoCuS-scan uses to correlate each column of a carpet.
// That file is derived from the multipletau package, whose licence follows.
//
//    A multiple-tau algorithm for Python 2.7 and 3.x.
//
//    Copyright (c) 2014 Paul Muller
//
//    Redistribution and use in source and binary forms, with or without
//    modification, are permitted provided that the following conditions are
//    met:
//
//      1. Redistributions of source code must retain the above copyright
//         notice, this list of conditions and the following disclaimer.
//
//      2. Redistributions in binary form must reproduce the above copyright
//         notice, this list of conditions and the following disclaimer in
//         the documentation and/or other materials provided with the
//         distribution.
//
//      3. Neither the name of multipletau nor the names of its contributors
//         may be used to endorse or promote products derived from this
//         software without specific prior written permission.
//
//    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
//    "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
//    LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
//    A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL INFRAE OR
//    CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
//    EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
//    PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
//    PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//    LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//    NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
//    SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
// One change from FoCuS-scan (agreed with the maintainer): when the last level
// runs out of data, FoCuS-scan's autocorrelate kept the full length but left
// the last-but-one value unnormalised and the last one 0; here, as in the
// original multipletau (and FoCuS-scan's own correlate), the output is
// shortened instead (see outputLength and README.md, implementation notes).
// Sums are taken in numpy's order (pairwiseSum), so results agree with the
// Python to rounding.

FocusCore.define('correlation/multipletau', [], function () {
  'use strict'

  /**
   * Sum of x[start .. start+n-1] in numpy's order (pairwise summation with
   * 8 accumulators in blocks of up to 128, as np.sum/np.mean do for float64).
   */
  function pairwiseSum (x, start, n) {
    if (n < 8) {
      let res = 0
      for (let i = 0; i < n; i++) res += x[start + i]
      return res
    }
    if (n <= 128) {
      let r0 = x[start]; let r1 = x[start + 1]; let r2 = x[start + 2]; let r3 = x[start + 3]
      let r4 = x[start + 4]; let r5 = x[start + 5]; let r6 = x[start + 6]; let r7 = x[start + 7]
      let i = 8
      const end = n - (n % 8)
      for (; i < end; i += 8) {
        const p = start + i
        r0 += x[p]; r1 += x[p + 1]; r2 += x[p + 2]; r3 += x[p + 3]
        r4 += x[p + 4]; r5 += x[p + 5]; r6 += x[p + 6]; r7 += x[p + 7]
      }
      let res = ((r0 + r1) + (r2 + r3)) + ((r4 + r5) + (r6 + r7))
      for (; i < n; i++) res += x[start + i]
      return res
    }
    let n2 = Math.floor(n / 2)
    n2 -= n2 % 8
    return pairwiseSum(x, start, n2) + pairwiseSum(x, start + n2, n - n2)
  }

  /** np.sum(x) of a whole array. */
  function sum (x) { return 0 + pairwiseSum(x, 0, x.length) }
  /** np.mean(x) / np.average(x). */
  function mean (x) { return sum(x) / x.length }
  /** np.var(x) (population variance, ddof 0). */
  function variance (x) {
    const mu = mean(x)
    const d = new Float64Array(x.length)
    for (let i = 0; i < x.length; i++) { const v = x[i] - mu; d[i] = v * v }
    return sum(d) / x.length
  }

  /** np.around (round half to even). */
  function roundHalfEven (v) {
    const f = Math.floor(v)
    const diff = v - f
    if (diff > 0.5) return f + 1
    if (diff < 0.5) return f
    return f % 2 === 0 ? f : f + 1
  }

  /** The m the Python uses: an even integer (odd or fractional m is moved up, with a warning there). */
  function checkM (m) {
    if (roundHalfEven(m / 2) !== m / 2) return (roundHalfEven(m / 2) + 1) * 2
    return Math.trunc(m)
  }

  /** Length of the Python slice x[:stop] of an array of length len. */
  function stopLength (len, stop) {
    return stop >= 0 ? Math.min(stop, len) : Math.max(0, len + stop)
  }

  /**
   * sum(x[:len-lag] * y[lag:]) in numpy's order; scratch is a work buffer at
   * least as long as x. Returns null when x[:len-lag] is empty (the
   * Python's "trace too short" case).
   */
  function lagSum (x, y, len, lag, scratch) {
    const a = stopLength(len, len - lag)
    if (a === 0) return null
    const b = Math.max(0, len - lag)
    if (a !== b) throw new Error('multipletau: operands could not be broadcast together') // numpy would fail too
    for (let i = 0; i < a; i++) scratch[i] = x[i] * y[i + lag]
    return 0 + pairwiseSum(scratch, 0, a)
  }

  /** (trace[:N:2] + trace[1:N+1:2]) / 2, for even N: neighbouring pairs averaged. */
  function halve (trace, N) {
    const out = new Float64Array(N / 2)
    for (let i = 0; i < N / 2; i++) out[i] = (trace[2 * i] + trace[2 * i + 1]) / 2
    return out
  }

  /**
   * Autocorrelation of a sequence on a log2 lag scale (FoCuS-scan's
   * autocorrelate).
   * @param {ArrayLike<number>} a the sequence (e.g. counts per line)
   * @param {object} [opts]
   * @param {number} [opts.m=16] points per level (made even as in the Python)
   * @param {number} [opts.deltat=1] time between samples; tau is in the same unit (ms in FoCuS-scan)
   * @param {boolean} [opts.normalize=false] FCS normalisation: G(tau) = <dI(t) dI(t+tau)> / <I>^2
   * @returns {{tau: Float64Array, g: Float64Array}} lag times (unit of deltat) and G;
   *   length outputLength(len, m)
   */
  function autocorrelate (a, opts) {
    const o = opts || {}
    let m = o.m === undefined ? 16 : o.m
    const deltat = o.deltat === undefined ? 1 : o.deltat
    const normalize = !!o.normalize
    let trace = Float64Array.from(a)
    const traceavg = mean(trace)
    if (normalize && traceavg === 0) throw new Error('Normalization not possible. The average of the input *binned_array* is zero.')
    m = checkM(m)
    let N = trace.length
    const N0 = N
    const k = Math.floor(Math.log2(N / m))
    let lenG = Math.floor(m + k * m / 2)
    const tau = new Float64Array(lenG)
    const g = new Float64Array(lenG)
    const normstat = new Float64Array(lenG)
    const normnump = new Float64Array(lenG)
    if (normalize) for (let i = 0; i < N; i++) trace[i] -= traceavg
    if (N < 2 * m) throw new Error('len(binned_array) must be larger than 2m.')
    const scratch = new Float64Array(N)
    for (let n = 1; n <= m; n++) {
      tau[n - 1] = deltat * n
      g[n - 1] = lagSum(trace, trace, N, n, scratch)
      normstat[n - 1] = N - n
      normnump[n - 1] = N
    }
    if (N % 2 === 1) N -= 1
    trace = halve(trace, N)
    N /= 2
    for (let step = 1; step <= k; step++) {
      for (let n = 1; n <= Math.trunc(m / 2); n++) {
        const idx = Math.trunc(m + n - 1 + (step - 1) * m / 2)
        const lag = Math.trunc(n + m / 2)
        const s = lagSum(trace, trace, N, lag, scratch)
        if (s === null) {
          // The trace ran out (only possible at the last lag): stop and
          // shorten the output, as the original multipletau does.
          lenG = Math.min(lenG, Math.max(0, idx - 1)) // G = G[:idx-1]
          break
        }
        if (idx >= lenG) throw new Error('multipletau: index out of range') // (IndexError in the Python)
        tau[idx] = deltat * (n + m / 2) * 2 ** step
        g[idx] = s
        normstat[idx] = N - (n + m / 2)
        normnump[idx] = N
      }
      if (N % 2 === 1) N -= 1
      trace = halve(trace, N)
      N /= 2
    }
    const a2 = traceavg * traceavg
    for (let i = 0; i < lenG; i++) {
      if (normalize) g[i] /= a2 * normstat[i]
      else g[i] *= N0 / normnump[i]
    }
    return { tau: tau.slice(0, lenG), g: g.slice(0, lenG) }
  }

  /**
   * Cross-correlation of two sequences of equal length on a log2 lag scale
   * (FoCuS-scan's correlate): G_k = sum_n v_n a_(n+k), normalised as
   * autocorrelate (same output length).
   * @param {ArrayLike<number>} a first sequence
   * @param {ArrayLike<number>} v second sequence
   * @param {object} [opts] as autocorrelate
   * @returns {{tau: Float64Array, g: Float64Array}}
   */
  function correlate (a, v, opts) {
    const o = opts || {}
    let m = o.m === undefined ? 16 : o.m
    const deltat = o.deltat === undefined ? 1 : o.deltat
    const normalize = !!o.normalize
    let trace1 = Float64Array.from(v)
    let trace2 = Float64Array.from(a)
    const traceavg1 = mean(trace1)
    const traceavg2 = mean(trace2)
    if (normalize && traceavg1 * traceavg2 === 0) throw new Error('Normalization not possible. The average of the input *binned_array* is zero.')
    m = checkM(m)
    if (a.length !== v.length) throw new Error('Input arrays must be of equal length.')
    let N = trace1.length
    const N0 = N
    const k = Math.floor(Math.log2(N / m))
    let lenG = Math.floor(m + k * m / 2)
    const tau = new Float64Array(lenG)
    const g = new Float64Array(lenG)
    const normstat = new Float64Array(lenG)
    const normnump = new Float64Array(lenG)
    if (normalize) {
      for (let i = 0; i < N; i++) { trace1[i] -= traceavg1; trace2[i] -= traceavg2 }
    }
    if (N < 2 * m) throw new Error('len(binned_array) must be larger than 2m.')
    const scratch = new Float64Array(N)
    for (let n = 1; n <= m; n++) {
      tau[n - 1] = deltat * n
      g[n - 1] = lagSum(trace1, trace2, N, n, scratch)
      normstat[n - 1] = N - n
      normnump[n - 1] = N
    }
    if (N % 2 === 1) N -= 1
    trace1 = halve(trace1, N)
    trace2 = halve(trace2, N)
    N /= 2
    for (let step = 1; step <= k; step++) {
      for (let n = 1; n <= Math.trunc(m / 2); n++) {
        const idx = Math.trunc(m + n - 1 + (step - 1) * m / 2)
        const lag = Math.trunc(n + m / 2)
        const s = lagSum(trace1, trace2, N, lag, scratch)
        if (s === null) {
          lenG = Math.min(lenG, Math.max(0, idx - 1)) // G = G[:idx-1]
          break
        }
        if (idx >= lenG) throw new Error('multipletau: index out of range') // (IndexError in the Python)
        tau[idx] = deltat * (n + m / 2) * 2 ** step
        g[idx] = s
        normstat[idx] = N - (n + m / 2)
        normnump[idx] = N
      }
      if (N % 2 === 1) N -= 1
      trace1 = halve(trace1, N)
      trace2 = halve(trace2, N)
      N /= 2
    }
    for (let i = 0; i < lenG; i++) {
      if (normalize) g[i] /= traceavg1 * traceavg2 * normstat[i]
      else g[i] *= N0 / normnump[i]
    }
    return { tau: tau.slice(0, lenG), g: g.slice(0, lenG) }
  }

  /**
   * Number of lags autocorrelate/correlate return for n samples:
   * floor(m + k m / 2) with k = floor(log2(n / m)), less 2 when the last level
   * runs out of data (floor(n / 2^k) = m, k >= 1). m is made even first.
   */
  function outputLength (n, m) {
    m = checkM(m)
    const k = Math.floor(Math.log2(n / m))
    const len = Math.floor(m + k * m / 2)
    return k >= 1 && Math.floor(n / 2 ** k) === m ? len - 2 : len
  }

  return { autocorrelate, correlate, outputLength, pairwiseSum, sum, mean, variance, roundHalfEven, checkM }
})
