// Fast canvas point series for the Fit view plot (scripts/plotting_fns.js).
//
// d3fc's seriesCanvasPoint draws every point on its own (save, translate,
// path, fill, stroke, restore) and runs the colour lookup (getComputedStyle)
// once per point, which makes zooming slow with many curves (e.g. 100 carpet
// columns x 180 lags). This series looks the colour up once per curve and
// draws all of a curve's points as one path with one fill: the same look
// (filled points of the theme colour, about the size of d3fc's default
// circle), many times faster.
//
// It implements what fc.seriesCanvasMulti uses: context, xScale, yScale (and
// crossValue/mainValue, for compatibility). Points outside the plot, or at
// an undefined or non-positive position on a log axis, are skipped.

/* exported fitproPointSeries, FITPRO_POINT_SHAPE, fitproPointRadius, fitproLimitSeries */

// 'circle' or 'square' (squares are cheapest to draw).
var FITPRO_POINT_SHAPE = 'circle'
var FITPRO_POINT_RADIUS = 5 // px: as d3fc's default circle (area 64 px^2) with its 1 px outline

// Point radius: the usual size up to 10 curves on the plot, then smaller so
// that many curves (e.g. carpet columns) stay distinguishable: 5 px x
// sqrt(10 / curves), at least 1.5 px (about 2.2 px for 50 curves, 1.6 for 100).
function fitproPointRadius () {
  var objs = (typeof fit_obj !== 'undefined' && fit_obj.objIdArr) || []
  var n = 0
  for (var i = 0; i < objs.length; i++) if (objs[i].checked && objs[i].toFit) n++
  if (n <= 10) return FITPRO_POINT_RADIUS
  return Math.max(1.5, FITPRO_POINT_RADIUS * Math.sqrt(10 / n))
}

function fitproPointSeries (colorToken) {
  var context = null
  var xScale = null
  var yScale = null
  var cross = function (d) { return d[0] }
  var main = function (d) { return d[1] }

  function series (data) {
    if (!context || !data) return
    var ctx = context
    var r = fitproPointRadius()
    var square = FITPRO_POINT_SHAPE === 'square'
    var xr = xScale.range()
    var yr = yScale.range()
    var x0 = Math.min(xr[0], xr[1]) - r
    var x1 = Math.max(xr[0], xr[1]) + r
    var y0 = Math.min(yr[0], yr[1]) - r
    var y1 = Math.max(yr[0], yr[1]) + r
    ctx.save()
    ctx.fillStyle = themeColor(colorToken) // once per curve (plotting_fns.js)
    ctx.beginPath()
    for (var i = 0; i < data.length; i++) {
      var x = xScale(cross(data[i], i))
      var y = yScale(main(data[i], i))
      if (!(x >= x0 && x <= x1 && y >= y0 && y <= y1)) continue // (also skips NaN)
      if (square) {
        ctx.rect(x - r, y - r, 2 * r, 2 * r)
      } else {
        ctx.moveTo(x + r, y)
        ctx.arc(x, y, r, 0, 2 * Math.PI)
      }
    }
    ctx.fill()
    ctx.restore()
  }

  series.context = function (c) { if (!arguments.length) return context; context = c; return series }
  series.xScale = function (s) { if (!arguments.length) return xScale; xScale = s; return series }
  series.yScale = function (s) { if (!arguments.length) return yScale; yScale = s; return series }
  series.crossValue = function (f) { if (!arguments.length) return cross; cross = f; return series }
  series.mainValue = function (f) { if (!arguments.length) return main; main = f; return series }
  return series
}

// The fit-limit lines are drawn on their own canvas over the plot
// (fitproDrawLimits in scripts/plot_cache.js), so moving them does not
// redraw the data. In the plot itself their series draws nothing.
function fitproLimitSeries () {
  var context = null
  var xScale = null
  var yScale = null
  function series () {}
  series.context = function (c) { if (!arguments.length) return context; context = c; return series }
  series.xScale = function (s) { if (!arguments.length) return xScale; xScale = s; return series }
  series.yScale = function (s) { if (!arguments.length) return yScale; yScale = s; return series }
  return series
}
