// FoCuS-fit-JS: the Carpets view, shown in the Main Plot panel with the
// "Fit | Photon data | Carpets" switch. It does what FoCuS-scan's "Load And
// Correlate Data" tab does for scanning FCS line scans (.lsm, .czi, .tif,
// .msr, .lif):
//  - the import settings: line frequency (Hz) and pixel dwell time (us), as
//    FoCuS-scan's import dialog asks (.lif files store their own), and the
//    correlation settings m, spatial binning and count window;
//  - the intensity carpet (scan lines x pixels along the line);
//  - the correlation carpet: G(tau) of every column, each normalised to its
//    maximum (negative values shown as 0), with the column intensity profile;
//  - dragging across the correlation carpet selects columns, whose curves
//    are plotted with their count rate, N&B and signal-to-noise;
//  - the selected columns (or all) are sent to the fitter, one curve per
//    column (and per channel and cross-correlation), as FoCuS-scan does.
// Reading and correlating run in a Web Worker (core/workers/scan.worker.js).
// Lag times are in ms, times in s, count rates in kHz.

(function () {
  var view = document.getElementById('carpetView')
  if (!view || !window.FocusCore) return
  var body = view.parentElement // the Main Plot card body
  var el = function (id) { return document.getElementById(id) }
  var COLORS = ['#2FA348', '#1f77d0', '#f08c00'] // CH1, CH2, CH1 x CH2
  var CARPETS = [
    { key: 'autoCH0', label: 'CH1', ch: 0, kind: 'CH0_Auto_Corr', chType: 0 },
    { key: 'autoCH1', label: 'CH2', ch: 1, kind: 'CH1_Auto_Corr', chType: 1 },
    { key: 'cross01', label: 'CH1 × CH2', ch: 2, kind: 'CH01_Auto_Corr', chType: 2 }
  ]
  var DEFAULTS = { m: 30, spatialBin: 1, intTime: 1 }

  var scanner = null
  var entries = [] // {file: {id, name, format}, entry, settings, result}
  var state = { index: 0, carpet: 'autoCH0', sel: null, corrY: null, busy: false }

  function current () { return entries[state.index] }

  // ------------------------------------------------------------------ opening files

  function setStatus (text) { el('carpetStatus').textContent = text || '' }

  /**
   * Open scanning-FCS files: read each in the worker and list its carpets.
   * @param {FileList|File[]} fileList
   */
  async function openScanFiles (fileList) {
    var files = Array.prototype.slice.call(fileList)
    if (!files.length) return
    if (!scanner) scanner = FocusCore.require('workers/scan').createScanner(FocusCore)
    if (window.fitproPhotonView) window.fitproPhotonView.setView('carpets')
    var firstNew = entries.length
    for (var k = 0; k < files.length; k++) {
      var file = files[k]
      setStatus('Reading ' + file.name + '…')
      try {
        var opened = await scanner.open(file)
        var usable = opened.entries.filter(function (e) { return !e.missing })
        if (!usable.length) {
          alert(file.name + ': no line-scan carpet found in this file' +
            (opened.format === 'msr' ? ' (FoCuS-scan lists time series with more than 500 lines).' : '.'))
          continue
        }
        usable.forEach(function (e) {
          entries.push({ file: opened, entry: e, settings: null, result: null })
        })
      } catch (err) {
        alert('There was a problem reading file: ' + file.name + '\n' + err.message)
      }
    }
    setStatus('')
    if (entries.length > firstNew) {
      state.index = firstNew
      state.sel = null
      render()
      // Carpets whose timings are in the file (.lif) are correlated straight away.
      if (!current().entry.needsTimings) correlateCurrent()
    } else {
      render()
    }
  }
  window.openScanFiles = openScanFiles

  el('carpetFiles').addEventListener('change', function () {
    openScanFiles(this.files).then(function () { el('carpetFiles').value = '' })
  })
  ;['carpetOpenBtn', 'carpetOpenBtn2'].forEach(function (id) {
    el(id).addEventListener('click', function () { el('carpetFiles').click() })
  })
  var panelInput = el('scan_files')
  if (panelInput) {
    panelInput.addEventListener('change', function () {
      openScanFiles(panelInput.files).then(function () { panelInput.value = '' })
    })
  }

  // ------------------------------------------------------------------ settings

  function entryLabel (e) {
    var name = e.file.name
    return (e.file.format === 'msr' || e.file.format === 'lif' ? name + ': ' : '') + e.entry.label +
      (e.crop ? ' — ' + e.crop.label : '') + (e.result ? '' : ' (not correlated)')
  }

  // The name the carpet's curves get in the fitter (a crop adds its lines).
  function curveBase (e) {
    return e.entry.name + (e.crop ? '_lines_' + e.crop.startPt + '-' + e.crop.endPt + (e.crop.cmin !== null ? '_px_' + e.crop.cmin + '-' + (e.crop.cmax - 1) : '') : '')
  }

  function fillList () {
    var sel = el('carpetSel')
    sel.innerHTML = ''
    entries.forEach(function (e, i) {
      var o = document.createElement('option')
      o.value = i
      o.textContent = entryLabel(e)
      sel.appendChild(o)
    })
    sel.value = state.index
    el('carpetEmpty').hidden = entries.length > 0
    el('carpetContent').hidden = entries.length === 0
  }

  el('carpetSel').addEventListener('change', function () {
    readSettings() // keep what was typed for the carpet being left
    state.index = parseInt(this.value, 10) || 0
    state.sel = null
    render()
  })

  function round (v, digits) {
    return v === null || v === undefined || !isFinite(v) ? '' : String(Number(v.toFixed(digits)))
  }

  function showSettings () {
    var e = current()
    var s = e.settings || {}
    var sug = e.entry.suggest || {}
    var timings = e.entry.needsTimings
    el('carpetHz').value = timings ? (s.lineFrequencyHz !== undefined ? s.lineFrequencyHz : round(sug.lineFrequencyHz, 6)) : round(sug.lineFrequencyHz, 6)
    el('carpetUs').value = timings ? (s.pixelTimeUs !== undefined ? s.pixelTimeUs : round(sug.pixelTimeUs, 6)) : round(sug.pixelTimeUs, 6)
    el('carpetHz').disabled = !timings
    el('carpetUs').disabled = !timings
    el('carpetHz').title = timings ? 'Lines scanned per second' + (sug.lineFrequencyHz ? ' (suggested from the file)' : '') : 'Stored in the .lif file'
    el('carpetUs').title = timings ? 'Pixel dwell time' + (sug.pixelTimeUs ? ' (suggested from the file)' : '') : 'Stored in the .lif file'
    el('carpetM').value = s.m || DEFAULTS.m
    el('carpetBin').value = s.spatialBin || DEFAULTS.spatialBin
    el('carpetInt').value = s.intTime || DEFAULTS.intTime
  }

  function readSettings () {
    var e = current()
    if (!e) return null
    var s = {
      m: parseFloat(el('carpetM').value),
      spatialBin: parseInt(el('carpetBin').value, 10),
      intTime: parseInt(el('carpetInt').value, 10)
    }
    if (e.entry.needsTimings) {
      s.lineFrequencyHz = el('carpetHz').value === '' ? undefined : parseFloat(el('carpetHz').value)
      s.pixelTimeUs = el('carpetUs').value === '' ? undefined : parseFloat(el('carpetUs').value)
    }
    e.settings = s
    return s
  }

  function checkSettings (s, e) {
    if (e.entry.needsTimings) {
      if (!(s.lineFrequencyHz > 0)) return 'Enter the line frequency (Hz): the number of lines scanned per second.'
      if (!(s.pixelTimeUs > 0)) return 'Enter the pixel dwell time (µs).'
    }
    if (!(Number.isInteger(s.m) && s.m >= 2 && s.m % 2 === 0)) return 'm must be an even whole number (FoCuS-scan uses 30).'
    if (!(Number.isInteger(s.spatialBin) && s.spatialBin >= 1 && s.spatialBin % 2 === 1)) return 'Spatial binning must be an odd number of pixels (1, 3, 5, …): the pixels centred on each column.'
    if (!(s.intTime >= 1)) return 'The count window must be 1 or more lines.'
    return null
  }

  // Correlate entry e with settings s (plus its crop), showing progress.
  async function runCorrelation (e, s, prefix) {
    var settings = Object.assign({}, s, e.crop ? { startPt: e.crop.startPt, endPt: e.crop.endPt, cmin: e.crop.cmin, cmax: e.crop.cmax } : {})
    setStatus((prefix || '') + 'Correlating 0%')
    try {
      var result = await scanner.correlate(e.file.id, e.entry.key, settings, function (f) {
        setStatus((prefix || '') + 'Correlating ' + Math.round(100 * f) + '%')
      })
      e.result = result
      e.resultSettings = Object.assign({}, s)
      return true
    } catch (err) {
      setStatus((prefix || '') + 'Could not correlate: ' + err.message)
      return false
    }
  }

  async function correlateCurrent () {
    var e = current()
    if (!e || state.busy) return
    var s = readSettings()
    var problem = checkSettings(s, e)
    if (problem) { setStatus(problem); return }
    state.busy = true
    el('carpetCorrelate').disabled = true
    if (await runCorrelation(e, s)) {
      state.sel = null
      if (!e.result[state.carpet]) state.carpet = 'autoCH0'
      setStatus('')
    }
    state.busy = false
    el('carpetCorrelate').disabled = false
    render()
  }
  el('carpetCorrelate').addEventListener('click', correlateCurrent)
  ;['carpetHz', 'carpetUs', 'carpetM', 'carpetBin', 'carpetInt'].forEach(function (id) {
    el(id).addEventListener('keydown', function (ev) { if (ev.key === 'Enter') correlateCurrent() })
  })

  // ------------------------------------------------------------------ colour maps

  // jet, as FoCuS-scan's correlation carpet
  function jet (v) {
    var c = function (x) { return Math.round(255 * Math.max(0, Math.min(1, x))) }
    return [c(1.5 - Math.abs(4 * v - 3)), c(1.5 - Math.abs(4 * v - 2)), c(1.5 - Math.abs(4 * v - 1))]
  }
  var VIRIDIS = (function () {
    var lut = []
    for (var i = 0; i < 256; i++) {
      var c = d3.color(d3.interpolateViridis(i / 255))
      lut.push([c.r, c.g, c.b])
    }
    return lut
  })()

  function offscreen (w, h) {
    var c = document.createElement('canvas')
    c.width = Math.max(1, w)
    c.height = Math.max(1, h)
    return c
  }

  // A d3fc canvas "series" that draws with a callback (for images).
  function imageLayer (draw) {
    var ctx, xs, ys
    function layer (data) { if (ctx && data) draw(ctx, xs, ys, data) }
    layer.context = function (c) { if (!arguments.length) return ctx; ctx = c; return layer }
    layer.xScale = function (s) { if (!arguments.length) return xs; xs = s; return layer }
    layer.yScale = function (s) { if (!arguments.length) return ys; ys = s; return layer }
    return layer
  }

  // Upper display limit: a high percentile, so one bright pixel does not
  // darken the whole image (display only).
  function displayMax (arrays) {
    var sample = []
    arrays.forEach(function (a) {
      if (!a) return
      var step = Math.max(1, Math.floor(a.length / 20000))
      for (var i = 0; i < a.length; i += step) sample.push(a[i])
    })
    sample.sort(function (a, b) { return a - b })
    var v = sample[Math.floor(0.998 * (sample.length - 1))] || sample[sample.length - 1] || 1
    return v > 0 ? v : 1
  }

  // Lag times (ms) for display. FoCuS-scan takes them from the last column,
  // which are all 0 if that column has no counts; then they are rebuilt from
  // the multiple-tau spacing (deltat x lag in lines).
  function lagTimes (r) {
    if (r.tau.length && r.tau[0] > 0) return r.tau
    var m = r.m
    var out = new Float64Array(r.lenG)
    for (var i = 0; i < r.lenG; i++) {
      if (i < m) out[i] = r.deltatMs * (i + 1)
      else {
        var step = Math.floor((i - m) / (m / 2)) + 1
        var n = i - m - (step - 1) * m / 2 + 1
        out[i] = r.deltatMs * (n + m / 2) * Math.pow(2, step)
      }
    }
    return out
  }

  // Log axis ticks at powers of ten (1, 2, 5 per decade on a short range),
  // as in the Photon data view: the default labels of a log axis overlap.
  function logTicks (domain) {
    function ticks (steps) {
      var out = []
      for (var e = Math.floor(Math.log10(domain[0])); e <= Math.ceil(Math.log10(domain[1])); e++) {
        steps.forEach(function (m) {
          var v = m * Math.pow(10, e)
          if (v >= domain[0] && v <= domain[1]) out.push(v)
        })
      }
      return out
    }
    var decades = ticks([1])
    return decades.length >= 3 ? decades : ticks([1, 2, 5])
  }
  var tickFormat = d3.format('~g')
  // About one y label per 40 px of plot (the axes take ~70 px of the chart).
  function yTickCount (height) { return Math.max(2, Math.min(6, Math.floor((height - 70) / 40))) }

  function themeCol (name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    return v || fallback
  }

  // ------------------------------------------------------------------ intensity carpet

  function drawRaw (r, height) {
    var p = r.preview
    var lineS = r.deltatMs / 1000
    var tEnd = p.rows * lineS
    var two = !!p.ch1
    var max0 = displayMax([p.ch0])
    var max1 = two ? displayMax([p.ch1]) : 1
    var img = offscreen(p.bins, p.cols)
    var ictx = img.getContext('2d')
    var data = ictx.createImageData(p.bins, p.cols)
    for (var b = 0; b < p.bins; b++) {
      for (var c = 0; c < p.cols; c++) {
        var o = 4 * ((p.cols - 1 - c) * p.bins + b) // pixel 0 at the bottom
        var v0 = Math.min(1, p.ch0[b * p.cols + c] / max0)
        if (two) {
          // two channels: CH1 red, CH2 green, as FoCuS-scan
          data.data[o] = Math.round(255 * v0)
          data.data[o + 1] = Math.round(255 * Math.min(1, p.ch1[b * p.cols + c] / max1))
          data.data[o + 2] = 0
        } else {
          var lut = VIRIDIS[Math.max(0, Math.round(255 * v0))]
          data.data[o] = lut[0]; data.data[o + 1] = lut[1]; data.data[o + 2] = lut[2]
        }
        data.data[o + 3] = 255
      }
    }
    ictx.putImageData(data, 0, 0)
    var x = d3.scaleLinear().domain([0, tEnd])
    var y = d3.scaleLinear().domain([0, p.cols])
    var layer = imageLayer(function (ctx, xs, ys) {
      var x0 = xs(0)
      var w = xs(p.bins * p.bin * lineS) - x0
      ctx.imageSmoothingEnabled = p.bins > w
      ctx.drawImage(img, x0, ys(p.cols), w, ys(0) - ys(p.cols))
      // The crop region (drawn on the carpet, or typed in the crop fields).
      var roi = cropRegion()
      if (roi) {
        var rx = xs(roi.t0)
        var ry = ys(roi.p1 + 1)
        var rw = xs(roi.t1) - rx
        var rh = ys(roi.p0) - ry
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'
        ctx.fillRect(rx, ry, rw, rh)
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.strokeRect(rx, ry, rw, rh)
        ctx.strokeStyle = '#000'
        ctx.lineWidth = 1
        ctx.setLineDash([4, 3])
        ctx.strokeRect(rx, ry, rw, rh)
        ctx.setLineDash([])
      }
    })
    var chart = fc.chartCartesian(x, y)
      .xLabel('Time (s)')
      .yLabel('Pixel')
      .yOrient('left')
      .yAxisWidth('4em')
      .xTicks(8)
      .yTicks(Math.min(3, yTickCount(height)))
      .canvasPlotArea(layer)
    var node = el('carpetRaw')
    node.style.height = height + 'px'
    d3.select(node).datum([1]).call(chart)
    state.rawX = x
    state.rawY = y
    el('carpetRawLegend').innerHTML = two
      ? '<span class="sw" style="background:#e00"></span>CH1<span class="sw" style="background:#0c0"></span>CH2'
      : ''
    el('carpetRawInfo').textContent = r.preview.rows.toLocaleString() + ' lines × ' + r.preview.cols + ' pixels, ' +
      round(r.deltatMs, 4) + ' ms per line' + (p.bin > 1 ? ' (shown as means of ' + p.bin + ' lines)' : '')
  }

  // ------------------------------------------------------------------ correlation carpet

  function carpetInfo () { return CARPETS.filter(function (c) { return c.key === state.carpet })[0] }

  function lagEdges (tau) {
    var n = tau.length
    var edges = new Float64Array(n + 1)
    for (var i = 1; i < n; i++) edges[i] = Math.sqrt(tau[i - 1] * tau[i])
    edges[0] = n > 1 ? tau[0] * tau[0] / edges[1] : tau[0] / 1.5
    edges[n] = n > 1 ? tau[n - 1] * tau[n - 1] / edges[n - 1] : tau[0] * 1.5
    return edges
  }

  function selectionBand (ys, cols) {
    if (!state.sel) return null
    return [ys(state.sel[1] + 1), ys(state.sel[0])]
  }

  // The coloured correlation carpet, made once per result and carpet (the
  // selection is drawn over it, so dragging does not rebuild it).
  var JET = (function () { var lut = []; for (var i = 0; i < 256; i++) lut.push(jet(i / 255)); return lut })()
  function carpetImage (r, key) {
    r.images = r.images || {}
    if (r.images[key]) return r.images[key]
    var C = r[key]
    var lenG = r.lenG
    var cols = r.columns
    var img = offscreen(lenG, cols)
    var ictx = img.getContext('2d')
    var data = ictx.createImageData(lenG, cols)
    // Each column normalised to its maximum, negative values as 0 (FoCuS-scan).
    for (var c = 0; c < cols; c++) {
      var max = 0
      for (var t = 0; t < lenG; t++) if (C[c * lenG + t] > max) max = C[c * lenG + t]
      for (t = 0; t < lenG; t++) {
        var v = max > 0 ? Math.max(0, C[c * lenG + t]) / max : 0
        var rgb = JET[Math.round(255 * v)]
        var o = 4 * ((cols - 1 - c) * lenG + t)
        data.data[o] = rgb[0]; data.data[o + 1] = rgb[1]; data.data[o + 2] = rgb[2]; data.data[o + 3] = 255
      }
    }
    ictx.putImageData(data, 0, 0)
    r.images[key] = img
    return img
  }

  function drawCorr (r, height) {
    var C = r[state.carpet]
    var lenG = r.lenG
    var cols = r.columns
    var tau = lagTimes(r)
    var edges = lagEdges(tau)
    var img = carpetImage(r, state.carpet)
    var x = d3.scaleLog().domain([edges[0], edges[lenG]])
    var y = d3.scaleLinear().domain([0, cols])
    var layer = imageLayer(function (ctx, xs, ys) {
      ctx.imageSmoothingEnabled = false
      for (var t = 0; t < lenG; t++) {
        var xl = xs(edges[t])
        ctx.drawImage(img, t, 0, 1, cols, xl, ys(cols), Math.max(1, xs(edges[t + 1]) - xl + 0.5), ys(0) - ys(cols))
      }
      var band = selectionBand(ys, cols)
      if (band) {
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.strokeRect(xs(edges[0]) + 1, band[0], xs(edges[lenG]) - xs(edges[0]) - 2, band[1] - band[0])
        ctx.strokeStyle = '#000'
        ctx.lineWidth = 1
        ctx.setLineDash([4, 3])
        ctx.strokeRect(xs(edges[0]) + 1, band[0], xs(edges[lenG]) - xs(edges[0]) - 2, band[1] - band[0])
        ctx.setLineDash([])
      }
    })
    var chart = fc.chartCartesian(x, y)
      .xLabel('Lag time τ (ms)')
      .yLabel('Column (pixel)')
      .yOrient('left')
      .yAxisWidth('4em')
      .xTickValues(logTicks(x.domain()))
      .xTickFormat(tickFormat)
      .yTicks(yTickCount(height))
      .canvasPlotArea(layer)
    var node = el('carpetCorr')
    node.style.height = height + 'px'
    d3.select(node).datum([1]).call(chart)
    state.corrY = y
    drawProfile(r, height, y)
  }

  // Column intensity profile beside the correlation carpet (counts per column,
  // summed over time), with the same column axis.
  function drawProfile (r, height, yCarpet) {
    var info = carpetInfo()
    var sums = info.ch === 1 ? r.columnSumCH1 : r.columnSumCH0
    var mar = Math.trunc((r.spatialBin - 1) / 2)
    var pts = []
    for (var c = 0; c < r.columns; c++) pts.push([sums[c + mar] || 0, c + 0.5])
    var x = d3.scaleLinear().domain([0, (d3.max(pts, function (d) { return d[0] }) || 1) * 1.05])
    var y = d3.scaleLinear().domain(yCarpet.domain())
    var color = COLORS[info.ch === 1 ? 1 : 0]
    var layer = imageLayer(function (ctx, xs, ys, data) {
      var b = selectionBand(ys, r.columns)
      if (b) {
        ctx.fillStyle = 'rgba(47, 163, 72, 0.18)'
        ctx.fillRect(0, b[0], xs.range()[1], b[1] - b[0])
      }
      ctx.beginPath()
      data.forEach(function (d, i) {
        if (i === 0) ctx.moveTo(xs(d[0]), ys(d[1]))
        else ctx.lineTo(xs(d[0]), ys(d[1]))
      })
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      ctx.stroke()
    })
    var chart = fc.chartCartesian(x, y)
      .xLabel('Counts')
      .yOrient('right') // (with 'none' d3fc leaves the y range unset)
      .yTickValues([])
      .yAxisWidth('2px')
      .xTicks(2)
      .xTickFormat(d3.format('~s'))
      .canvasPlotArea(layer)
    var node = el('carpetProfile')
    node.style.height = height + 'px'
    d3.select(node).datum(pts).call(chart)
  }

  // Drag up or down across the correlation carpet to select columns.
  function corrArea () { return el('carpetCorr').querySelector('d3fc-canvas.plot-area, .plot-area') }
  // The column under the mouse, from the plot area's position on the page
  // (columns 0 at the bottom to r.columns at the top). Not from the chart's
  // scale: each redraw makes a new scale, sized only when d3fc next draws.
  function columnAt (clientY) {
    var area = corrArea()
    var r = current() && current().result
    if (!area || !r) return null
    var box = area.getBoundingClientRect()
    if (!(box.height > 0)) return null
    var f = Math.max(0, Math.min(1, (box.bottom - clientY) / box.height))
    return Math.max(0, Math.min(r.columns - 1, Math.floor(f * r.columns)))
  }
  var dragFrom = null
  el('carpetCorr').addEventListener('mousedown', function (e) {
    var area = corrArea()
    if (!area || e.button !== 0) return
    var box = area.getBoundingClientRect()
    if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom) return
    dragFrom = columnAt(e.clientY)
    state.sel = [dragFrom, dragFrom]
    redrawSelection()
    e.preventDefault()
  })
  window.addEventListener('mousemove', function (e) {
    if (dragFrom === null) return
    var c = columnAt(e.clientY)
    if (c === null) return
    state.sel = [Math.min(dragFrom, c), Math.max(dragFrom, c)]
    redrawSelection()
  })
  window.addEventListener('mouseup', function () { dragFrom = null })

  // At most one redraw per screen frame while dragging.
  var selectionFrame = null
  function redrawSelection () {
    if (selectionFrame !== null) return
    selectionFrame = requestAnimationFrame(function () {
      selectionFrame = null
      redrawSelectionNow()
    })
  }
  function redrawSelectionNow () {
    var e = current()
    if (!e || !e.result) return
    drawCorr(e.result, parseFloat(el('carpetCorr').style.height))
    drawCurves(e.result, parseFloat(el('carpetCurves').style.height))
    drawStats(e.result)
  }

  el('carpetChSel').addEventListener('click', function (ev) {
    var b = ev.target.closest('button[data-carpet]')
    if (!b || b.disabled) return
    state.carpet = b.dataset.carpet
    redrawSelection()
    showChannelButtons(current().result)
  })

  function showChannelButtons (r) {
    el('carpetChSel').querySelectorAll('button').forEach(function (b) {
      var have = !!r[b.dataset.carpet]
      b.hidden = !have
      b.classList.toggle('active', b.dataset.carpet === state.carpet)
      b.setAttribute('aria-pressed', b.dataset.carpet === state.carpet ? 'true' : 'false')
    })
    el('carpetChSel').hidden = r.numOfCH < 2
  }

  // ------------------------------------------------------------------ selected curves

  function selectedColumns (r) {
    var a = state.sel ? state.sel[0] : 0
    var b = state.sel ? state.sel[1] : r.columns - 1
    var out = []
    for (var c = a; c <= b; c++) out.push(c)
    return out
  }

  function drawCurves (r, height) {
    var C = r[state.carpet]
    var tau = lagTimes(r)
    var cols = state.sel ? selectedColumns(r) : []
    var info = carpetInfo()
    var color = COLORS[info.ch]
    var n = r.lenG
    var mean = null
    var yMin = 0
    var yMax = -Infinity
    for (var k = 0; k < cols.length; k++) {
      for (var t = 0; t < n; t++) {
        var g = C[cols[k] * n + t]
        if (isFinite(g)) { if (g > yMax) yMax = g; if (g < yMin) yMin = g }
      }
    }
    if (cols.length > 1) {
      mean = new Float64Array(n)
      for (t = 0; t < n; t++) {
        var s = 0
        for (k = 0; k < cols.length; k++) s += C[cols[k] * n + t]
        mean[t] = s / cols.length
      }
    }
    if (!isFinite(yMax)) yMax = 1
    var x = d3.scaleLog().domain([tau[0], tau[tau.length - 1]])
    var y = d3.scaleLinear().domain([yMin, yMax > yMin ? yMax * 1.05 : yMin + 1])
    var alpha = cols.length > 20 ? 0.25 : 0.7
    var meanColor = themeCol('--plot-axis-text', '#222')
    // All the selected columns as one path (fast with hundreds of columns),
    // then their mean on top.
    var layer = imageLayer(function (ctx, xs, ysc) {
      function trace (get) {
        var pen = false
        for (var t = 0; t < n; t++) {
          var g = get(t)
          if (!isFinite(g)) { pen = false; continue }
          var px = xs(tau[t])
          var py = ysc(g)
          if (pen) ctx.lineTo(px, py)
          else { ctx.moveTo(px, py); pen = true }
        }
      }
      ctx.save()
      ctx.beginPath()
      cols.forEach(function (c) { trace(function (t) { return C[c * n + t] }) })
      ctx.strokeStyle = color
      ctx.globalAlpha = alpha
      ctx.lineWidth = 1
      ctx.stroke()
      if (mean) {
        ctx.beginPath()
        trace(function (t) { return mean[t] })
        ctx.globalAlpha = 1
        ctx.strokeStyle = meanColor
        ctx.lineWidth = 2.5
        ctx.stroke()
      }
      ctx.restore()
    })
    var chart = fc.chartCartesian(x, y)
      .xLabel('Lag time τ (ms)')
      .yLabel('G(τ)')
      .yOrient('left')
      .yAxisWidth('4em')
      .xTickValues(logTicks(x.domain()))
      .xTickFormat(tickFormat)
      .yTicks(yTickCount(height))
      .svgPlotArea(fc.annotationSvgGridline().xTickValues(logTicks(x.domain())).yTicks(yTickCount(height)))
      .canvasPlotArea(layer)
    var node = el('carpetCurves')
    node.style.height = height + 'px'
    d3.select(node).datum([1]).call(chart)
    el('carpetSelInfo').textContent = state.sel
      ? (cols.length === 1 ? 'column ' + cols[0] : 'columns ' + cols[0] + '–' + cols[cols.length - 1] + ' (' + cols.length + ')') +
        (cols.length > 1 ? '; mean in bold' : '')
      : 'none: drag across the correlation carpet'
    el('carpetSendSel').disabled = !state.sel
  }

  function fmt (v, digits) {
    if (v === null || v === undefined || !isFinite(v)) return '–'
    return Number(v).toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits })
  }

  function meanOf (arr, cols) {
    if (!arr || !arr.length) return NaN
    var s = 0
    var n = 0
    cols.forEach(function (c) { if (isFinite(arr[c])) { s += arr[c]; n++ } })
    return n ? s / n : NaN
  }

  function drawStats (r) {
    var cols = selectedColumns(r)
    var rows = ['<thead><tr><th>' + (state.sel ? 'Selected columns (mean)' : 'All columns (mean)') + '</th><th>Count rate (kHz)</th>' +
      '<th title="Number and brightness analysis">N&amp;B number</th><th title="Number and brightness analysis">N&amp;B brightness (kHz)</th>' +
      '<th title="Signal to noise of the correlation curves (FoCuS-scan)">Signal to noise</th></tr></thead><tbody>']
    var chans = r.numOfCH === 2 ? ['CH0', 'CH1'] : ['CH0']
    chans.forEach(function (ch, i) {
      rows.push('<tr><td><span class="photon-legend"><span class="sw" style="margin-left:0;background:' + COLORS[i] + '"></span></span>CH' + (i + 1) + '</td>' +
        '<td>' + fmt(meanOf(r['kcount' + ch], cols), 2) + '</td><td>' + fmt(meanOf(r['number' + ch], cols), 2) + '</td>' +
        '<td>' + fmt(meanOf(r['brightness' + ch], cols), 3) + '</td><td>' + fmt(meanOf(r['s2n' + ch], cols), 2) + '</td></tr>')
    })
    if (r.numOfCH === 2) rows.push('<tr><td>CH1 × CH2</td><td colspan="4" style="text-align:left">Coincidence value (CV): ' + fmt(meanOf(r.cv, cols), 4) + '</td></tr>')
    rows.push('</tbody>')
    el('carpetStats').innerHTML = rows.join('')
  }

  // ------------------------------------------------------------------ sending to the fitter

  // The same refresh open_file_imprt does after importing files.
  function refreshViews () {
    document.getElementById('splash').style.display = 'none'
    populate_data_viewer()
    fit_obj.calc_limits()
    plt_obj.prepare_slider(fit_obj.data_min_x, fit_obj.data_max_x, fit_obj.data_min_y, fit_obj.data_max_y)
    plt_obj.define_scale()
    plt_obj.prepare_axis()
  }

  /**
   * Add columns of the current carpet to the fitter, as FoCuS-scan's
   * "export to fit": for each column one curve per channel (and the
   * cross-correlation), named <name>_row_<column>_CH0_Auto_Corr (CH1_, CH01_),
   * with the column's count rate, N&B, signal to noise and CV.
   */
  function sendToFitter (all) {
    var e = current()
    var r = e && e.result
    if (!r) return
    var cols = all ? range(r.columns) : (state.sel ? selectedColumns(r) : [])
    var tau = Array.from(lagTimes(r))
    var parent = e.entry.name + (e.crop ? ' — ' + e.crop.label : '')
    var uqid = 'scan-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
    var fileName = e.file.name
    var n = 0
    cols.forEach(function (c) {
      CARPETS.forEach(function (k) {
        var C = r[k.key]
        if (!C) return
        var obj = new CorrObj(fileName)
        obj.name = curveBase(e) + '_row_' + c + '_' + k.kind
        obj.parent_name = parent
        obj.parent_uqid = uqid
        obj.file_name = fileName
        obj.type = 'scan'
        obj.ch_type = k.chType
        obj.siblings = null
        obj.autotime = tau.slice()
        obj.autoNorm = Array.from(C.subarray(c * r.lenG, (c + 1) * r.lenG))
        var ch = k.ch === 1 ? 'CH1' : 'CH0'
        if (k.ch < 2) {
          obj.kcount = r['kcount' + ch][c]
          obj.numberNandB = r['number' + ch][c]
          obj.brightnessNandB = r['brightness' + ch][c]
          obj.s2n = r['s2n' + ch][c]
        }
        if (r.numOfCH === 2) obj.CV = r.cv[c]
        obj.param = JSON.parse(JSON.stringify(fit_obj.def_param))
        obj.max = d3.max(obj.autoNorm)
        obj.min = d3.min(obj.autoNorm)
        obj.tmax = d3.max(obj.autotime)
        obj.tmin = d3.min(obj.autotime)
        fit_obj.objIdArr.push(obj)
        n++
      })
    })
    if (n) refreshViews()
    el('carpetSendStatus').innerHTML = n
      ? n + ' curve' + (n > 1 ? 's' : '') + ' added to the Data Viewer. <a href="#" id="carpetGoFit">Show the Fit view</a>'
      : ''
    var go = el('carpetGoFit')
    if (go) go.addEventListener('click', function (ev) { ev.preventDefault(); window.fitproPhotonView.setView('fit') })
  }
  function range (n) { var out = []; for (var i = 0; i < n; i++) out.push(i); return out }
  el('carpetSendSel').addEventListener('click', function () { sendToFitter(false) })
  el('carpetSendAll').addEventListener('click', function () { sendToFitter(true) })

  // ------------------------------------------------------------------ crop and intervals

  // As FoCuS-scan's crop tool: a time range (ms) and a range of pixels along
  // the line, split in time into a number of intervals; each interval becomes
  // a new carpet, correlated with the same settings. (Crops are made from the
  // original file, so cropping a cropped carpet works on its time range.)
  // A crop region can also be drawn: drag a rectangle on the intensity
  // carpet. It fills in the crop fields (times in ms and pixels of the
  // original file) and is drawn from them, so typed values show too.
  function cropOffsets (e) {
    var r = e.result
    return { ms: e.crop ? e.crop.startPt * r.deltatMs : 0, px: e.crop && e.crop.cmin !== null ? e.crop.cmin : 0 }
  }

  // The crop fields as a rectangle on this carpet (s from its first line,
  // pixels from its first pixel), or null when they cover all of it.
  function cropRegion () {
    var e = current()
    if (!e || !e.result || el('carpetCropBox').hidden) return null
    var r = e.result
    var off = cropOffsets(e)
    var from = parseFloat(el('carpetCropFrom').value)
    var to = parseFloat(el('carpetCropTo').value)
    var p0 = parseInt(el('carpetCropPx0').value, 10)
    var p1 = parseInt(el('carpetCropPx1').value, 10)
    if (![from, to, p0, p1].every(isFinite)) return null
    var endS = r.preview.rows * r.deltatMs / 1000
    var roi = {
      t0: Math.max(0, (Math.min(from, to) - off.ms) / 1000),
      t1: Math.min(endS, (Math.max(from, to) - off.ms) / 1000),
      p0: Math.max(0, Math.min(p0, p1) - off.px),
      p1: Math.min(r.preview.cols - 1, Math.max(p0, p1) - off.px)
    }
    if (roi.t1 <= roi.t0 || roi.p1 < roi.p0) return null
    var whole = roi.t0 <= 0 && roi.t1 >= endS - 1e-9 && roi.p0 <= 0 && roi.p1 >= r.preview.cols - 1
    return whole ? null : roi
  }

  function redrawRaw () {
    var e = current()
    if (e && e.result) drawRaw(e.result, parseFloat(el('carpetRaw').style.height))
  }
  ;['carpetCropFrom', 'carpetCropTo', 'carpetCropPx0', 'carpetCropPx1'].forEach(function (id) {
    el(id).addEventListener('input', redrawRaw)
  })

  function rawArea () { return el('carpetRaw').querySelector('d3fc-canvas.plot-area, .plot-area') }
  // Time (s) and pixel under the mouse, from the plot area's position (time
  // 0 .. end left to right, pixel 0 at the bottom), as columnAt.
  function rawPoint (ev) {
    var area = rawArea()
    var e = current()
    if (!area || !e || !e.result) return null
    var box = area.getBoundingClientRect()
    if (!(box.width > 0 && box.height > 0)) return null
    var p = e.result.preview
    var endS = p.rows * e.result.deltatMs / 1000
    var fx = Math.max(0, Math.min(1, (ev.clientX - box.left) / box.width))
    var fy = Math.max(0, Math.min(1, (box.bottom - ev.clientY) / box.height))
    return { t: fx * endS, p: Math.max(0, Math.min(p.cols - 1, Math.floor(fy * p.cols))) }
  }
  var roiFrom = null
  el('carpetRaw').addEventListener('mousedown', function (ev) {
    var area = rawArea()
    if (!area || ev.button !== 0 || state.busy) return
    var box = area.getBoundingClientRect()
    if (ev.clientX < box.left || ev.clientX > box.right || ev.clientY < box.top || ev.clientY > box.bottom) return
    roiFrom = rawPoint(ev)
    if (roiFrom) { roiFrom.clientX = ev.clientX; roiFrom.clientY = ev.clientY }
    ev.preventDefault()
  })
  function setRoiFields (a, b) {
    var e = current()
    var off = cropOffsets(e)
    el('carpetCropFrom').value = round(Math.min(a.t, b.t) * 1000 + off.ms, 3)
    el('carpetCropTo').value = round(Math.max(a.t, b.t) * 1000 + off.ms, 3)
    el('carpetCropPx0').value = Math.min(a.p, b.p) + off.px
    el('carpetCropPx1').value = Math.max(a.p, b.p) + off.px
  }
  window.addEventListener('mousemove', function (ev) {
    if (!roiFrom) return
    var to = rawPoint(ev)
    if (!to) return
    setRoiFields(roiFrom, to) // (the crop box opens on release: opening it now would move the carpet)
    redrawRaw()
  })
  window.addEventListener('mouseup', function (ev) {
    if (!roiFrom) return
    var to = rawPoint(ev)
    var e = current()
    // A click (no drag) clears the region: back to the whole carpet.
    var tiny = !to || (Math.abs(ev.clientX - roiFrom.clientX) < 3 && Math.abs(ev.clientY - roiFrom.clientY) < 3)
    roiFrom = null
    if (tiny && e) showCrop(e)
    else el('carpetCropBox').open = true
    redrawRaw()
  })

  function showCrop (e) {
    var r = e && e.result
    var box = el('carpetCropBox')
    box.hidden = !r
    if (!r) return
    var base = e.crop ? e.crop : null
    var fileLines = base ? base.fileLines : r.preview.rows
    var filePixels = base ? base.filePixels : r.preview.cols
    var totalMs = fileLines * r.deltatMs
    el('carpetCropFrom').value = base ? round(base.startPt * r.deltatMs, 3) : 0
    el('carpetCropTo').value = base ? round(base.endPt * r.deltatMs, 3) : round(totalMs, 3)
    var px0 = base && base.cmin !== null ? base.cmin : 0
    var px1 = base && base.cmin !== null ? base.cmax - 1 : filePixels - 1
    el('carpetCropPx0').value = px0
    el('carpetCropPx1').value = px1
    el('carpetCropN').value = 1
    el('carpetCropInfo').textContent = 'Whole file: 0–' + round(totalMs, 1) + ' ms, pixels 0–' + (filePixels - 1) + '.'
  }

  el('carpetCropSel').addEventListener('click', function () {
    var e = current()
    if (!e || !e.result || !state.sel) return
    var mar = (e.result.spatialBin - 1) / 2 // carpet column c is centred on pixel c + mar
    el('carpetCropPx0').value = state.sel[0] + mar + (e.crop && e.crop.cmin !== null ? e.crop.cmin : 0)
    el('carpetCropPx1').value = state.sel[1] + mar + (e.crop && e.crop.cmin !== null ? e.crop.cmin : 0)
  })

  el('carpetCropGo').addEventListener('click', async function () {
    var e = current()
    if (!e || !e.result || state.busy) return
    var r = e.result
    var from = parseFloat(el('carpetCropFrom').value)
    var to = parseFloat(el('carpetCropTo').value)
    var px0 = parseInt(el('carpetCropPx0').value, 10)
    var px1 = parseInt(el('carpetCropPx1').value, 10)
    var n = parseInt(el('carpetCropN').value, 10)
    // Times and pixels are those of the original file.
    var fileLines = e.crop ? e.crop.fileLines : r.preview.rows
    var filePixels = e.crop ? e.crop.filePixels : r.preview.cols
    if (!(isFinite(from) && isFinite(to) && to > from && from >= 0)) { setStatus('Crop: enter a time range, From less than To (ms).'); return }
    if (!(px0 >= 0 && px1 >= px0)) { setStatus('Crop: enter the first and last pixel (first ≤ last).'); return }
    if (!(n >= 1 && n <= 20)) { setStatus('Crop: 1 to 20 intervals.'); return }
    if (to > fileLines * r.deltatMs) to = fileLines * r.deltatMs
    if (px1 > filePixels - 1) px1 = filePixels - 1
    var parts = FocusCore.require('correlation/carpets').cropIntervals(from, to, n, r.deltatMs)
    var s = Object.assign({}, e.resultSettings)
    var children = parts.map(function (p, k) {
      var label = 'lines ' + p.startPt + '–' + p.endPt + ' (' + round(p.startPt * r.deltatMs, 1) + '–' + round(p.endPt * r.deltatMs, 1) + ' ms), pixels ' + px0 + '–' + px1 +
        (n > 1 ? ', interval ' + (k + 1) + '/' + n : '')
      return { file: e.file, entry: e.entry, settings: Object.assign({}, s), result: null,
        crop: { startPt: p.startPt, endPt: p.endPt, cmin: px0, cmax: px1 + 1, label: label, fileLines: fileLines, filePixels: filePixels } }
    })
    var at = entries.indexOf(e) + 1
    // after the carpet and any crops already made from it
    while (at < entries.length && entries[at].file === e.file && entries[at].entry === e.entry && entries[at].crop) at++
    Array.prototype.splice.apply(entries, [at, 0].concat(children))
    state.busy = true
    el('carpetCropGo').disabled = true
    fillList()
    var ok = 0
    for (var k = 0; k < children.length; k++) {
      if (await runCorrelation(children[k], s, n > 1 ? 'Interval ' + (k + 1) + '/' + n + ': ' : 'Crop: ')) ok++
    }
    state.busy = false
    el('carpetCropGo').disabled = false
    if (ok === children.length) setStatus('')
    state.index = at
    state.sel = null
    render()
  })

  // ------------------------------------------------------------------ layout

  // Chart heights: the three charts share what is left of the window below
  // the view's other controls (as the Photon data view does).
  var SHARE = { raw: 0.32, corr: 0.38, curves: 0.30 }
  var MIN = { raw: 160, corr: 180, curves: 160 }
  var MAX = { raw: 240, corr: 420, curves: 320 }
  function chartHeights () {
    var card = body.closest('.card')
    var now = ['carpetRaw', 'carpetCorr', 'carpetCurves'].reduce(function (s, id) { return s + (parseFloat(el(id).style.height) || 0) }, 0)
    var overhead = view.offsetHeight - now
    var below = card.getBoundingClientRect().bottom - view.getBoundingClientRect().bottom
    var cardMargin = parseFloat(getComputedStyle(card).marginBottom) || 0
    var top = view.getBoundingClientRect().top + window.scrollY
    var avail = window.innerHeight - top - overhead - below - cardMargin - 6
    var out = {}
    Object.keys(SHARE).forEach(function (k) { out[k] = Math.round(Math.min(MAX[k], Math.max(MIN[k], avail * SHARE[k]))) })
    return out
  }

  function drawAll (r, h) {
    drawRaw(r, h.raw)
    drawCorr(r, h.corr)
    drawCurves(r, h.curves)
  }

  function render () {
    fillList()
    var e = current()
    if (!e) return
    showSettings()
    el('carpetResult').hidden = !e.result
    showCrop(e)
    el('carpetCorrelate').textContent = e.result ? 'Correlate again' : 'Correlate'
    if (state.shown !== e) el('carpetSendStatus').textContent = '' // a new carpet (not a redraw)
    state.shown = e
    if (!e.result) return
    var r = e.result
    showChannelButtons(r)
    drawStats(r)
    var h = { raw: parseFloat(el('carpetRaw').style.height) || MIN.raw, corr: parseFloat(el('carpetCorr').style.height) || MIN.corr, curves: parseFloat(el('carpetCurves').style.height) || MIN.curves }
    drawAll(r, h)
    var fit = chartHeights()
    if (Math.abs(fit.raw - h.raw) > 2 || Math.abs(fit.corr - h.corr) > 2 || Math.abs(fit.curves - h.curves) > 2) drawAll(r, fit)
  }

  window.addEventListener('resize', function () {
    if (!view.hidden && current()) {
      clearTimeout(render.timer)
      render.timer = setTimeout(render, 150)
    }
  })
  document.addEventListener('fitproviewchange', function (ev) {
    if (ev.detail === 'carpets') render()
  })
  var themeBtn = document.getElementById('themeToggleBtn')
  if (themeBtn) themeBtn.addEventListener('click', function () { if (!view.hidden && current()) setTimeout(render, 0) })

  fillList()
  window.fitproCarpetView = { render: render, redrawSelection: redrawSelectionNow, state: state, entries: entries, open: openScanFiles }
})()
