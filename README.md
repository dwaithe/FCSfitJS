# FoCuS-Fit-JS
FoCuS-Fit-JS is JavaScript browser-based software for correlating and fitting FCS (Fluorescence Correlation Spectroscopy) data. It is the browser version of the correlation and fitting software previously included with the FoCuS-point and FoCuS-scan Python software: it can correlate raw photon (TCSPC) files, and fit curves correlated by FoCuS-Fit-JS, by other software or by a hardware correlator. Everything runs locally in your browser; your data are not uploaded anywhere.

### Software

Click here to visit and use the software - https://dwaithe.github.io/FCSfitJS/

### Supported Files  

At this time, FoCuS-Fit-JS supports correlated files of the following types: 

- Zeiss FCS files Version >= 3.0 (.fcs files)  
- Correlator.com files Version >= 1.0 (.sin files)  
- FoCuS-point/scan correlated files Version >=2.0 (.csv files)  

and raw photon files, which it correlates (as FoCuS-point does), of the following types:

- PicoQuant files (.pt3, .ptu and .pt2 files)  
- Becker & Hickl files (.spc files)  
- .asc files  
- FoCuS-point time-tag files (.csv files)  

Files can be opened with the 'Choose Files' buttons or dragged onto the page.

If you have a file which is not presently supported, but you would like to fit with this software, then please submit a request in the below cited Issues section.

### Manual and Documentation

To find out how to use and understand the functionality of FoCuS-Fit-JS, please visit the manual: https://dwaithe.github.io/FCSfitJS/manual/manual.html

### Issues

Found a bug, have a question, or want to suggest a feature? Please visit the following page and register your issue: https://github.com/dwaithe/FCSfitJS/issues

### Offline use  

A browser (e.g. Chrome, Safari, Firefox) is needed to use the FoCuS-Fit-JS software, but not an internet connection. To use the software offline then please download a copy of this repository (see the green button marked 'Code' above, and click 'Download as ZIP'). To use the software please unzip the downloaded file and open the local copy of index.html file in your browser. The offline version although fully functional will not be updated automatically if bugs are found over time. For the latest version of the software please visit the online version of the software, or download a fresh version of the repository.

### How to Cite

If you use FoCuS-Fit-JS in your work, please cite:

*Open-source browser-based software simplifies fluorescence correlation spectroscopy data analysis*, Nature Photonics (2021). DOI: [10.1038/s41566-021-00876-x](https://doi.org/10.1038/s41566-021-00876-x)  
https://www.nature.com/articles/s41566-021-00876-x


### Want to use your own model?

When performing FCS fitting you may want to use a novel model. With FoCuS-Fit-JS it is possible to add new custom models. To add a custom model, please refer to the script in the 'custommodels' folder entitled 'custom_models.js'. Here you can see an example model called 'PB Correction'. First clone (or download) the repository to your local machine so you can edit the files. To add your own model you must do three things:
- Name your model (e.g. 'DW CUSTOM MODEL 2') and add it to the array 'fit_obj.diffModEqSel' with `fit_obj.diffModEqSel.push('DW CUSTOM MODEL 2')`.
- Initialise your model in the 'custom_model_init' function, by defining its parameters and their order ('order_list').
- Define the equation of your model in 'custom_model_equation'.

A few things to know when writing them:
- Custom models are numbered in the order they are pushed, from 0: the example is `model_number == 0`, so the next model goes in an `if (model_number == 1)` block in both functions.
- 'custom_model_equation' receives the parameter values as an array ('param'), in the order of 'order_list', including only the parameters with `'to_show': true` and `'calc': false`. It returns a function of the lag time τ, in ms (as everywhere in FoCuS-Fit-JS).
- The triplet, 2D/3D and number-of-species options do not apply to custom models, and are disabled while one is selected.

By referring to the example and to the pointers in the 'custom_models.js' file it should be possible to add a new model with some basic JavaScript expertise. You may want to push your new model to the main branch (e.g. if publishing), or maintain your own fork with the model, either locally or online for others to use. After these steps, refresh the browser page and your equation will appear in the equation selection box.

### Implementation notes

FoCuS-fit-JS ports the Python tools FoCuS-point and FoCuS-scan to JavaScript. The ports reproduce the Python results (they are tested against reference outputs made by running the original Python code), with the following deliberate differences.

**Scanning FCS: the last lags of the multiple-tau correlator.** Scanning-FCS carpets are correlated column by column with a multiple-tau correlator derived from the `multipletau` package (Paul Müller). The lag times are spaced quasi-logarithmically: after the first m lags, the intensity trace is repeatedly halved in time resolution (neighbouring points averaged), and m/2 more lags are computed at each level. For some trace lengths, the last level has too few points to compute its last lag. This happens when the number of lines N, rounded down to an even number, satisfies floor(N / 2^k) = m, where k = floor(log2(N / m)); that is about one line count in m (for m = 30: 240-247, 480-495, ..., 61440-63487 lines).

- FoCuS-scan's autocorrelation then kept the full curve length. It left the last-but-one point unnormalised (a raw sum of products, often large and of either sign) and set the last point to 0. The cross-correlation of two channels was instead shortened, so the two curves no longer had the same length and two-channel files with such line counts could not be loaded.
- FoCuS-fit-JS does what the original `multipletau` package does (and what FoCuS-scan's own cross-correlation already did): the calculation stops and the curve ends two lags early (the original package also drops the lag just before the one that cannot be computed). Every point returned is correctly normalised, and auto- and cross-correlations have the same lags. All other points are unchanged. For every other line count, the results are identical to FoCuS-scan's.

**Scanning FCS: spatial binning.** Spatial binning adds up neighbouring pixels along the scanned line before each column is correlated, for more signal. FoCuS-scan added up one pixel too few, and not centred: with binning 3, column *i* was pixels *i*−1 and *i*, while the count rate and N&B brightness were still divided by 3 (so they came out at 2/3 of the true value; 4/5 with binning 5). Even values gave empty curves (2) or repeated the next odd value. FoCuS-fit-JS adds up the s pixels centred on each column (*i*−(s−1)/2 to *i*+(s−1)/2) and accepts odd values only (1, 3, 5, …). Binning 1 (no binning) is unchanged.

**Scanning FCS: crop.** FoCuS-scan's crop applied the line and column range twice for two-channel TIFF files, so every interval after the first, and any column range not starting at pixel 0, came out wrong or empty (one-channel files and the other formats were correct). For .lsm files the default column range could stop at the number of lines rather than the number of pixels. FoCuS-fit-JS crops once, for every format, with all pixels by default.

