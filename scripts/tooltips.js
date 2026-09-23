// Help text for the "?" buttons. Kept together here so it is easy to find
// and edit. Each entry is shown in a popover by the button with the matching
// data-help attribute, e.g. <button data-help="fitButtons">?</button>
// (see fitproInitHelp in scripts/fitpro_ui.js).
//
//   title  the popover heading (plain text)
//   html   the popover body. Bootstrap's sanitizer allows simple markup:
//          p, b, i, ul, li, br, a (links open in a new window / the browser)

var FITPRO_MANUAL_URL = 'https://dwaithe.github.io/FCSfitJS/manual/manual.html'

var FITPRO_TOOLTIPS = {
  zoom: {
    title: 'Zoom and scaling',
    html:
      '<p>Use the scroll wheel to zoom in and out. To zoom along one axis only, ' +
      'scroll whilst over the x or y-axis. Drag the plot to pan.</p>' +
      '<p>Drag the vertical fit-limit lines to change the range that is fitted.</p>' +
      '<p>Click a data point to select its curve in the Data Viewer ' +
      '(Ctrl/Cmd-click to add or remove curves).</p>'
  },

  models: {
    title: 'Fit model',
    html:
      '<p><b>Equation 1A / 1B</b> fit diffusion of one to three species ' +
      '(<i>Diff. species</i>), each with a transit time τxy and an anomalous ' +
      'exponent α. They only differ in 3D: 1A fits the axial transit time τz, ' +
      'whereas 1B fits the aspect ratio AR (τz = AR²·τxy). Custom models, such as ' +
      'PB Correction, are listed after these.</p>' +
      '<p><b>Triplet</b> adds up to three dark (triplet) states (<i>Triplet states</i>): ' +
      'Eq 2A as 1 + B·e<sup>−τ/τT</sup>, Eq 2B as 1 − T + T·e<sup>−τ/τT</sup>, ' +
      'where T is the triplet fraction.</p>' +
      '<p><b>2D</b> is for diffusion in a plane, e.g. a membrane; <b>3D</b> for ' +
      'free diffusion, e.g. in solution, and adds the axial term.</p>' +
      '<p><a href="' + FITPRO_MANUAL_URL + '" target="_blank" rel="noopener">More in the manual</a></p>'
  },

  fitButtons: {
    title: 'Fitting',
    html:
      '<p>Each button fits the chosen model between the fit limits (<i>Fit from</i> / ' +
      '<i>to</i>, the slider or the lines on the plot), starting from the values in ' +
      'the parameter table.</p>' +
      '<ul>' +
      '<li><b>Current</b> fits the curve chosen in <i>Display model parameters for data</i>.</li>' +
      '<li><b>All</b> fits every curve in that list, i.e. all loaded curves that pass ' +
      'the Data filter.</li>' +
      '<li><b>Only highlighted</b> fits the curves selected in the Data Viewer ' +
      '(or by clicking them on the plot).</li>' +
      '</ul>' +
      '<p><i>All</i> and <i>Only highlighted</i> first copy the table (initial values, ' +
      'Vary, Min and Max) to each curve, replacing its own settings.</p>'
  },

  profiles: {
    title: 'Fit profiles',
    html:
      '<p>A profile is the fit model (equation, triplet, 2D/3D, number of species ' +
      'and triplet states) together with the parameter table: initial values, Vary, ' +
      'Min and Max. It saves setting these up again for similar data.</p>' +
      '<ul>' +
      '<li><b>Save</b> keeps the current profile on this computer.</li>' +
      '<li><b>Load</b> applies the profile kept with Save.</li>' +
      '<li><b>Export</b> saves the profile to a .json file, to keep or share.</li>' +
      '<li><b>Import</b> applies a profile from a .json file ' +
      '(or drag the file onto the page).</li>' +
      '</ul>' +
      '<p>A profile applies to the curve in <i>Display model parameters for data</i>; ' +
      'use <i>All</i> or <i>Only highlighted</i> to fit other curves with it.</p>'
  },

  params: {
    title: 'Fit parameters',
    html:
      '<p>Each row is a parameter of the chosen model. <b>Init</b> is the starting ' +
      'value, and shows the fitted value after a fit. Tick <b>Vary</b> to fit the ' +
      'parameter, or untick it to hold it at Init. <b>Min</b> and <b>Max</b> bound ' +
      'the fit.</p>' +
      '<ul>' +
      '<li><b>offset</b>: the baseline of G(τ) at long lag times.</li>' +
      '<li><b>GN0</b>: the amplitude G(0); <b>N (FCS)</b> = 1/GN0 is the number of ' +
      'molecules in the focus and <b>cpm</b> the counts per molecule (kHz), both ' +
      'calculated.</li>' +
      '<li><b>A1–A3</b>: the fraction of the amplitude from each diffusing species. ' +
      'A2 is calculated so that they sum to one (A2 = 1 − A1, or 1 − A1 − A3). They ' +
      'are fractions of molecules only if the species are equally bright.</li>' +
      '<li><b>txy</b>: the lateral transit (diffusion) time, in ms; <b>tz</b> the ' +
      'axial one, or <b>AR</b> the aspect ratio (3D).</li>' +
      '<li><b>alpha</b>: the anomalous exponent; 1 for normal diffusion.</li>' +
      '<li><b>B</b> or <b>T</b>, <b>tauT</b>: the triplet (dark state) amplitude or ' +
      'fraction, and its time in ms.</li>' +
      '</ul>' +
      '<p><a href="' + FITPRO_MANUAL_URL + '" target="_blank" rel="noopener">The equations are in the manual</a></p>'
  },

  copyExport: {
    title: 'Copy and Export',
    html:
      '<p>These act on the selected curves in the Data Viewer, or on all curves if ' +
      'none are selected, and need a fit first.</p>' +
      '<ul>' +
      '<li><b>Param</b>: one row per fitted curve with its name, the model, the fit ' +
      'range and the fitted parameters.</li>' +
      '<li><b>Plot Data</b>: τ (ms) with, for each curve, its G(τ) and fitted model.</li>' +
      '</ul>' +
      '<p><b>Copy</b> puts the table on the clipboard, to paste into a spreadsheet; ' +
      '<b>Export</b> saves it as a .csv file.</p>'
  },

  dataFilter: {
    title: 'Data filter',
    html:
      '<p>Shows or hides curves by channel. Untick a channel to hide its curves ' +
      'from the Data Viewer, the plot and the fitting lists, e.g. to fit only the ' +
      'auto-correlations.</p>' +
      '<ul>' +
      '<li><b>ac</b>: auto-correlations; CH1 is channel 1 correlated with itself.</li>' +
      '<li><b>cc</b>: cross-correlations; CH12 is channel 1 correlated with channel 2, ' +
      'CH21 the reverse.</li>' +
      '</ul>' +
      '<p>Only the channels in the loaded data are listed.</p>'
  },

  dataViewer: {
    title: 'Data Viewer',
    html:
      '<p>Lists the loaded curves, grouped by file type or source.</p>' +
      '<ul>' +
      '<li><b>Select</b> curves by clicking them (Ctrl/Cmd-click to add, ' +
      'Shift-click for a range, or click a group name for the whole group). ' +
      'Selected curves are highlighted on the plot and used by ' +
      '<i>Only highlighted</i>. Clicking a curve on the plot selects it here.</li>' +
      '<li><b>Tick boxes</b> choose which curves are plotted; ' +
      '<b>Plot Checked Data</b> redraws the plot with them, and ' +
      '<b>Check All</b> ticks (or unticks) them all.</li>' +
      '<li><b>Clear Fit Data</b> removes the fits, and <b>Remove Data</b> the curves, ' +
      'of the selected curves, or of all curves if none are selected. ' +
      'Both are also on the right-click menu.</li>' +
      '</ul>'
  }
}
