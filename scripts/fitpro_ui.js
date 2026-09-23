// FoCuS-Fit-JS layout helpers (kept out of the original FoCuS-fit-JS scripts
// so they stay merge-friendly):
//  - minimise/restore buttons for the panels, using Bootstrap Icons chevrons
//  - the mouse wheel over the main plot zooms the plot, never the page

// Bootstrap Icons v1.11 (MIT licence, https://icons.getbootstrap.com),
// inlined so the page needs no icon font and still works from file://.
var FITPRO_ICONS = {
  'chevron-up': 'M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708z',
  'chevron-down': 'M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708',
  'chevron-left': 'M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0',
  'chevron-right': 'M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708',
  'arrow-bar-left': 'M12.5 15a.5.5 0 0 1-.5-.5v-13a.5.5 0 0 1 1 0v13a.5.5 0 0 1-.5.5M10 8a.5.5 0 0 1-.5.5H3.707l2.147 2.146a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L3.707 7.5H9.5a.5.5 0 0 1 .5.5',
  'arrow-bar-right': 'M6 8a.5.5 0 0 0 .5.5h5.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L12.293 7.5H6.5A.5.5 0 0 0 6 8m-2.5 7a.5.5 0 0 1-.5-.5v-13a.5.5 0 0 1 1 0v13a.5.5 0 0 1-.5.5',
  // Several paths: an array.
  'zoom-in': [
    'M6.5 12a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11M13 6.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0',
    'M10.344 11.742q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1 6.5 6.5 0 0 1-1.398 1.4z',
    'M6.5 3a.5.5 0 0 1 .5.5V6h2.5a.5.5 0 0 1 0 1H7v2.5a.5.5 0 0 1-1 0V7H3.5a.5.5 0 0 1 0-1H6V3.5a.5.5 0 0 1 .5-.5'
  ],
  'zoom-out': [
    'M6.5 12a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11M13 6.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0',
    'M10.344 11.742q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1 6.5 6.5 0 0 1-1.398 1.4z',
    'M3 6.5a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1-.5-.5'
  ]
}

function fitproIcon (name) {
  var paths = [].concat(FITPRO_ICONS[name]).map(function (d) { return '<path fill-rule="evenodd" d="' + d + '"/>' })
  return '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-' + name +
    '" viewBox="0 0 16 16" aria-hidden="true">' + paths.join('') + '</svg>'
}

// Panels marked data-collapse="title" minimise to their title bar; panels
// marked data-collapse="side" (the Data Viewer) fold to a narrow strip.
function fitproSetButton (panel, btn) {
  var collapsed = panel.classList.contains('collapsed')
  var side = panel.getAttribute('data-collapse') === 'side'
  var icon = side ? (collapsed ? 'chevron-left' : 'chevron-right') : (collapsed ? 'chevron-down' : 'chevron-up')
  btn.innerHTML = fitproIcon(icon)
  btn.title = collapsed ? 'Expand' : 'Minimise'
  btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true')
}

// Ask d3fc to re-measure and redraw the main plot. After a panel changes
// width, redraw again once its CSS transition (0.15 s) has finished, or the
// axes are drawn for the old width and then squeezed.
function fitproRedrawPlot (afterResize) {
  function redraw () {
    // The main plot, and the residuals (kept on the main plot's tau range).
    var group = document.querySelector('#chart d3fc-group')
    if (group && group.requestRedraw) group.requestRedraw()
    if (typeof plt_obj !== 'undefined' && plt_obj.sync_residuals) plt_obj.sync_residuals()
  }
  redraw()
  if (afterResize) setTimeout(redraw, 250)
}

function toggleFitproPanel (panelId, btn) {
  var panel = document.getElementById(panelId)
  panel.classList.toggle('collapsed')
  fitproSetButton(panel, btn)
  fitproRedrawPlot(true)
}

// Data Viewer: widen towards the centre to read long file and curve names,
// and back to the default width.
function fitproSetWideButton (btn) {
  var wide = document.getElementById('dataViewerPanel').classList.contains('fitpro-wide')
  btn.innerHTML = fitproIcon(wide ? 'arrow-bar-right' : 'arrow-bar-left')
  btn.title = wide ? 'Back to the normal width' : 'Widen, to read long names'
  btn.setAttribute('aria-pressed', wide ? 'true' : 'false')
}

function toggleDataViewerWide (btn) {
  var panel = document.getElementById('dataViewerPanel')
  var wide = panel.classList.toggle('fitpro-wide')
  panel.parentElement.classList.toggle('fitpro-dv-wide', wide)
  fitproSetWideButton(btn)
  fitproRedrawPlot(true)
}

