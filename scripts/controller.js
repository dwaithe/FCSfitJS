//Part of the model. The classes and methods here interact with the model elements.

class FittingManager{
    constructor(){

      this.objIdArr =[]
      this.names = [];
      this.setAutoScale = true
      this.colors = ['blue','green','red','orange','magenta','midnightblue','black']
      this.objId_sel = null
      this.root_name ={}
      this.type = null
      this.chisqr = 0.05
      this.norm_to_one = false
      this.bootstrap_enable_toggle = false
      this.model_obj_list = []
      
      
      
      this.order_list = ['offset','GN0','N_FCS','cpm','A1','A2','A3','txy1','txy2','txy3','tz1','tz2','tz3','alpha1','alpha2','alpha3','AR1','AR2','AR3','B1','B2','B3','T1','T2','T3','tauT1','tauT2','tauT3','N_mom','bri','CV','f0','overtb','ACAC','ACCC','above_zero','s2n']
      
      this.diffModEqSel = ['Equation 1A', 'Equation 1B', 'GS neuron', 'Vesicle Diffusion', 'PB Correction']
      this.tripModEqSel = ['no triplet', 'Triplet Eq 2A', 'Triplet Eq 2B']
      this.dimenModSel  = ['2D', '3D']
      this.def_options ={}
      this.def_options['Diff_eq'] = 0


      se_initialise_fcs(this);
      //gs_initialise_fcs(self)
      //vd_initialise_fcs(self)
      //pb_initialise_fcs(self)



  }
  defineTable(selected){
      //If data is present in the array.
        if (this.objIdArr != []){
          var modelFitSel = document.getElementById("modelFitSel");
          //Finds the active data set from the combo box.
          //console.log('modelFitSel',modelFitSel.childElementCount,modelFitSel)
          if  (modelFitSel.childElementCount != 0){
              //console.log('callit',modelFitSel.value,this.model_obj_list)
              this.objId_sel = this.model_obj_list[modelFitSel.value]

              //console.log('consideritcalled',this.model_obj_list)    
              if (this.def_options['Diff_eq'] == 5){
                //PB.decide_which_to_show(self)
              }
              else if (this.def_options['Diff_eq'] == 4){} 
                //VD.decide_which_to_show(self)
              else if (this.def_options['Diff_eq'] == 3){
                //GS.decide_which_to_show(self)
              }
              else{
                se_decide_which_to_show(this)
                se_calc_param_fcs(this.objId_sel)
              }
             // var param = JSON.parse(JSON.stringify(this.objId_sel.param))
          } else{
            
            //var param = JSON.parse(JSON.stringify(this.def_param))
          } 
        }else{
          //var param = JSON.parse(JSON.stringify(this.def_param))
        }
    

    }
    fitToParameters(objId,xpos1,xpos2){
      
       //array of initial parameter values
   
      let name = []
      let initialValues = []
      let minValues = []
      let maxValues = []
      let gradients = []

      //xpos1 = this.dr
      //xpos2 = this.dr1


      //So we take the initial paramters from the selected plot, in the dropdown.
      for (i in this.order_list){
        var art = this.order_list[i];
        if (art in this.objId_sel.param){
         //insures that min max values are synched between different data, as the selected data values are saved.
        if (this.objId_sel.param[art]['to_show'] == true && this.objId_sel.param[art]['calc'] == false){
          name.push(art)
          initialValues.push(parseFloat(this.objId_sel.param[art]['value']))
          if (this.objId_sel.param[art]['vary'] == true){
           
            var minv = parseFloat(this.objId_sel.param[art]['minv'])
            var maxv = parseFloat(this.objId_sel.param[art]['maxv'])  
            minValues.push(minv)
            maxValues.push(maxv)
            gradients.push(10e-4)
          }else{
            gradients.push(10e-40)
            minValues.push(parseFloat(this.objId_sel.param[art]['value']))
            maxValues.push(parseFloat(this.objId_sel.param[art]['value']))

            }
          }
        }}
      
      //Find the nearest index with the x-values.
      var minarrL = objId.autotime.map(function(v){return Math.abs(v-xpos1)})
      var minarrR = objId.autotime.map(function(v){return Math.abs(v-xpos2)})
      
      var minL = 99999
      var minR = 99999
      var indx_L = -1
      var indx_R = -1
      
      for (var i = 0; i < minarrL.length; i++) {
        if (minarrL[i] < minL) {
          minL = minarrL[i]
          indx_L = i }
        if (minarrR[i] < minR) {
          minR = minarrR[i]
          indx_R = i }


      }
    
      console.log(gradients)
      const options = {
         
        damping:0.15,
        initialValues: initialValues,
        minValues: minValues,
        maxValues: maxValues,
        gradientDifference: gradients,
        maxIterations: 100,
        errorTolerance: 10e-5,
        centralDifference: false
         
       };

      var equation = se_fit_diff_eq_1A_B

        

      const data = {x:objId.autotime.slice(indx_L,indx_R+1),y:objId.autoNorm.slice(indx_L,indx_R+1)}



      var start = Date.now()
      var fittedParams = window.fit_equation(data,equation,options)
      var params = fittedParams[0]['parameterValues']
      var error = fittedParams[0]['parameterError']

      console.log(((Date.now()-start)/1000.),'offset',params[0],'GNO',params[1],'A1',params[2],'txy1',params[3],'alpha1',params[4])

      var model_autoNorm = new Array(data.x.length)
      //Now we 
      
     
      var eqn_ = equation(params)
      var residuals = new Array(data.x.length);
      var chi2 = 0
      for (var tc = 0; tc< data.x.length; tc++) {
        model_autoNorm[tc] = eqn_(data.x[tc])
        residuals[tc] =  data.y[tc]-model_autoNorm[tc]
        chi2 += (residuals[tc]*residuals[tc])/model_autoNorm[tc]
      }






      objId.model_autotime = data.x
      objId.model_autoNorm = model_autoNorm
      objId.residuals = residuals
      
      for (i in name){

          objId.param[name[i]].value = params[i]
           }

      if(chi2>this.chisqr){
          console.log('CAUTION DATA DID NOT FIT WELL CHI^2 >',this.chisqr,' ',chi2)
          objId.goodFit = false
        }
      else{
          objId.goodFit = true
        }


      objId.fitted = true
      objId.chisqr = error
      const opts = {year: 'numeric', month: 'long', day: 'numeric' };
      var d = new Date()
      objId.localTime = d.toLocaleDateString(undefined,opts)+" "+d.toLocaleTimeString()

      se_calc_param_fcs(objId)



  }
calc_limits(){
    var min_x_time = []
    var max_x_time = []
    var min_y_time = []
    var max_y_time = []
    for (var i = 0; i < this.objIdArr.length; i++) {
      max_x_time.push(this.objIdArr[i].tmax)
      min_x_time.push(this.objIdArr[i].tmin)
      max_y_time.push(this.objIdArr[i].max)
      min_y_time.push(this.objIdArr[i].min)
    }
    this.data_min_x = d3.min(min_x_time)
    this.data_max_x = d3.max(max_x_time)
    this.data_min_y = d3.min(min_y_time)
    this.data_max_y = d3.max(max_y_time)

    }
copy_params(items_in_list){
    var d = new Date();
    var localTime = d.getTime()

    var copyStr = "";
    var coreArray = []


    coreArray.push('name_of_plot')
    coreArray.push('master_file')
    coreArray.push('parent_name')
    coreArray.push('parent_uqid')
    coreArray.push('time of fit')
    coreArray.push('Diff_eq')
    coreArray.push('Diff_species')
    coreArray.push('Triplet_eq')
    coreArray.push('Triplet_species')
    coreArray.push('Dimen')
    coreArray.push('xmin')
    coreArray.push('xmax')

    //Old key Array. 
    var oldArray =[]

    for (var i = 0; i < items_in_list.length; i++) {
      var v_ind = items_in_list[i]
      
      if(this.objIdArr[v_ind].toFit == true){

        if(this.objIdArr[v_ind].fitted == true){
          var keyArray  = JSON.parse(JSON.stringify(coreArray))
          for (var j = 0; j < this.order_list.length; j++) {
            var item  = this.order_list[j]
            if(this.objIdArr[v_ind].param[item]['to_show'] == true){
                        if (this.objIdArr[v_ind].param[item]['calc'] == false){
                          keyArray.push(this.objIdArr[v_ind].param[item]['alias'])
                          keyArray.push('stdev('+this.objIdArr[v_ind].param[item]['alias']+')')
                        }else{
                          keyArray.push(this.objIdArr[v_ind].param[item]['alias'])
            
                        }}
          }
        var reprint = false

        if (keyArray.length != oldArray.length){
          reprint = true
        }else{
          for (var k = 0; k < keyArray.length; k++) {
            if (keyArray[k] != oldArray[k]){
              reprint = true;
              break;
            }
          }

        }
        if (reprint == true){
          var headerText = keyArray.join("\t")
          copyStr += headerText + '\n'

        }
        var param = this.objIdArr[v_ind].param
        var rowText = []
        rowText.push(this.objIdArr[v_ind].name)
        rowText.push(this.objIdArr[v_ind].file_name)
        rowText.push(this.objIdArr[v_ind].parent_name)
        rowText.push(this.objIdArr[v_ind].parent_uqid)
        rowText.push(this.objIdArr[v_ind].localTime)
        rowText.push(this.diffModEqSel[this.def_options['Diff_eq']])
        rowText.push(this.def_options['Diff_species'].toString())
        rowText.push(this.tripModEqSel[this.def_options['Triplet_eq']])
        rowText.push(this.def_options['Triplet_species'].toString())
        rowText.push(this.dimenModSel[this.def_options['Dimen']])
        rowText.push(this.objIdArr[v_ind].model_autotime[0].toString())
        var last_elem = this.objIdArr[v_ind].model_autotime.length
        rowText.push(this.objIdArr[v_ind].model_autotime[last_elem-1].toString())
        console.log('rowText',rowText)
        for (var v = 0; v < this.order_list.length; v++) {
          item = this.order_list[v]
          if (param[item]['calc']==false) {
            if (param[item]['to_show']== true) {
              rowText.push(param[item]['value'].toString())
              rowText.push("")}
              //rowText.push(param[item]['stderr'].toString())
          }else{
              if (param[item]['to_show'] == true){
                rowText.push(param[item]['value'].toString()) 
                }
          }
        }
        console.log('copyStr1',rowText)
        copyStr += rowText.join('\t')+'\n'
        console.log('copyStr2',copyStr)
        
        oldArray = JSON.parse(JSON.stringify(keyArray))


        }
      }

    }
    return copyStr
    }


}

class CorrObj{
  constructor(filepath){
    this.parentFn
    this.filepath = filepath
    
    
    this.nameAndExt = this.filepath.split(/[[\\/]/).pop().split(".")
    this.name = this.nameAndExt[0]
    this.ext = this.nameAndExt[this.nameAndExt.length-1]
    this.autoNorm=[]
    this.autotime=[]
    this.model_autoNorm =[]
    this.model_autotime = []
    this.parent_name = 'Not known'
    this.file_name = 'Not known'
    this.datalen= []
    this.objId = this;
    this.param = []
    this.goodFit = true
    this.fitted = false
    this.checked = false
    this.clicked = false
    this.toFit = false
    this.kcount = null
    this.filter = false
    this.series_list_id = null

    this.s2n = null
    this.kcount = null
    this.numberNandB = null
    this.brightnessNandB = null
    this.CV = null
    this.pbc_f0 = null
    this.pbc_tb = null

  }
}



fit_obj = new FittingManager()
plt_obj = new PlotManager()
