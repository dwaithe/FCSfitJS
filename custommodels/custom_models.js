

fit_obj.diffModEqSel.push('PB Correction') //Name of custom model 0
//fit_boj.fit_obj.diffModEqSel.push('Name of your model 1') // possible addtional models.
//etc etc//


custom_model_init = function(int_obj){
	
	var model_number = fit_obj.eqn_selected-2;
	
	if(model_number == 0){
		console.log('workd')
		//Model parameters
		//'alias': specifies the name of the parameter within the interface. Can be used to describe also.
		//'value': This is the value to initailise the fit with, this is the default value in the inteface. It can be changed later as well
		//'minv': This the minimum value constraint for the parameter used during the fitting.
		//'maxv': This the maximum value constraint for the parameter used during the fitting.
		//'to_show': This is an advanced parameter, set to true to show parameter in the interface.
		//'calc': This is an advanced parameter, set to false. can be used to calculate additional coefficients.

		offset = { 'alias':'offset','value':0.01,'minv':-0.5,'maxv':1.5,'vary':true,'to_show':true,'calc':false};
		GN0 = {'alias':'GN0','minv':0.001,'value':1,'maxv':1.0,'vary':true,'to_show':true,'calc':false};
		txy1 = {'alias':'txy1','value':0.01,'minv':0.001,'maxv':2000.0,'vary':true,'to_show':true,'calc':false};
		bA = {'alias':'bleachA','value':0.01,'minv':0.001,'maxv':2000.0,'vary':true,'to_show':true,'calc':false};
		Kz = {'alias':'Kz','value':0.01,'minv':0.001,'maxv':2000.0,'vary':true,'to_show':true,'calc':false};


		//Here you must add each parameter to the data object.
		int_obj.def_param['offset'] = offset
		int_obj.def_param['GN0'] = GN0
		int_obj.def_param['txy1'] = txy1
		int_obj.def_param['bA'] = bA
		int_obj.def_param['Kz'] = Kz


		int_obj.order_list = ['offset','GN0','txy1','bA','Kz'] //Order the parameters appear in the interface.
   
	}
	
	//if(model_number == 1){
	//Insert you model parameters here.
	//}
	//etc etc.


}

custom_model_equation = function(param) {
	//This is equation for fitting
	var model_number = fit_obj.eqn_selected-2;
		if(model_number == 0){
			//A1 is relative component of fluorescent species
			//tc is tau.
			//txy1 is xy difusion   for fluorescent species one.
			//alpha1 is
			//tz1 is z diffusion for fluorescent species one.
		return function(tc){
			offset =param[0]; 
			GN0 =param[1]; 
			txy1 = param[2];
			bA = param[3];
			Kz = param[4];
			//For one diffusing species
			GDiff = ((1+((tc/txy1)))**-1)
			//Bleaching
			GBlea = (1-bA) + bA*Math.exp(-Kz*tc)
			return offset + (GN0*GDiff*GBlea)
		}
		}
		//if(model_number == 1){
		//Insert you model here.
		//}
		//etc etc.
}