// ---------------------------------------------------------------------------
// Plot view buttons. They change the domains of the main plot's scales, as the
// mouse wheel does; d3fc's zoom notices the new domains on the next wheel
// event, so mouse and buttons can be mixed freely.
// ---------------------------------------------------------------------------

var FITPRO_ZOOM_STEP = 1.25 // per click: the visible range shrinks/grows by this factor

// The curves drawn on the main plot (as in PlotManager.prepare_axis).
function fitproPlottedCurves () {
  return fit_obj.objIdArr.filter(function (o) { return o.toFit === true && o.checked === true })
}

// Range of G(tau) over the plotted curves (and their fits) for tau in [x0, x1].
function fitproYRange (x0, x1) {
  var lo = Infinity
  var hi = -Infinity
  function scan (t, g) {
    for (var i = 0; i < t.length; i++) {
      if (t[i] >= x0 && t[i] <= x1 && isFinite(g[i])) {
        if (g[i] < lo) lo = g[i]
        if (g[i] > hi) hi = g[i]
      }
    }
  }
  fitproPlottedCurves().forEach(function (o) {
    scan(o.autotime, o.autoNorm)
    if (o.model_autoNorm && o.model_autoNorm.length) scan(o.model_autotime, o.model_autoNorm)
  })
  if (!isFinite(lo)) return null
  var pad = (hi - lo) * 0.05 || Math.abs(hi) * 0.05 || 0.05
  return [lo - pad, hi + pad]
}

// Scale a log domain (tau) about its centre in log space.
function fitproZoomLog (domain, factor) {
  var a = Math.log10(domain[0])
  var b = Math.log10(domain[1])
  var c = (a + b) / 2
  var h = (b - a) / 2 * factor
  return [Math.pow(10, c - h), Math.pow(10, c + h)]
}

// Scale a linear domain (G) about its centre.
function fitproZoomLinear (domain, factor) {
  var c = (domain[0] + domain[1]) / 2
  var h = (domain[1] - domain[0]) / 2 * factor
  return [c - h, c + h]
}

/**
 * @param {string} action 'reset' (all data), 'limits' (data between the fit
 *   limits), 'x-in', 'x-out', 'y-in', 'y-out'
 */
function fitproView (action) {
  if (typeof plt_obj === 'undefined' || !plt_obj.xScale || !fit_obj.objIdArr.length) return
  var xs = plt_obj.xScale
  var ys = plt_obj.yScale
  fit_obj.calc_limits()
  var fullX = [fit_obj.data_min_x, fit_obj.data_max_x]
  var fullY = [fit_obj.data_min_y, fit_obj.data_max_y]

  if (action === 'reset') {
    xs.domain(fullX)
    ys.domain(fullY)
  } else if (action === 'limits') {
    var x0 = Math.min(parseFloat(plt_obj.glb_sel_x0), parseFloat(plt_obj.glb_sel_x1))
    var x1 = Math.max(parseFloat(plt_obj.glb_sel_x0), parseFloat(plt_obj.glb_sel_x1))
    if (!(x0 > 0 && x1 > x0)) return
    var yr = fitproYRange(x0, x1)
    xs.domain([x0, x1])
    if (yr) ys.domain(yr)
  } else if (action === 'x-in' || action === 'x-out') {
    var nx = fitproZoomLog(xs.domain(), action === 'x-in' ? 1 / FITPRO_ZOOM_STEP : FITPRO_ZOOM_STEP)
    // Do not zoom out beyond twice the full data range (in decades).
    var fullDecades = Math.log10(fullX[1] / fullX[0])
    if (Math.log10(nx[1] / nx[0]) > 2 * fullDecades) return
    xs.domain(nx)
  } else if (action === 'y-in' || action === 'y-out') {
    var ny = fitproZoomLinear(ys.domain(), action === 'y-in' ? 1 / FITPRO_ZOOM_STEP : FITPRO_ZOOM_STEP)
    if (ny[1] - ny[0] > 2 * (fullY[1] - fullY[0])) return
    ys.domain(ny)
  }
  fitproRedrawPlot(false)
}

// ---------------------------------------------------------------------------
// Drag the fit limits (the two vertical lines) on the main plot, as well as
// with the Fit Slider Range. Grabbing within a few pixels of a line drags it;
// anywhere else the plot pans and zooms as before.
// ---------------------------------------------------------------------------

var FITPRO_GRAB_PX = 6

function fitproPlotArea () {
  return document.querySelector('#chart d3fc-svg.plot-area') || document.querySelector('#chart .plot-area')
}

