# FoCuS-fit-JS
FoCuS-fit-JS is a JavaScript browser based software for fitting correlated FCS (Fluorescence Correlation Spectroscopy) curves. This is browser version of the fitting software previously included with FoCuS-point and FoCuS-scan Python software. 

### Software

Click here to visit and use the software - https://dwaithe.github.io/FCSfitJS/

### Supported Files  

At this time, FoCuS-fit-JS supports correlated files of the following types: 

- Zeiss FCS files Version >= 3.0 (.fcs files)  
- Correlator.com files Version >= 1.0 (.sin files)  
- FoCuS-point/scan correlated files Version >=2.0 (.csv files)  

If you have a file which is not presently supported, but you would like to fit with this software, then please submit a request in the below cited Issues section.

### Manual and Documentation

To find out how to use and understand the functionality of FoCuS-fit-JS, please visit the manual: https://dwaithe.github.io/FCSfitJS/manual/manual.html

### Issues

Found a bug, have a question, or want to suggest a feature? Please visit the following page and register your issue: https://github.com/dwaithe/FCSfitJS/issues

### Offline use  

A browser (e.g. Chrome, Safari, Mozilla) is needed to use the FoCuS-fit-JS software, but not a internet connection. To use the software offline then please download a copy of this repository (see the green button marked 'Code' above, and click 'Download as ZIP'). To use the software please unzip the downloaded file and open the local copy of index.html file in your browser. The offline version although fully functional will not be updated automatically if bugs are found over time. For the latest version of the software please visit the online version of the software, or download a fresh version of the repository.

### How to Cite

Paper coming soon: 
Article Title : Open-source browser-based software simplifies fluorescence correlation spectroscopy data analysis
DOI : 10.1038/s41566-021-00876-x
NPHOT-2021-07-00829


### Want to use your own model?

When performing FCS fitting sometimes you may want to implement a novel model. With FoCuS-fit-JS it is possible to install new custom models. To install a custom model please refer to the script in the 'custommodels' folder entitled 'custom_models.js'. Here you can see an example model called 'PB Correction'. First xlone the repository to your local machine so you can edit the files. To add your own model you must do three things:
- Name your model (e.g. DW CUSTOM MDOEL 2), and add push to the array 'fit_obj.diffModEqSel'.
- Initialize your model in 'custom_model_init' function, by defining the parameters and their order.
- Define the equation of your model in 'custom_model_equation'.

By referring to the example and to the pointers in the 'custom_models.js' file it should be possible to install a new model with some basic JavaScript expertise. You may want to push your new model to the main branch (e.g. if publishing) or maintain your own fork with the model, either locally or online for others to use. If you follow these steps, then refresh the browser view, then your equation should appear in the equation selection box.



