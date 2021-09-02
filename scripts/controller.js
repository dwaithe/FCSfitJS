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
      
      
      
      
      this.diffModEqSel = ['Equation 1A', 'Equation 1B']
      this.tripModEqSel = ['no triplet', 'Triplet Eq 2A', 'Triplet Eq 2B']
      this.dimenModSel  = ['2D', '3D']
      this.def_options = {}

      this.eqn_selected = 0;

      this.initialModel()
      //gs_initialise_fcs(self)
      //vd_initialise_fcs(self)
      //pb_initialise_fcs(self)



  }
  initialModel(){

    

    if (this.eqn_selected == 0 || this.eqn_selected ==1){
    this.def_options['Diff_eq'] = this.eqn_selected
    console.log('defoptions',this.def_options['Diff_eq'] )
    se_initialise_fcs(this)
    
   }else{
    custom_model_init(this)


   }
   //redefines parameters for each dataset.
   for (var i = 0; i < this.objIdArr.length; i++) {
        this.objIdArr[i].param = JSON.parse(JSON.stringify(this.def_param))}

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

              if (this.eqn_selected>1){
                //custom equation
              
                


              }else{
                
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

      if (this.eqn_selected ==0 || this.eqn_selected ==1)
        var equation = se_fit_diff_eq_1A_B
      else{
        var equation = custom_model_equation
      }

        

      const data = {x:objId.autotime.slice(indx_L,indx_R+1),y:objId.autoNorm.slice(indx_L,indx_R+1)}



      var start = Date.now()
      var fittedParams = window.fit_equation(data,equation,options)
      var params = fittedParams[0]['parameterValues']
      var error = fittedParams[0]['parameterError']


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
      if (this.eqn_selected ==0 || this.eqn_selected ==1)
        {se_calc_param_fcs(objId)}
      else{
        //custom models don't yet support custom paramaeter calculation.
      }



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
copy_plot_data(items_in_list){

  var copyStr = "";
  var xpos1 = plt_obj.glb_sel_x0
  var xpos2 = plt_obj.glb_sel_x1

  var minarrL = this.objIdArr[items_in_list[0]].autotime.map(function(v){return Math.abs(v-xpos1)})
  var minarrR = this.objIdArr[items_in_list[0]].autotime.map(function(v){return Math.abs(v-xpos2)})
  
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
  copyStr += 'Time (ms)'+'\t'

  for (var i = 0; i < items_in_list.length; i++) {
      var v_ind = items_in_list[i]
      if (this.objIdArr[v_ind].model_autoNorm !=[]){
                copyStr += this.objIdArr[v_ind].name+'\t'+this.objIdArr[v_ind].name+' fitted model: '+'\t'}

    }
    copyStr +='\n'


  for (var x = 0; x < this.objIdArr[items_in_list[0]].autotime.length; x++) {
    copyStr += this.objIdArr[0].autotime[x]+'\t'
    for (var i = 0; i < items_in_list.length; i++) {
      var v_ind = items_in_list[i]
      
      if (this.objIdArr[v_ind].model_autoNorm !=[]){
        copyStr += this.objIdArr[v_ind].autoNorm[x]+'\t'
        if (x >=indx_L && x<indx_R)
              {
                
                copyStr += this.objIdArr[v_ind].model_autoNorm[x-indx_L]+'\t'}
            else
              {copyStr +=' '+'\t'}

      
      }
    }
    copyStr +='\n'
  }
 

return copyStr
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
        rowText.push(this.diffModEqSel[this.eqn_selected])
        rowText.push(this.def_options['Diff_species'].toString())
        rowText.push(this.tripModEqSel[this.def_options['Triplet_eq']])
        rowText.push(this.def_options['Triplet_species'].toString())
        rowText.push(this.dimenModSel[this.def_options['Dimen']])
        rowText.push(this.objIdArr[v_ind].model_autotime[0].toString())
        var last_elem = this.objIdArr[v_ind].model_autotime.length
        rowText.push(this.objIdArr[v_ind].model_autotime[last_elem-1].toString())
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
