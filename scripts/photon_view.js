// FoCuS-Fit-JS: the Photon data view, shown in the Main Plot panel with the
// "Fit | Photon data" switch. For each correlated photon file
// (window.photonFiles, filled by scripts/correlate_view.js) it shows what
// FoCuS-point's "Load TCSPC" tab shows:
//  - the photon decay (micro-time histogram) of each channel, on which a
//    lifetime gate can be dragged out, and gated curves created from it;
//  - the intensity trace of each channel, at a chosen bin width;
//  - photons, count rate, N&B brightness and number per channel, and the
//    coincidence value of each pair of channels;
//  - the decay and trace as .csv files.
// Micro-times are in TCSPC channels, as in the Correlation settings; times
// in the trace are in seconds, count rates in kHz.

(function () {
  var view = document.getElementById('photonView')
  if (!view || !window.FocusCore) return
  var traces = FocusCore.require('correlation/traces')
  var body = view.parentElement // the Main Plot card body
  var el = function (id) { return document.getElementById(id) }
  var COLORS = ['#2FA348', '#1f77d0', '#f08c00', '#8e44ad', '#d62728', '#17becf', '#8c564b', '#7f7f7f']

  var state = {
    view: 'fit',
    index: 0, // file shown
    gate: null, // [from, to] in TCSPC channels
    decayX: null // the decay chart's x scale, for dragging the gate
  }

  function files () { return window.photonFiles || [] }
  function current () { return files()[state.index] }

  // ------------------------------------------------------------------ view switch

  // (The Carpets view, scripts/carpet_view.js, shares this switch.)
  function setView (name) {
    state.view = name
    var photon = name === 'photon'
    var carpets = name === 'carpets'
    body.classList.toggle('photon-mode', photon)
    body.classList.toggle('carpets-mode', carpets)
    view.hidden = !photon
    var carpetView = el('carpetView')
    if (carpetView) carpetView.hidden = !carpets
    document.querySelectorAll('.fitpro-view-switch .btn').forEach(function (b) {
      var on = b.dataset.view === name
      b.classList.toggle('active', on)
      b.setAttribute('aria-pressed', on ? 'true' : 'false')
    })
    if (photon) {
      render()
    } else if (carpets) {
      // drawn by scripts/carpet_view.js
    } else if (typeof fitproFitPlotHeight === 'function') {
      fitproFitPlotHeight()
      if (typeof plt_obj !== 'undefined' && plt_obj.plot_data) fitproRedrawPlot(true)
    }
  }

  document.querySelectorAll('.fitpro-view-switch .btn').forEach(function (b) {
    b.addEventListener('click', function () {
      setView(b.dataset.view)
      document.dispatchEvent(new CustomEvent('fitproviewchange', { detail: b.dataset.view }))
    })
  })

  // ------------------------------------------------------------------ file list

  function fillFileList () {
    var sel = el('photonFileSel')
    var list = files()
    sel.innerHTML = ''
    list.forEach(function (f, i) {
      var o = document.createElement('option')
      o.value = i
      o.textContent = f.name + ' (' + f.result.records.toLocaleString() + ' photons)'
      sel.appendChild(o)
    })
    if (state.index >= list.length) state.index = Math.max(0, list.length - 1)
    sel.value = state.index
    el('photonEmpty').hidden = list.length > 0
    el('photonContent').hidden = list.length === 0
    el('photonGateAll').disabled = list.length < 2
  }

  el('photonFileSel').addEventListener('change', function () {
    state.index = parseInt(this.value, 10) || 0
    render()
  })

  document.addEventListener('photonfileschanged', function () {
    // Show the file just added.
    state.index = files().length - 1
    if (state.view === 'photon') render()
    else fillFileList()
  })

  // ------------------------------------------------------------------ charts

  // Chart heights: the two charts share what is left of the window below the
  // view's other controls, so the panel ends where the Fit view's does
  // (see fitproFitPlotHeight), within CHART_MIN..CHART_MAX.
  var CHART_MIN = 160
  var CHART_MAX = 520
  function chartHeights () {
    var card = body.closest('.card')
    var now = (parseFloat(el('photonDecay').style.height) || 0) + (parseFloat(el('photonTrace').style.height) || 0)
    var overhead = view.offsetHeight - now // everything in the view but the two charts
    var below = card.getBoundingClientRect().bottom - view.getBoundingClientRect().bottom
    var cardMargin = parseFloat(getComputedStyle(card).marginBottom) || 0
    var top = view.getBoundingClientRect().top + window.scrollY
    var avail = window.innerHeight - top - overhead - below - cardMargin - 6
    return Math.round(Math.min(CHART_MAX, Math.max(CHART_MIN, avail / 2)))
  }

  // Log axis ticks at powers of ten only, as 100, 1k, 10k (the default
  // labels of a log axis overlap on a short chart).
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
    return decades.length >= 3 ? decades : ticks([1, 2, 5]) // short range: 1, 2, 5 per decade
  }

  function themeCol (name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    return v || fallback
  }

  function lineSeries (color) {
    return fc.seriesCanvasLine()
      .crossValue(function (d) { return d[0] })
      .mainValue(function (d) { return d[1] })
      .defined(function (d) { return isFinite(d[1]) })
      .decorate(function (ctx) { ctx.strokeStyle = color; ctx.lineWidth = 1.5 })
  }

  function legend (result) {
    el('photonLegend').innerHTML = result.perChannel.map(function (pc, i) {
      return '<span class="sw" style="background:' + COLORS[i % COLORS.length] + '"></span>CH' + (i + 1)
    }).join('')
  }

  function drawDecay (result, height) {
    var log = el('photonLog').checked
    var norm = el('photonNorm').checked
    var series = result.perChannel.map(function (pc) {
      var max = 0
      for (var k = 0; k < pc.photonDecay.length; k++) max = Math.max(max, pc.photonDecay[k])
      var pts = []
      for (var i = 0; i < pc.photonDecay.length; i++) {
        var y = norm && max > 0 ? pc.photonDecay[i] / max : pc.photonDecay[i]
        pts.push([pc.decayScale[i], log && y <= 0 ? NaN : y])
      }
      return pts
    })
    var xs = []
    var ys = []
    series.forEach(function (s) { s.forEach(function (d) { xs.push(d[0]); if (isFinite(d[1])) ys.push(d[1]) }) })
    var xDomain = [d3.min(xs) || 0, d3.max(xs) || 1]
    var yMax = d3.max(ys) || 1
    var yMin = log ? Math.max(d3.min(ys) || 1, norm ? 1e-4 : 0.5) : 0
    var x = d3.scaleLinear().domain(xDomain)
    var y = (log ? d3.scaleLog() : d3.scaleLinear()).domain([yMin, yMax * (log ? 1.5 : 1.05)])
    state.decayX = x

    var gateColor = 'rgba(47, 163, 72, 0.18)'
    var band = fc.annotationCanvasBand().orient('vertical')
      .fromValue(function (d) { return d[0] }).toValue(function (d) { return d[1] })
      .decorate(function (ctx) { ctx.fillStyle = gateColor })
    var lines = series.map(function (_, i) { return lineSeries(COLORS[i % COLORS.length]) })
    var multi = fc.seriesCanvasMulti()
      .series([band].concat(lines))
      .mapping(function (data, i) {
        if (i === 0) return state.gate ? [[Math.min(state.gate[0], state.gate[1]), Math.max(state.gate[0], state.gate[1])]] : []
        return data[i - 1]
      })
    var chart = fc.chartCartesian(x, y)
      .xLabel('Micro-time (TCSPC channel)')
      .yLabel(norm ? 'Photons (normalised)' : 'Photons')
      .yOrient('left')
      .yAxisWidth('5em')
      .xTicks(6)
      .canvasPlotArea(multi)
    if (log) {
      var ticks = logTicks(y.domain())
      chart.yTickValues(ticks).yTickFormat(d3.format('~s'))
        .svgPlotArea(fc.annotationSvgGridline().xTicks(6).yTicks(ticks.length))
    } else {
      chart.yTicks(5).svgPlotArea(fc.annotationSvgGridline().xTicks(6).yTicks(5))
    }
    var node = el('photonDecay')
    node.style.height = height + 'px'
    d3.select(node).datum(series).call(chart)
  }

  function drawTrace (result, height) {
    var factor = parseInt(el('photonBin').value, 10) || 1
    var series = result.perChannel.map(function (pc) {
      var r = traces.rebinTrace(pc.timeSeries, pc.timeSeriesScale, factor)
      var binMs = traces.binWidth(r.centres) || 25 * factor
      var pts = []
      for (var i = 0; i < r.counts.length; i++) pts.push([r.centres[i] / 1000, r.counts[i] / binMs]) // s, kHz
      return pts
    })
    var xs = []
    var ys = []
    series.forEach(function (s) { s.forEach(function (d) { xs.push(d[0]); ys.push(d[1]) }) })
    var x = d3.scaleLinear().domain([0, d3.max(xs) || 1])
    var y = d3.scaleLinear().domain([0, (d3.max(ys) || 1) * 1.1])
    var lines = series.map(function (_, i) { return lineSeries(COLORS[i % COLORS.length]) })
    var multi = fc.seriesCanvasMulti().series(lines).mapping(function (data, i) { return data[i] })
    var chart = fc.chartCartesian(x, y)
      .xLabel('Time (s)')
      .yLabel('Count rate (kHz)')
      .yOrient('left')
      .yAxisWidth('5em')
      .yTicks(5)
      .xTicks(6)
      .svgPlotArea(fc.annotationSvgGridline().xTicks(6).yTicks(5))
      .canvasPlotArea(multi)
    var node = el('photonTrace')
    node.style.height = height + 'px'
    d3.select(node).datum(series).call(chart)
  }

  function fmt (v, digits) {
    if (!isFinite(v)) return '–'
    return Number(v).toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits })
  }

  function drawStats (result) {
    var s = traces.summarise(result)
    var rows = ['<thead><tr><th></th><th>Photons</th><th>Duration (s)</th><th>Count rate (kHz)</th>' +
      '<th title="Number and brightness analysis, from the 25 ms intensity bins">N&amp;B brightness (kHz)</th>' +
      '<th title="Number and brightness analysis">N&amp;B number</th></tr></thead><tbody>']
    s.channels.forEach(function (c, i) {
      rows.push('<tr><td><span class="photon-legend"><span class="sw" style="margin-left:0;background:' + COLORS[i % COLORS.length] + '"></span></span>' + c.label + '</td>' +
        '<td>' + fmt(c.photons, 0) + '</td><td>' + fmt(c.durationMs / 1000, 2) + '</td><td>' + fmt(c.rateKHz, 2) + '</td>' +
        '<td>' + fmt(c.brightness, 3) + '</td><td>' + fmt(c.number, 2) + '</td></tr>')
    })
    s.pairs.forEach(function (p) {
      rows.push('<tr><td>' + p.label + '</td><td colspan="5" style="text-align:left">Coincidence value (CV): ' + fmt(p.cv, 4) + '</td></tr>')
    })
    rows.push('</tbody>')
    el('photonStats').innerHTML = rows.join('')
  }

  function render () {
    fillFileList()
    var f = current()
    if (!f) return
    legend(f.result)
    drawStats(f.result)
    showGate()
    // Draw, then size the charts to the space left and draw again if needed.
    var h = parseFloat(el('photonDecay').style.height) || CHART_MIN
    drawDecay(f.result, h)
    drawTrace(f.result, h)
    var fit = chartHeights()
    if (Math.abs(fit - h) > 2) {
      drawDecay(f.result, fit)
      drawTrace(f.result, fit)
    }
  }

  ;['photonLog', 'photonNorm', 'photonBin'].forEach(function (id) {
    el(id).addEventListener('change', function () { if (current()) render() })
  })
  window.addEventListener('resize', function () {
    if (state.view === 'photon' && current()) {
      clearTimeout(render.timer)
      render.timer = setTimeout(render, 150)
    }
  })
  var themeBtn = document.getElementById('themeToggleBtn')
  if (themeBtn) themeBtn.addEventListener('click', function () { if (state.view === 'photon' && current()) setTimeout(render, 0) })

  // ------------------------------------------------------------------ lifetime gate

  function showGate () {
    el('photonGate0').value = state.gate ? Math.round(Math.min(state.gate[0], state.gate[1])) : ''
    el('photonGate1').value = state.gate ? Math.round(Math.max(state.gate[0], state.gate[1])) : ''
    var ok = !!state.gate && Math.round(state.gate[0]) !== Math.round(state.gate[1])
    el('photonGateThis').disabled = !ok
    el('photonGateAll').disabled = !ok || files().length < 2
  }

  function redrawDecay () {
    var f = current()
    if (f) drawDecay(f.result, parseFloat(el('photonDecay').style.height) || chartHeights())
  }

  function gateFromInputs () {
    var a = parseFloat(el('photonGate0').value)
    var b = parseFloat(el('photonGate1').value)
    state.gate = isFinite(a) && isFinite(b) ? [a, b] : null
    showGate()
    redrawDecay()
  }
  el('photonGate0').addEventListener('change', gateFromInputs)
  el('photonGate1').addEventListener('change', gateFromInputs)

  // Drag across the decay plot to set the gate.
  function plotArea () { return el('photonDecay').querySelector('d3fc-canvas.plot-area, .plot-area') }
  function microTimeAt (clientX) {
    var area = plotArea()
    if (!area || !state.decayX) return null
    var r = area.getBoundingClientRect()
    var x = Math.max(0, Math.min(r.width, clientX - r.left))
    return state.decayX.invert(x)
  }
  var dragFrom = null
  el('photonDecay').addEventListener('mousedown', function (e) {
    var area = plotArea()
    if (!area || e.button !== 0) return
    var r = area.getBoundingClientRect()
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return
    dragFrom = microTimeAt(e.clientX)
    state.gate = [dragFrom, dragFrom]
    e.preventDefault()
  })
  window.addEventListener('mousemove', function (e) {
    if (dragFrom === null) return
    state.gate = [dragFrom, microTimeAt(e.clientX)]
    showGate()
    redrawDecay()
  })
  window.addEventListener('mouseup', function () {
    if (dragFrom === null) return
    dragFrom = null
    if (state.gate && Math.round(state.gate[0]) === Math.round(state.gate[1])) state.gate = null // a click clears it
    showGate()
    redrawDecay()
  })

  async function createGated (all) {
    if (!state.gate || typeof window.correlateGated !== 'function') return
    var gate = [Math.round(Math.min(state.gate[0], state.gate[1])), Math.round(Math.max(state.gate[0], state.gate[1]))]
    var entries = all ? files().slice() : [current()]
    var buttons = [el('photonGateThis'), el('photonGateAll')]
    buttons.forEach(function (b) { b.disabled = true })
    await window.correlateGated(entries, gate, function (t) { el('photonGateStatus').textContent = t })
    showGate()
  }
  el('photonGateThis').addEventListener('click', function () { createGated(false) })
  el('photonGateAll').addEventListener('click', function () { createGated(true) })

  // ------------------------------------------------------------------ exports

  function save (text, name) {
    if (window.focusDesktop) {
      window.focusDesktop.saveFile(name, text).catch(function (e) { alert('Could not save the file: ' + e.message) })
    } else {
      download(text, name, 'text/csv')
    }
  }
  function baseName () { return current().name.replace(/\.[^.]+$/, '') }

  el('photonExportDecay').addEventListener('click', function () {
    var r = current().result
    var x = r.perChannel[0].decayScale
    var labels = r.perChannel.map(function (_, i) { return 'CH' + (i + 1) })
    save(traces.tableCsv('micro-time (TCSPC channel)', x, labels, r.perChannel.map(function (pc) { return pc.photonDecay })), baseName() + '_decay.csv')
  })
  el('photonExportTrace').addEventListener('click', function () {
    var r = current().result
    var factor = parseInt(el('photonBin').value, 10) || 1
    var rebinned = r.perChannel.map(function (pc) { return traces.rebinTrace(pc.timeSeries, pc.timeSeriesScale, factor) })
    var binMs = traces.binWidth(rebinned[0].centres) || 25 * factor
    var labels = r.perChannel.map(function (_, i) { return 'CH' + (i + 1) + ' (photons per ' + binMs + ' ms)' })
    save(traces.tableCsv('time (ms)', rebinned[0].centres, labels, rebinned.map(function (t) { return t.counts })), baseName() + '_trace.csv')
  })

  fillFileList()
  window.fitproPhotonView = { setView: setView, render: render, state: state }
})()
