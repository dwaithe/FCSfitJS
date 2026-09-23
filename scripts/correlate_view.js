// FoCuS-Fit-JS: the "Correlate photon files" panel.
//
// Reads raw photon files (.pt3, .ptu, .pt2, .spc, .asc, time-tag .csv),
// correlates them in a Web Worker (core/workers/correlate.worker.js) and adds
// the curves to the fitter, as FoCuS-point's picoObject would: one curve per
// channel pair, named <file>_CHi_CHj_Auto_Corr / _Cross_Corr, with kcount on
// autocorrelations and the coincidence value (CV) on cross-correlations.
// Lag times are in ms, as everywhere else in the fitter.
//
// Kept in its own file so the FoCuS-fit-JS scripts stay merge-friendly.

(function () {
  var input = document.getElementById('correlate_files')
  var status = document.getElementById('correlate_status')
  if (!input || !window.FocusCore) return

  var correlator = null

  function intValue (id) {
    var v = document.getElementById(id).value
    return v === '' ? null : parseInt(v, 10)
  }

  function readOptions () {
    var opts = {
      NcascStart: intValue('corr_NcascStart'),
      NcascEnd: intValue('corr_NcascEnd'),
      Nsub: intValue('corr_Nsub'),
      winInt: intValue('corr_winInt'),
      legacy: document.getElementById('corr_legacy').checked
    }
    var g0 = intValue('corr_gate0')
    var g1 = intValue('corr_gate1')
    if (g0 !== null && g1 !== null) opts.gate = [g0, g1]
    return opts
  }

  // Build fitter curves the way picoObject.processData builds corrObjects.
  function addCurves (fileName, result, options) {
    var parent = 'point FCS'
    if (options.gate) {
      // As subPicoObject names its curves' parent.
      parent = 'pt FCS tgated -tg0: ' + Math.round(options.gate[0]) + ' -tg1: ' + Math.round(options.gate[1])
    }
    result.curves.forEach(function (c) {
      var obj = new CorrObj(fileName)
      obj.name = obj.name + '_' + c.label
      obj.parent_name = parent
      obj.parent_uqid = parent
      obj.ch_type = (c.i + 1) + '_' + (c.j + 1)
      obj.siblings = null
      obj.autotime = Array.from(c.autotime)
      obj.autoNorm = Array.from(c.autoNorm)
      if (c.kcount !== null) obj.kcount = c.kcount
      if (c.CV !== null) obj.CV = c.CV
      obj.param = JSON.parse(JSON.stringify(fit_obj.def_param))
      obj.max = d3.max(obj.autoNorm)
      obj.min = d3.min(obj.autoNorm)
      obj.tmax = d3.max(obj.autotime)
      obj.tmin = d3.min(obj.autotime)
      fit_obj.objIdArr.push(obj)
    })
  }

  // The same refresh open_file_imprt does after importing files.
  function refreshViews () {
    document.getElementById('splash').style.display = 'none'
    populate_data_viewer()
    fit_obj.calc_limits()
    plt_obj.prepare_slider(fit_obj.data_min_x, fit_obj.data_max_x, fit_obj.data_min_y, fit_obj.data_max_y)
    plt_obj.define_scale()
    plt_obj.prepare_axis()
  }

  // Status: the file name on one line, and below it what is happening, with
  // a dash progress bar while reading and correlating.
  var BAR_DASHES = 30

  function showStatus (fileLabel, text, fraction) {
    status.textContent = ''
    var name = document.createElement('div')
    name.className = 'correlate-status-file'
    name.textContent = fileLabel
    name.title = fileLabel
    status.appendChild(name)
    var line = document.createElement('div')
    if (fraction !== undefined) {
      var done = Math.round(BAR_DASHES * Math.max(0, Math.min(1, fraction)))
      var bar = document.createElement('span')
      bar.className = 'correlate-bar'
      var on = document.createElement('span')
      on.className = 'correlate-bar-done'
      on.textContent = '-'.repeat(done)
      var off = document.createElement('span')
      off.className = 'correlate-bar-todo'
      off.textContent = '-'.repeat(BAR_DASHES - done)
      bar.appendChild(on)
      bar.appendChild(off)
      line.appendChild(document.createTextNode(text + ' '))
      line.appendChild(bar)
      line.appendChild(document.createTextNode(' ' + Math.round(100 * fraction) + '%'))
    } else {
      line.textContent = text
    }
    status.appendChild(line)
  }

  // Correlate a list of photon files (from the file input or dropped on the
  // page) and add their curves to the fitter.
  async function correlateFiles (fileList) {
    var files = Array.prototype.slice.call(fileList)
    if (!files.length) return
    if (!correlator) correlator = FocusCore.require('workers/correlate').createCorrelator(FocusCore)
    var options = readOptions()
    input.disabled = true
    var added = 0
    for (var k = 0; k < files.length; k++) {
      var file = files[k]
      var label = (files.length > 1 ? '(' + (k + 1) + '/' + files.length + ') ' : '') + file.name
      try {
        showStatus(label, 'Reading', 0)
        var result = await correlator.correlate(file, options, function (p) {
          if (p.stage === 'reading') showStatus(label, 'Reading', p.fraction)
          else if (p.stage === 'correlating') showStatus(label, 'Correlating', p.fraction)
        })
        addCurves(file.name, result, options)
        added++
        showStatus(label, result.records.toLocaleString() + ' records, ' + result.curves.length + ' curves added')
      } catch (err) {
        showStatus(label, 'Error: ' + err.message)
        alert('There was a problem correlating file: ' + file.name + '\n' + err.message)
      }
    }
    input.disabled = false
    input.value = ''
    if (added && fit_obj.objIdArr.length > 0) refreshViews()
  }

  input.addEventListener('change', function () { correlateFiles(input.files) })
  window.correlatePhotonFiles = correlateFiles
})()