// Which fit limit (0 = from, 1 = to) is under clientX, or -1.
function fitproLimitAt (clientX) {
  if (typeof plt_obj === 'undefined' || !plt_obj.xScale || !fit_obj.objIdArr.length) return -1
  var area = fitproPlotArea()
  if (!area) return -1
  var left = area.getBoundingClientRect().left
  var d0 = Math.abs(left + plt_obj.xScale(parseFloat(plt_obj.glb_sel_x0)) - clientX)
  var d1 = Math.abs(left + plt_obj.xScale(parseFloat(plt_obj.glb_sel_x1)) - clientX)
  if (Math.min(d0, d1) > FITPRO_GRAB_PX) return -1
  return d0 <= d1 ? 0 : 1
}

// Move a fit limit to tau (ms), keeping from < to and inside the slider's range,
// and update the slider, the Fit from/to boxes and the lines on the plot.
function fitproSetLimit (which, tau) {
  var lo = plt_obj.sliderRange ? plt_obj.sliderRange.min() : fit_obj.data_min_x
  var hi = plt_obj.sliderRange ? plt_obj.sliderRange.max() : fit_obj.data_max_x
  var x0 = parseFloat(plt_obj.glb_sel_x0)
  var x1 = parseFloat(plt_obj.glb_sel_x1)
  tau = Math.min(Math.max(tau, lo), hi)
  // Keep the two limits at least a few pixels apart, so the fit window
  // always contains data points.
  var gap = 2 * FITPRO_GRAB_PX
  if (which === 0) x0 = Math.max(lo, Math.min(tau, plt_obj.xScale.invert(plt_obj.xScale(x1) - gap)))
  else x1 = Math.min(hi, Math.max(tau, plt_obj.xScale.invert(plt_obj.xScale(x0) + gap)))
  plt_obj.glb_sel_x0 = x0
  plt_obj.glb_sel_x1 = x1
  change_fit_btn_val(Math.round(x0 * 10000) / 10000, Math.round(x1 * 10000) / 10000)
  if (plt_obj.sliderRange) plt_obj.sliderRange.silentValue([x0, x1])
  plt_obj.update_vertical(x0, x1, fit_obj.data_min_y, fit_obj.data_max_y)
}

;(function () {
  var chart = document.getElementById('chart')
  if (!chart) return
  var dragging = -1

  // Capture phase: runs before d3-zoom, so grabbing a line does not also pan.
  chart.addEventListener('mousedown', function (e) {
    if (e.button !== 0) return
    var which = fitproLimitAt(e.clientX)
    if (which < 0) return
    dragging = which
    e.stopPropagation()
    e.preventDefault()
    document.body.style.cursor = 'ew-resize'
  }, true)

  window.addEventListener('mousemove', function (e) {
    if (dragging < 0) {
      // Show that a line can be grabbed.
      if (chart.contains(e.target)) chart.style.cursor = fitproLimitAt(e.clientX) >= 0 ? 'ew-resize' : ''
      return
    }
    var area = fitproPlotArea()
    if (!area) return
    fitproSetLimit(dragging, plt_obj.xScale.invert(e.clientX - area.getBoundingClientRect().left))
  })

  window.addEventListener('mouseup', function () {
    if (dragging < 0) return
    dragging = -1
    document.body.style.cursor = ''
  })
})()

;(function () {
  var buttons = document.querySelectorAll('[data-collapse] > .card > .card-header > .panel-toggle-btn, [data-collapse] > .card-header > .panel-toggle-btn')
  for (var i = 0; i < buttons.length; i++) {
    fitproSetButton(buttons[i].closest('[data-collapse]'), buttons[i])
  }
  var wideBtn = document.getElementById('dataViewerWideBtn')
  if (wideBtn) fitproSetWideButton(wideBtn)

  // d3-zoom only cancels the wheel event when it actually zooms (not past the
  // zoom-out limit, and not over the plot's margins), so the page could
  // scroll instead. Over the plot, the wheel belongs to the plot.
  var chart = document.getElementById('chart')
  if (chart) {
    chart.addEventListener('wheel', function (event) { event.preventDefault() }, { passive: false })
  }
})()

// ---------------------------------------------------------------------------
// Zoom help ("?" next to the zoom buttons), the splash icon as a file button,
// and loading files dropped anywhere on the page.

var FITPRO_PHOTON_EXT = ['pt3', 'ptu', 'pt2', 'spc', 'asc']
var FITPRO_CURVE_EXT = ['sin', 'fcs', 'csv']

function fitproExtension (name) {
  var dot = name.lastIndexOf('.')
  return dot < 0 ? '' : name.slice(dot + 1).toLowerCase()
}

// A .csv is either correlated curves (scripts/impt_csv.js) or FoCuS time-tag
// photons ("pt uncorrelated", core/io/tttr_csv.js): look at its header.
function fitproIsTimeTagCsv (file) {
  return file.slice(0, 256).text().then(function (head) {
    return /^\s*type\s*,\s*pt uncorrelated/m.test(head)
  }, function () { return false })
}

