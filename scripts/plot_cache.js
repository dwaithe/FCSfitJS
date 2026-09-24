// Bitmap cache for moving the Fit view plots.
//
// While the main plot is panned or zoomed with the mouse, its canvas (the
// points, fitted curves and fit-limit markers) is not redrawn from the data
// for every mouse move. Instead, the canvas as last drawn is copied once to a
// bitmap, and each frame draws that bitmap stretched and shifted to the new
// axes. A pan or zoom maps old screen positions to new ones by a stretch and
// a shift on each axis (on the log τ axis too), so the bitmap lines up
// exactly; only the point size changes while zooming. About 150 ms after the
// mouse stops, the plot is drawn sharp from the data again. The axes and
// gridlines (SVG) keep their usual redraw. The residuals plot, which follows
// the main plot's τ range, is cached the same way.
//
// It hooks d3fc's own events, so scripts/plotting_fns.js is unchanged:
// the zoom component's 'zoom' event (namespaced listener) and the canvas
// plot area's 'draw' event, caught in the capture phase before d3fc draws.

;(function () {
  if (typeof plt_obj === 'undefined' || !plt_obj.zoom) return
  var SETTLE_MS = 150 // sharp redraw this long after the last mouse move

  var moving = false
  var settleTimer = null
  // The plots cached: the main plot and the residuals (which follow the
  // main plot's τ range while it moves). snap: the last sharp frame,
  // {canvas, x, y (domains), w, h (device px)}.
  var PLOTS = [
    { selector: '#chart', scales: function () { return [plt_obj.xScale, plt_obj.yScale] }, snap: null },
    { selector: '#residuals', scales: function () { return [plt_obj.x2Res, plt_obj.y2Res] }, snap: null }
  ]

  function plotOf (node) {
    if (!node || !node.matches || !node.matches('d3fc-canvas.plot-area')) return null
    for (var i = 0; i < PLOTS.length; i++) if (node.closest(PLOTS[i].selector)) return PLOTS[i]
    return null
  }

  plt_obj.zoom.on('zoom.fitproCache', function () {
    moving = true
    clearTimeout(settleTimer)
    settleTimer = setTimeout(function () {
      moving = false
      PLOTS.forEach(function (plot) { // sharp, from the data
        var g = document.querySelector(plot.selector + ' d3fc-group')
        if (g && g.requestRedraw) g.requestRedraw()
      })
    }, SETTLE_MS)
  })

  document.addEventListener('draw', function (event) {
    var plot = plotOf(event.target)
    if (!plot || !api.enabled) return
    var d = event.detail || {}
    var canvas = d.child
    var sc = plot.scales()
    if (!canvas || !sc[0] || !sc[1]) return
    var snap = plot.snap
    if (!moving || d.resized || !snap || snap.w !== canvas.width || snap.h !== canvas.height) {
      // A normal (sharp) draw: let d3fc draw, then copy the result. (d3fc
      // resets the canvas size, which clears it, before every draw, so the
      // copy is made as soon as its drawing has finished.)
      var domains = { x: sc[0].domain().slice(), y: sc[1].domain().slice() }
      queueMicrotask(function () {
        if (!canvas.width || !canvas.height) { plot.snap = null; return } // (plot hidden)
        var old = plot.snap
        var c = old && old.w === canvas.width && old.h === canvas.height ? old.canvas : document.createElement('canvas')
        c.width = canvas.width
        c.height = canvas.height
        c.getContext('2d').drawImage(canvas, 0, 0)
        plot.snap = { canvas: c, x: domains.x, y: domains.y, w: canvas.width, h: canvas.height }
      })
      return
    }
    // Moving: draw the bitmap of the last sharp frame instead.
    event.stopPropagation() // d3fc does not draw this frame
    var pr = d.pixelRatio || 1
    var w = canvas.width / pr
    var h = canvas.height / pr
    // Where the old plot's corners are on the new axes (CSS px).
    var oldX = sc[0].copy().domain(snap.x).range([0, w])
    var oldY = sc[1].copy().domain(snap.y).range([h, 0])
    var newX = sc[0].copy().range([0, w])
    var newY = sc[1].copy().range([h, 0])
    var x0 = newX(oldX.invert(0))
    var x1 = newX(oldX.invert(w))
    var yTop = newY(oldY.invert(0))
    var yBottom = newY(oldY.invert(h))
    var ctx = canvas.getContext('2d')
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.imageSmoothingEnabled = true
    if ([x0, x1, yTop, yBottom].every(isFinite)) {
      ctx.drawImage(snap.canvas, x0 * pr, yTop * pr, (x1 - x0) * pr, (yBottom - yTop) * pr)
    }
    ctx.restore()
  }, true)

  // ---------------------------------------------------------------- limit lines

  // The two fit-limit lines, on a transparent canvas over the main plot's
  // canvas: moving the Slider Range (or dragging a line) redraws only them.
  // Redrawn after every draw of the plot too, so they follow zooming and the
  // theme. (The PNG export copies every canvas of the plot, this one included.)
  function drawLimits () {
    var chart = document.getElementById('chart')
    var area = chart && chart.querySelector('d3fc-canvas.plot-area')
    if (!area || !plt_obj.xScale) return
    // (Not inside d3fc's element, which must hold only its own canvas: in
    // #chart, placed exactly over the plot area.)
    var overlay = chart.querySelector('canvas.fitpro-limits')
    if (!overlay) {
      overlay = document.createElement('canvas')
      overlay.className = 'fitpro-limits'
      overlay.style.position = 'absolute'
      overlay.style.pointerEvents = 'none'
      if (getComputedStyle(chart).position === 'static') chart.style.position = 'relative'
      chart.appendChild(overlay)
    }
    var w = area.clientWidth
    var h = area.clientHeight
    if (!w || !h) { overlay.style.display = 'none'; return }
    var ra = area.getBoundingClientRect()
    var rc = chart.getBoundingClientRect()
    overlay.style.display = ''
    overlay.style.left = (ra.left - rc.left + chart.scrollLeft - chart.clientLeft) + 'px'
    overlay.style.top = (ra.top - rc.top + chart.scrollTop - chart.clientTop) + 'px'
    overlay.style.width = w + 'px'
    overlay.style.height = h + 'px'
    var pr = window.devicePixelRatio || 1
    if (overlay.width !== Math.round(w * pr) || overlay.height !== Math.round(h * pr)) {
      overlay.width = Math.round(w * pr)
      overlay.height = Math.round(h * pr)
    }
    var ctx = overlay.getContext('2d')
    ctx.setTransform(pr, 0, 0, pr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    var x = plt_obj.xScale.copy().range([0, w])
    ctx.strokeStyle = themeColor('--plot-marker')
    ctx.lineWidth = 4
    ctx.beginPath()
    ;[plt_obj.glb_sel_x0, plt_obj.glb_sel_x1].forEach(function (v) {
      var px = x(parseFloat(v))
      if (!isFinite(px)) return
      ctx.moveTo(px, 0)
      ctx.lineTo(px, h)
    })
    ctx.stroke()
  }
  window.fitproDrawLimits = drawLimits
  document.addEventListener('draw', function (event) {
    if (event.target && event.target.matches && event.target.matches('#chart d3fc-canvas.plot-area')) queueMicrotask(drawLimits)
  }, true)

  var api = { enabled: true, isMoving: function () { return moving } }
  window.fitproPlotCache = api
})()
