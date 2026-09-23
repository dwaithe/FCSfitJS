// Fit profiles: the model choice (equation, triplet, 2D/3D, number of
// species and triplet states) plus the parameter table (initial value, vary,
// min, max) of the curve selected in "Display model parameters for data".
//
//   Save    stores the current profile in this browser (localStorage)
//   Load    applies the profile saved in this browser
//   Export  downloads the current profile as a .json file
//   Import  applies a profile from a .json file
//
// In the desktop app (window.focusDesktop), Export and Import use the native
// file dialogs; in a browser they use a download and a file picker.

var PROFILE_STORAGE_KEY = 'focus-fit.profile'
var PROFILE_FORMAT = 'FoCuS-Fit-JS fit profile'

function profileStatus (text) {
  var el = document.getElementById('profile_status')
  if (!el) return
  el.textContent = text
  clearTimeout(profileStatus.timer)
  profileStatus.timer = setTimeout(function () { el.textContent = '' }, 4000)
}

function profileHaveData () {
  if (fit_obj.objIdArr.length > 0 && fit_obj.objId_sel) return true
  alert('Please load some data first: a profile applies to the parameters of the selected curve.')
  return false
}

/** The current settings as a plain object. */
function profileCurrent () {
  update_params() // take any values typed into the table
  var param = {}
  for (var i = 0; i < fit_obj.order_list.length; i++) {
    var k = fit_obj.order_list[i]
    var p = fit_obj.objId_sel.param[k]
    if (p && p.calc === false) {
      param[k] = { value: parseFloat(p.value), vary: !!p.vary, minv: parseFloat(p.minv), maxv: parseFloat(p.maxv) }
    }
  }
  return {
    format: PROFILE_FORMAT,
    version: 1,
    equation: String(document.getElementById('equation').value),
    triplet: String(document.getElementById('triplet').value),
    dimension: String(document.getElementById('dimension').value),
    diffNum: parseInt(document.getElementById('diffNumSpecSpin').value, 10),
    tripNum: parseInt(document.getElementById('tripNumSpecSpin').value, 10),
    param: param
  }
}

/**
 * Apply a profile the same way the menus do: choose the equation
 * (react_to_eqn_change), then triplet/dimension/species
 * (react_to_fit_change), then fill in the parameter table.
 * Also reads profiles saved by the previous version (fields param,
 * def_options, equation).
 */
function profileApply (profile) {
  if (!profile || typeof profile !== 'object' || !profile.param) throw new Error('This file is not a fit profile.')
  var legacy = !profile.format && profile.def_options // profile_settings.json from older versions
  var opts = legacy ? profile.def_options : null
  var equation = String(profile.equation)
  if (!document.querySelector('#equation option[value="' + equation + '"]')) {
    throw new Error('The profile uses an equation that is not available here (' + equation + ').')
  }
  document.getElementById('equation').value = equation
  react_to_eqn_change()
  if (fit_obj.eqn_selected == 0 || fit_obj.eqn_selected == 1) {
    document.getElementById('triplet').value = String(legacy ? opts.Triplet_eq : profile.triplet)
    document.getElementById('dimension').value = String(legacy ? opts.Dimen : profile.dimension)
    document.getElementById('diffNumSpecSpin').value = legacy ? opts.Diff_species : profile.diffNum
    document.getElementById('tripNumSpecSpin').value = legacy ? opts.Triplet_species : profile.tripNum
    react_to_fit_change()
  }
  var sel = fit_obj.objId_sel.param
  for (var k in profile.param) {
    if (!sel[k] || sel[k].calc !== false) continue
    var p = profile.param[k]
    if (p.value !== undefined) sel[k].value = p.value
    if (p.vary !== undefined) sel[k].vary = !!p.vary
    if (p.minv !== undefined) sel[k].minv = p.minv
    if (p.maxv !== undefined) sel[k].maxv = p.maxv
  }
  define_form()
}

function profileSave () {
  if (!profileHaveData()) return
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profileCurrent()))
    profileStatus('Profile saved.')
  } catch (e) {
    alert('Could not save the profile in this browser: ' + e.message)
  }
}

function profileLoad () {
  if (!profileHaveData()) return
  var text = null
  try { text = localStorage.getItem(PROFILE_STORAGE_KEY) } catch (e) {}
  if (!text) { alert('No profile has been saved yet. Use Save first.'); return }
  try {
    profileApply(JSON.parse(text))
    profileStatus('Profile loaded.')
  } catch (e) {
    alert('Could not load the saved profile: ' + e.message)
  }
}

function profileExport () {
  if (!profileHaveData()) return
  var json = JSON.stringify(profileCurrent(), null, 2)
  var name = 'fit_profile.json'
  if (window.focusDesktop) {
    window.focusDesktop.saveFile(name, json).then(function (path) {
      if (path) profileStatus('Profile exported.')
    }, function (e) { alert('Could not export the profile: ' + e.message) })
    return
  }
  download(json, name, 'application/json')
  profileStatus('Profile exported.')
}

function profileImportText (text, name) {
  try {
    profileApply(JSON.parse(text))
    profileStatus('Profile imported from ' + name + '.')
  } catch (e) {
    alert('Could not import ' + name + ': ' + e.message)
  }
}

function profileImport () {
  if (!profileHaveData()) return
  if (window.focusDesktop) {
    window.focusDesktop.openFiles().then(function (files) {
      if (files.length) profileImportText(new TextDecoder().decode(files[0].bytes), files[0].name)
    }, function (e) { alert('Could not open the file: ' + e.message) })
    return
  }
  var input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json,application/json'
  input.onchange = function () {
    var file = input.files[0]
    if (!file) return
    var reader = new FileReader()
    reader.onload = function () { profileImportText(reader.result, file.name) }
    reader.readAsText(file)
  }
  input.click()
}

document.getElementById('profile_load').onclick = profileLoad
document.getElementById('profile_save').onclick = profileSave
document.getElementById('profile_import').onclick = profileImport
document.getElementById('profile_export').onclick = profileExport