async function fitproLoadFiles (fileList) {
  var files = Array.prototype.slice.call(fileList)
  var curves = []
  var photons = []
  var profiles = []
  var unknown = []
  for (var i = 0; i < files.length; i++) {
    var f = files[i]
    var ext = fitproExtension(f.name)
    if (FITPRO_PHOTON_EXT.indexOf(ext) >= 0) photons.push(f)
    else if (ext === 'csv' && await fitproIsTimeTagCsv(f)) photons.push(f)
    else if (FITPRO_CURVE_EXT.indexOf(ext) >= 0) curves.push(f)
    else if (ext === 'json') profiles.push(f)
    else unknown.push(f.name)
  }
  if (unknown.length) {
    alert('These files are not a type that can be loaded:\n' + unknown.join('\n') +
      '\n\nCorrelated curves: .sin .fcs .csv\nPhoton files: .pt3 .ptu .pt2 .spc .asc, time-tag .csv\nFit profiles: .json')
  }
  // open_file_imprt dispatches on the extension in lower case for .csv/.fcs.
  if (curves.length) open_file_imprt({ target: { files: curves } })
  if (profiles.length && profileHaveData()) {
    var p = profiles[0]
    profileImportText(await p.text(), p.name)
  }
  if (photons.length) {
    var panel = document.getElementById('correlationPanel')
    if (panel && panel.classList.contains('collapsed')) {
      var btn = panel.querySelector('.panel-toggle-btn')
      if (btn) btn.click()
    }
    await window.correlatePhotonFiles(photons)
  }
}

(function () {
  fitproInitHelp()

  var splashBtn = document.getElementById('splashOpenBtn')
  if (splashBtn) {
    splashBtn.addEventListener('click', function () {
      var input = document.querySelector('input[onchange^=open_file_imprt]')
      if (input) input.click()
    })
  }

  // Drag and drop anywhere on the page. Without preventDefault on dragover
  // and drop, the browser (and Electron) would navigate to the dropped file.
  var overlay = document.getElementById('fitproDropOverlay')
  var depth = 0
  function hasFiles (event) {
    var types = event.dataTransfer && event.dataTransfer.types
    return !!types && Array.prototype.indexOf.call(types, 'Files') >= 0
  }
  function hide () { depth = 0; if (overlay) overlay.classList.remove('show') }
  window.addEventListener('dragenter', function (event) {
    if (!hasFiles(event)) return
    event.preventDefault()
    depth++
    if (overlay) overlay.classList.add('show')
  })
  window.addEventListener('dragover', function (event) {
    if (!hasFiles(event)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  })
  window.addEventListener('dragleave', function (event) {
    if (!hasFiles(event)) return
    if (--depth <= 0) hide()
  })
  window.addEventListener('drop', function (event) {
    if (!hasFiles(event)) return
    event.preventDefault()
    hide()
    if (event.dataTransfer.files.length) fitproLoadFiles(event.dataTransfer.files)
  })
})()

// ---------------------------------------------------------------------------
// Data filter (ac:/cc: channel checkboxes in the Data Viewer): show only the
// channels that occur in the loaded curves. The ch_type -> checkbox mapping
// is the one populate_data_viewer uses in interface.js.

var FITPRO_CH_OLD = { 0: 'CH1', 1: 'CH2', 2: 'CH12', 3: 'CH21' }

function fitproChannelOf (chType) {
  var s = String(chType)
  if (FITPRO_CH_OLD[s]) return FITPRO_CH_OLD[s]
  var m = /^(\d)_(\d)$/.exec(s)
  if (!m) return null
  return m[1] === m[2] ? 'CH' + m[1] : 'CH' + m[1] + m[2]
}

function fitproUpdateChannelFilter () {
  var box = document.getElementById('channelFilter')
  if (!box) return
  var present = {}
  var objs = (typeof fit_obj !== 'undefined' && fit_obj.objIdArr) || []
  for (var i = 0; i < objs.length; i++) {
    var ch = fitproChannelOf(objs[i].ch_type)
    if (ch) present[ch] = true
  }
  var any = false
  box.querySelectorAll('.fitpro-chfilter-row').forEach(function (row) {
    var shown = 0
    row.querySelectorAll('.fitpro-ch').forEach(function (item) {
      var on = !!present[item.dataset.ch]
      item.hidden = !on
      if (on) shown++
    })
    row.hidden = shown === 0
    if (shown) any = true
  })
  box.querySelector('.fitpro-chfilter-empty').hidden = any
}

(function () {
  // populate_data_viewer (interface.js) runs after every import, removal and
  // filter change, so the filter follows the data.
  var original = window.populate_data_viewer
  if (typeof original === 'function') {
    window.populate_data_viewer = function () {
      var result = original.apply(this, arguments)
      fitproUpdateChannelFilter()
      return result
    }
  }
  fitproUpdateChannelFilter()
})()

// ---------------------------------------------------------------------------
// Click a data point to select its curve in the Data Viewer (Ctrl/Cmd-click
// adds or removes it). A click is a press and release without moving the
// mouse, so dragging still pans the plot.

var FITPRO_PICK_PX = 8

/** Index in fit_obj.objIdArr of the plotted curve with a point within
 *  FITPRO_PICK_PX pixels of the mouse, or -1. */
function fitproCurveAt (clientX, clientY) {
  if (typeof plt_obj === 'undefined' || !plt_obj.xScale) return -1
  var area = fitproPlotArea()
  if (!area) return -1
  var rect = area.getBoundingClientRect()
  var mx = clientX - rect.left
  var my = clientY - rect.top
  if (mx < 0 || my < 0 || mx > rect.width || my > rect.height) return -1
  var best = -1
  var bestD2 = FITPRO_PICK_PX * FITPRO_PICK_PX
  for (var t = 0; t < fit_obj.objIdArr.length; t++) {
    var o = fit_obj.objIdArr[t]
    if (o.toFit !== true || o.checked !== true) continue
    for (var i = 0; i < o.autotime.length; i++) {
      var dx = plt_obj.xScale(o.autotime[i]) - mx
      if (dx * dx > bestD2) continue
      var dy = plt_obj.yScale(o.autoNorm[i]) - my
      var d2 = dx * dx + dy * dy
      if (d2 <= bestD2) { bestD2 = d2; best = t }
    }
  }
  return best
}

/** Select curve idx in the Data Viewer table, as clicking its row does. */
function fitproSelectCurve (idx, add) {
  var table = document.getElementById('table')
  if (!table) return
  var target = null
  for (var i = 0; i < table.rows.length; i++) {
    var row = table.rows[i]
    var isCurve = row.id === '' && row.cells[0] && row.cells[0].id == idx
    if (isCurve) target = row
    if (add) continue
    row.className = isCurve ? 'selected' : ''
  }
  if (!target) return
  if (add) target.className = target.className === 'selected' ? '' : 'selected'
  lastSelectedRow = target
  // Scroll the Data Viewer list (not the page) so the row is visible.
  var box = target.closest('.scroll-box')
  if (box) {
    var r = target.getBoundingClientRect()
    var b = box.getBoundingClientRect()
    if (r.top < b.top) box.scrollTop -= b.top - r.top
    else if (r.bottom > b.bottom) box.scrollTop += r.bottom - b.bottom
  }
  populate_list_view()
  plt_obj.prepare_axis()
}

;(function () {
  var chart = document.getElementById('chart')
  if (!chart) return
  var down = null
  // Capture phase, because d3-zoom stops the mousedown from bubbling.
  chart.addEventListener('mousedown', function (e) {
    down = fitproLimitAt(e.clientX) >= 0 ? null : { x: e.clientX, y: e.clientY }
  }, true)
  window.addEventListener('mouseup', function (e) {
    var start = down
    down = null
    if (!start || Math.abs(e.clientX - start.x) > 3 || Math.abs(e.clientY - start.y) > 3) return
    var idx = fitproCurveAt(e.clientX, e.clientY)
    if (idx >= 0) fitproSelectCurve(idx, e.ctrlKey || e.metaKey)
  }, true)
})()

// ---------------------------------------------------------------------------
// Selecting rows in the Data Viewer highlights their curves on the plot.
// RowClick (interface.js) only changes the rows' classes, so redraw the plot
// when the selection has changed.

;(function () {
  var original = window.RowClick
  if (typeof original !== 'function') return
  function selection () { return itemsInList(false).join(',') }
  window.RowClick = function () {
    var before = selection()
    var result = original.apply(this, arguments)
    if (selection() !== before && typeof plt_obj !== 'undefined' && plt_obj.plot_data && fit_obj.objIdArr.length) {
      plt_obj.prepare_axis()
    }
    return result
  }
})()

// ---------------------------------------------------------------------------
// Plot height: shrink the main plot and residuals so the Main Plot panel fits
// in the window, but no taller than a comfortable size on large screens.

var FITPRO_PLOT_MIN = 260
var FITPRO_PLOT_MAX = 1200
var FITPRO_RES_RATIO = 0.3 // residuals height / main plot height
var FITPRO_RES_MIN = 150 // px

function fitproFitPlotHeight () {
  var chart = document.getElementById('chart')
  var res = document.getElementById('residuals')
  var card = chart && chart.closest('.card')
  if (!chart || !res || !card) return false
  var chartH = chart.offsetHeight
  var resH = res.offsetHeight
  var chartTop = chart.getBoundingClientRect().top + window.scrollY
  var cardBottom = card.getBoundingClientRect().bottom + window.scrollY
  // Everything else in the panel below the top of the plot (buttons, slider, padding).
  var other = cardBottom - chartTop - chartH - resH
  // Leave room for the panel's bottom margin (and a little more), so the
  // page does not end up a few pixels taller than the window.
  var below = (parseFloat(getComputedStyle(card).marginBottom) || 0) + 6
  var avail = window.innerHeight - chartTop - other - below
  // The residuals keep at least FITPRO_RES_MIN, so their axis labels do not overlap.
  var h = avail / (1 + FITPRO_RES_RATIO)
  if (h * FITPRO_RES_RATIO < FITPRO_RES_MIN) h = avail - FITPRO_RES_MIN
  h = Math.round(Math.min(FITPRO_PLOT_MAX, Math.max(FITPRO_PLOT_MIN, h)))
  var r = Math.max(FITPRO_RES_MIN, Math.round(h * FITPRO_RES_RATIO))
  if (h === chartH && r === resH) return false
  chart.style.height = h + 'px'
  res.style.height = r + 'px'
  return true
}

;(function () {
  var timer = null
  function update () {
    if (fitproFitPlotHeight() && typeof plt_obj !== 'undefined' && plt_obj.plot_data) {
      fitproRedrawPlot(false)
    }
  }
  update()
  // The splash above the plot is hidden when data is loaded: fit again then.
  var populate = window.populate_data_viewer
  if (typeof populate === 'function') {
    window.populate_data_viewer = function () {
      var result = populate.apply(this, arguments)
      update()
      return result
    }
  }
  window.addEventListener('resize', function () {
    clearTimeout(timer)
    timer = setTimeout(update, 100)
  })
})()

// ---------------------------------------------------------------------------
// "?" help buttons: <button data-help="key"> shows FITPRO_TOOLTIPS[key]
// (scripts/tooltips.js) in a popover, which closes on a click elsewhere.

function fitproInitHelp () {
  if (!window.bootstrap || !bootstrap.Popover || typeof FITPRO_TOOLTIPS === 'undefined') return
  document.querySelectorAll('[data-help]').forEach(function (btn) {
    var tip = FITPRO_TOOLTIPS[btn.dataset.help]
    if (!tip) return
    btn.title = tip.title
    new bootstrap.Popover(btn, {
      title: tip.title,
      content: tip.html,
      html: true,
      trigger: 'focus',
      placement: 'auto',
      customClass: 'fitpro-help-popover'
    })
  })
  // Keep the focus on the button while clicking inside its popover, so a
  // link there (e.g. to the manual) can be followed before it closes.
  document.addEventListener('mousedown', function (e) {
    if (e.target.closest && e.target.closest('.fitpro-help-popover')) e.preventDefault()
  })
}

// ---------------------------------------------------------------------------
// Save the main plot ('chart') or the residuals ('residuals') as a PNG, as
// shown on screen. A d3fc chart is made of canvases (the data), SVGs (axes and
// grid lines) and HTML labels, so they are drawn one by one into one canvas.

var FITPRO_EXPORT_SCALE = 2 // image pixels per screen pixel
var FITPRO_SVG_PAD = 40 // px

// SVG styles come from the page's CSS; copy the ones that matter onto the
// clone, so the image looks the same outside the page.
var FITPRO_SVG_STYLES = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity',
  'stroke-dasharray', 'opacity', 'font-family', 'font-size', 'font-weight', 'visibility', 'display']

function fitproSvgImage (svg) {
  var clone = svg.cloneNode(true)
  var from = [svg].concat(Array.prototype.slice.call(svg.querySelectorAll('*')))
  var to = [clone].concat(Array.prototype.slice.call(clone.querySelectorAll('*')))
  for (var i = 0; i < from.length; i++) {
    var cs = getComputedStyle(from[i])
    var style = ''
    FITPRO_SVG_STYLES.forEach(function (k) { style += k + ':' + cs.getPropertyValue(k) + ';' })
    to[i].setAttribute('style', style)
  }
  // On the page, tick labels may overhang the SVG's edges; pad it so they
  // are not cut off in the image.
  var rect = svg.getBoundingClientRect()
  var pad = FITPRO_SVG_PAD
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', rect.width + 2 * pad)
  clone.setAttribute('height', rect.height + 2 * pad)
  // Keep d3fc's own viewBox origin (the left axis is drawn at negative x).
  var vb = svg.viewBox && svg.viewBox.baseVal
  var x0 = vb && vb.width ? vb.x : 0
  var y0 = vb && vb.height ? vb.y : 0
  clone.setAttribute('viewBox', [x0 - pad, y0 - pad, rect.width + 2 * pad, rect.height + 2 * pad].join(' '))
  var url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone))
  return new Promise(function (resolve, reject) {
    var img = new Image()
    img.onload = function () { resolve(img) }
    img.onerror = function () { reject(new Error('could not draw the plot axes')) }
    img.src = url
  })
}

async function fitproPlotPng (root) {
  var box = root.getBoundingClientRect()
  var canvas = document.createElement('canvas')
  canvas.width = Math.round(box.width * FITPRO_EXPORT_SCALE)
  canvas.height = Math.round(box.height * FITPRO_EXPORT_SCALE)
  var ctx = canvas.getContext('2d')
  ctx.scale(FITPRO_EXPORT_SCALE, FITPRO_EXPORT_SCALE)
  // The background of the panel the plot sits in (light or dark theme).
  var bgEl = root
  var bg = 'rgba(0, 0, 0, 0)'
  while (bgEl && (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent')) {
    bg = getComputedStyle(bgEl).backgroundColor
    bgEl = bgEl.parentElement
  }
  ctx.fillStyle = bg === 'rgba(0, 0, 0, 0)' ? '#ffffff' : bg
  ctx.fillRect(0, 0, box.width, box.height)

  // Grid lines and axes (SVG) under the data (canvas), in document order.
  var parts = root.querySelectorAll('svg, canvas')
  for (var i = 0; i < parts.length; i++) {
    var el = parts[i]
    if (el.parentElement && el.parentElement.closest('svg')) continue // nested svg
    var r = el.getBoundingClientRect()
    if (!r.width || !r.height) continue
    if (el.tagName.toLowerCase() === 'canvas') {
      ctx.drawImage(el, r.left - box.left, r.top - box.top, r.width, r.height)
    } else {
      var pad = FITPRO_SVG_PAD
      ctx.drawImage(await fitproSvgImage(el), r.left - box.left - pad, r.top - box.top - pad, r.width + 2 * pad, r.height + 2 * pad)
    }
  }

  // Axis labels are HTML text; the y label is drawn rotated.
  root.querySelectorAll('.x-label, .y-label, .chart-label').forEach(function (label) {
    var text = label.textContent.trim()
    if (!text) return
    var r = label.getBoundingClientRect()
    var cs = getComputedStyle(label)
    ctx.save()
    ctx.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily
    ctx.fillStyle = cs.color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.translate(r.left - box.left + r.width / 2, r.top - box.top + r.height / 2)
    if (label.classList.contains('y-label')) ctx.rotate(-Math.PI / 2)
    ctx.fillText(text, 0, 0)
    ctx.restore()
  })

  return new Promise(function (resolve) { canvas.toBlob(resolve, 'image/png') })
}

async function fitproExportPlot (id) {
  var root = document.getElementById(id)
  var name = id === 'residuals' ? 'residuals.png' : 'main_plot.png'
  if (!root || !root.querySelector('canvas') || !root.getBoundingClientRect().height) {
    alert(id === 'residuals' ? 'There are no residuals yet: fit a curve first.' : 'There is no plot yet: load some data first.')
    return
  }
  try {
    var blob = await fitproPlotPng(root)
    if (window.focusDesktop) {
      await window.focusDesktop.saveFile(name, await blob.arrayBuffer())
      return
    }
    var url = URL.createObjectURL(blob)
    var a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(function () { URL.revokeObjectURL(url) }, 1000)
  } catch (e) {
    alert('Could not save the image: ' + e.message)
  }
}

// ---------------------------------------------------------------------------
// Copyright line: in the bottom right, level with the bottom of the Main Plot
// panel (under the Data Viewer), or just below the Data Viewer if that is
// taller. When the columns are stacked (narrow window) it stays at the end.

;(function () {
  var footer = document.querySelector('.fitpro-footer')
  var row = document.querySelector('.container-fluid > .row')
  var main = document.querySelector('.main-panel > .card')
  // The card, not its column: the column stretches to the height of the row.
  var dv = document.querySelector('#dataViewerPanel > .card')
  if (!footer || !row || !main || !dv) return
  row.appendChild(footer)
  row.style.position = 'relative'

  // The Data Viewer list is sized so that the Data Viewer and, under it, the
  // footer end level with the bottom of the Main Plot panel.
  var list = dv.querySelector('.scroll-box')
  var LIST_MIN = 200 // px

  function place () {
    var m = main.getBoundingClientRect()
    var d = dv.getBoundingClientRect()
    if (d.top >= m.bottom || d.left < m.right) { // stacked: back to the flow
      footer.classList.remove('fitpro-footer-placed')
      footer.style.top = ''
      footer.style.right = ''
      footer.style.width = ''
      if (list) { list.style.height = ''; list.style.minHeight = ''; list.style.maxHeight = '' }
      return
    }
    footer.classList.add('fitpro-footer-placed')
    footer.style.width = Math.round(d.width) + 'px'
    if (list && !dv.closest('.collapsed')) {
      var want = list.offsetHeight + (m.bottom - footer.offsetHeight - 6) - d.bottom
      want = Math.max(LIST_MIN, Math.round(want))
      if (Math.abs(want - list.offsetHeight) > 1) {
        list.style.height = want + 'px'
        list.style.minHeight = want + 'px'
        list.style.maxHeight = want + 'px'
      }
      d = dv.getBoundingClientRect()
      m = main.getBoundingClientRect()
    }
    var r = row.getBoundingClientRect()
    var top = m.bottom - r.top - footer.offsetHeight
    top = Math.max(top, d.bottom - r.top + 4)
    footer.style.top = Math.round(top) + 'px'
    footer.style.right = Math.round(r.right - d.right) + 'px'
  }
  place()
  if (window.ResizeObserver) {
    var ro = new ResizeObserver(place)
    ro.observe(row); ro.observe(main); ro.observe(dv)
  }
  window.addEventListener('resize', place)
})()

// ---------------------------------------------------------------------------
// Buttons marked data-icon="name" get that icon (e.g. the plot zoom buttons).
// Data Viewer text size: the zoom buttons in its header, remembered in this
// browser.

var FITPRO_DV_SCALES = [0.7, 0.8, 0.9, 1, 1.1, 1.25, 1.4]
var FITPRO_DV_SCALE_KEY = 'focus-fit.dataViewerTextScale'

function fitproDataViewerZoom (step) {
  var list = document.getElementById('data-list')
  if (!list) return
  var i = FITPRO_DV_SCALES.indexOf(fitproDataViewerZoom.scale)
  if (i < 0) i = FITPRO_DV_SCALES.indexOf(1)
  i = Math.max(0, Math.min(FITPRO_DV_SCALES.length - 1, i + step))
  var scale = FITPRO_DV_SCALES[i]
  fitproDataViewerZoom.scale = scale
  list.style.fontSize = scale + 'em'
  var zin = document.getElementById('dataViewerZoomIn')
  var zout = document.getElementById('dataViewerZoomOut')
  if (zin) zin.disabled = i === FITPRO_DV_SCALES.length - 1
  if (zout) zout.disabled = i === 0
  if (step !== 0) { try { localStorage.setItem(FITPRO_DV_SCALE_KEY, String(scale)) } catch (e) {} }
}

;(function () {
  document.querySelectorAll('[data-icon]').forEach(function (el) {
    if (FITPRO_ICONS[el.dataset.icon]) el.innerHTML = fitproIcon(el.dataset.icon)
  })
  var saved = null
  try { saved = parseFloat(localStorage.getItem(FITPRO_DV_SCALE_KEY)) } catch (e) {}
  fitproDataViewerZoom.scale = FITPRO_DV_SCALES.indexOf(saved) >= 0 ? saved : 1
  fitproDataViewerZoom(0)
})()

// ---------------------------------------------------------------------------
// Parameter table height: when the Fit Controls panel would reach below the
// Main Plot panel, the table scrolls instead, so the left column ends level
// with the other two (and the page needs no scrollbar). Small models, and
// tall windows, show the whole table.

;(function () {
  var box = document.getElementById('paramBox')
  var card = document.querySelector('#fitControlsPanel > .card')
  var main = document.querySelector('.main-panel > .card')
  var form = document.getElementById('form_sample')
  if (!box || !card || !main) return
  var BOX_MIN = 150 // px

  function fit () {
    var m = main.getBoundingClientRect()
    var c = card.getBoundingClientRect()
    var stacked = c.left >= m.left || c.top >= m.bottom
    if (stacked || card.closest('.collapsed')) {
      if (box.style.maxHeight) box.style.maxHeight = ''
      return
    }
    // How tall the box may be for the panel to end at the Main Plot's bottom.
    var allowed = box.offsetHeight - (c.bottom - m.bottom)
    var want = allowed >= box.scrollHeight ? '' : Math.max(BOX_MIN, Math.floor(allowed)) + 'px'
    if (box.style.maxHeight !== want) box.style.maxHeight = want
  }

  fit()
  if (window.ResizeObserver) {
    var ro = new ResizeObserver(fit)
    ro.observe(main); ro.observe(card)
    if (form) ro.observe(form) // rows added or removed when the model changes
    var corr = document.querySelector('#correlationPanel > .card')
    if (corr) ro.observe(corr) // the Correlation panel minimised or expanded
  }
  window.addEventListener('resize', fit)
})()
