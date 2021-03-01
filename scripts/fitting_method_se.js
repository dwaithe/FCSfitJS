//default options for the fitting.
se_initialise_fcs = function(int_obj){
	int_obj.def_options ={}
	
	int_obj.def_options['Diff_eq'] = 1
	int_obj.def_options['Diff_species'] = 1
	int_obj.def_options['Triplet_eq'] = 1
	int_obj.def_options['Triplet_species'] = 1

	int_obj.def_options['Dimen'] = 1
	

	
	A1 = {'alias':'A1','value':1.0,'minv':0.0,'maxv':1.0,'vary':false,'to_show':true,'calc':false}
	A2 = {'alias':'A2','value':1.0,'minv':0.0,'maxv':1.0,'vary':false,'to_show':true,'calc':false}
	A3 = {'alias':'A3','value':1.0,'minv':0.0,'maxv':1.0,'vary':false,'to_show':true,'calc':false}		
	//The offset
	offset = { 'alias':'offset','value':0.01,'minv':-0.5,'maxv':1.5,'vary':true,'to_show':true,'calc':false}
	
	//amplitude
	GN0 = {'alias':'GN0','minv':0.001,'value':1,'maxv':1.0,'vary':true,'to_show':true,'calc':false}
	
	txy1 = {'alias':'txy1','value':0.01,'minv':0.001,'maxv':2000.0,'vary':true,'to_show':true,'calc':false}
	txy2 = {'alias':'txy2','value':0.01,'minv':0.001,'maxv':2000.0,'vary':true,'to_show':true,'calc':false}
	txy3 = {'alias':'txy3','value':0.01,'minv':0.001,'maxv':2000.0,'vary':true,'to_show':true,'calc':false}

	

	alpha1 = {'alias':'alpha1','value':1.0,'minv':0.5,'maxv':2.0,'vary':true,'to_show':true,'calc':false}
	alpha2 = {'alias':'alpha2','value':1.0,'minv':0.5,'maxv':2.0,'vary':true,'to_show':true,'calc':false}
	alpha3 = {'alias':'alpha3','value':1.0,'minv':0.5,'maxv':2.0,'vary':true,'to_show':true,'calc':false}
	
	tz1 = {'alias':'tz1','value':1.0,'minv':0.0,'maxv':1000.0,'vary':true,'to_show':true,'calc':false}
	tz2 = {'alias':'tz2','value':1.0,'minv':0.0,'maxv':1000.0,'vary':true,'to_show':true,'calc':false}
	tz3 = {'alias':'tz3','value':1.0,'minv':0.0,'maxv':1000.0,'vary':true,'to_show':true,'calc':false}

	//Axial ratio coefficient
	
	AR1 = {'alias':'AR1','value':1.0,'minv':0.001,'maxv':1000.0,'vary':true,'to_show':true,'calc':false}
	AR2 = {'alias':'AR2','value':1.0,'minv':0.001,'maxv':1000.0,'vary':true,'to_show':true,'calc':false}
	AR3 = {'alias':'AR3','value':1.0,'minv':0.001,'maxv':1000.0,'vary':true,'to_show':true,'calc':false}

	B1 = {'alias':'B1','value':1.0,'minv':0.001,'maxv':1000.0,'vary':true,'to_show':true,'calc':false}
	B2 = {'alias':'B2','value':1.0,'minv':0.001,'maxv':1000.0,'vary':true,'to_show':true,'calc':false}
	B3 = {'alias':'B3','value':1.0,'minv':0.001,'maxv':1000.0,'vary':true,'to_show':true,'calc':false}

	T1 = {'alias':'T1','value':1.0,'minv':0.0,'maxv':1000.0,'vary':true,'to_show':true,'calc':false}
	T2 = {'alias':'T2','value':1.0,'minv':0.0,'maxv':1000.0,'vary':true,'to_show':true,'calc':false}
	T3 = {'alias':'T3','value':1.0,'minv':0.0,'maxv':1000.0,'vary':true,'to_show':true,'calc':false}

	tauT1 = {'alias':'tauT1','value':0.055,'minv':0.001,'maxv':1000.0,'vary':true,'to_show':true,'calc':false}
	tauT2 = {'alias':'tauT2','value':0.055,'minv':0.001,'maxv':1000.0,'vary':true,'to_show':true,'calc':false}
	tauT3 = {'alias':'tauT3','value':0.005,'minv':0.001,'maxv':1000.0,'vary':true,'to_show':true,'calc':false}

	N_FCS = {'alias':'N (FCS)','value':0.0,'minv':0.001,'maxv':1000.0,'vary':true,'to_show':true,'calc':true}
	cpm = {'alias':'cpm (kHz)','value':0.0,'minv':0.001,'maxv':1000.0,'vary':true,'to_show':true,'calc':true}
	N_mom = {'alias':'N (mom)','value':0.0,'minv':0.001,'maxv':1000.0,'vary':true,'to_show':true,'calc':true}
	bri = {'alias':'bri (kHz)','value':0.0,'minv':0.001,'maxv':1000.0,'vary':true,'to_show':true,'calc':true}
	CV = {'alias':'CV','value':0.0,'minv':0.001,'maxv':1000.0,'vary':true,'to_show':true,'calc':true}
	f0 = {'alias':'PBC f0','value':0.0,'minv':0.001,'maxv':1000.0,'vary':true,'to_show':true,'calc':true}
	overtb = {'alias':'PBC tb','value':0.0,'minv':0.001,'maxv':1000.0,'vary':true,'to_show':true,'calc':true}
	s2n = {'alias':'s2n','value':0.0,'minv':0.001,'maxv':1000.0,'vary':true,'to_show':true,'calc':true}

	
	ACAC = {'alias':'ACAC','value':0.0,'minv':0.001,'maxv':1000.0,'vary':true,'to_show':true,'calc':true}
	ACCC = {'alias':'ACCC','value':0.0,'minv':0.001,'maxv':1000.0,'vary':true,'to_show':true,'calc':true}

	above_zero = {'alias':'above zero','value':0.0,'minv':0.001,'maxv':1000.0,'vary':true,'to_show':true,'calc':true}


	int_obj.def_param ={'A1':A1,'A2':A2,'A3':A3,'txy1':txy1,'txy2':txy2,'txy3':txy3,'offset':offset,'GN0':GN0,'alpha1':alpha1,'alpha2':alpha2,'alpha3':alpha3,'tz1':tz1,'tz2':tz2,'tz3':tz3,'AR1':AR1,'AR2':AR2,'AR3':AR3,'B1':B1,'B2':B2,'B3':B3,'T1':T1,'T2':T2,'T3':T3,'tauT1':tauT1,'tauT2':tauT2,'tauT3':tauT3}
	int_obj.def_param['N_FCS'] = N_FCS
	int_obj.def_param['cpm'] = cpm
	int_obj.def_param['N_mom'] = N_mom
	int_obj.def_param['bri'] = bri
	int_obj.def_param['CV'] = CV
	int_obj.def_param['f0'] = f0
	int_obj.def_param['s2n'] = s2n
	int_obj.def_param['overtb'] = overtb
	int_obj.def_param['above_zero'] = above_zero

	int_obj.def_param['ACAC'] = ACAC
	int_obj.def_param['ACCC'] = ACCC

	}
se_decide_which_to_show = function(int_obj){
	
		for (art in int_obj.objId_sel.param){
			//console.log('tragic',art,int_obj.objId_sel.param[art],int_obj.objId_sel)
			if (int_obj.objId_sel.param[art]['to_show'] == true){
				int_obj.objId_sel.param[art]['to_show'] = false
				}
			}

		int_obj.objId_sel.param['offset']['to_show'] = true
		int_obj.objId_sel.param['GN0']['to_show'] = true

		int_obj.def_options['Diff_species'] = int_obj.diffNum
		int_obj.def_options['Triplet_species'] =int_obj.tripNum
		//Optional parameters
		diffNum = int_obj.def_options['Diff_species']
		
		for (var i = 1; i < diffNum+1; i++) {
			
			int_obj.objId_sel.param['A'+i]['to_show'] = true
			int_obj.objId_sel.param['txy'+i]['to_show'] = true
			int_obj.objId_sel.param['alpha'+i]['to_show'] = true
			//2 in this case corresponds to 3D:

			if (int_obj.def_options['Dimen'] == 2){
				if (int_obj.def_options['Diff_eq'] == 1){
					int_obj.objId_sel.param['tz'+i]['to_show'] = true
				}
					
				if (int_obj.def_options['Diff_eq'] == 2){
					int_obj.objId_sel.param[ 'AR'+i]['to_show'] = true
				}
			}
		}
		
						
		if (int_obj.def_options['Triplet_eq'] == 2){
			//Triplet State equation1
			for (var i = 1; i < int_obj.tripNum+1; i++) {			 
				int_obj.objId_sel.param['B'+i]['to_show'] = true
				int_obj.objId_sel.param['tauT'+i]['to_show'] = true
				}
			}
		if (int_obj.def_options['Triplet_eq'] == 3){
			//Triplet State equation2
			for (var i = 1; i < int_obj.tripNum+1; i++) {	
				int_obj.objId_sel.param['T'+i]['to_show'] = true
				int_obj.objId_sel.param['tauT'+i]['to_show'] = true
				}
			}
		//calc_param_fcs(int_obj,objId=int_obj.objId_sel)}
}
function se_calc_param_fcs(objId){

if (objId.s2n != null){
  objId.param['s2n']['value'] = objId.s2n
  objId.param['s2n']['to_show'] = true
}else{
  objId.param['s2n']['value'] = 1
  objId.param['s2n']['to_show'] = false
}


if (objId.param['GN0']['value'] > 0){
  objId.param['N_FCS']['value'] = 1/objId.param['GN0']['value']
  objId.param['N_FCS']['to_show'] = true
}else{
  objId.param['N_FCS']['value'] = 1
  objId.param['N_FCS']['to_show'] = false
}

if (objId.kcount != null && objId.param['GN0']['value'] > 0){
  objId.param['cpm']['value'] = objId.kcount/(1/objId.param['GN0']['value'])
  objId.param['cpm']['to_show'] = true
}else{
  objId.param['cpm']['value'] = 1
  objId.param['cpm']['to_show'] = false
}

if (objId.numberNandB != null){
  objId.param['N_mom']['value'] = objId.numberNandB
  objId.param['N_mom']['to_show'] = true
}else{
  objId.param['N_mom']['value'] = 1
  objId.param['N_mom']['to_show'] = false
}

if (objId.brightnessNandB != null){
  objId.param['bri']['value'] = objId.brightnessNandB
  objId.param['bri']['to_show'] = true
}else{
  objId.param['bri']['value'] = 1
  objId.param['bri']['to_show'] = false
}

if (objId.CV != null){
  objId.param['CV']['value'] = objId.CV
  objId.param['CV']['to_show'] = true
}

if (objId.pbc_f0 != null){
  objId.param['f0']['value'] = objId.pbc_f0
  objId.param['f0']['to_show'] = true
}

if (objId.pbc_tb != null){
  objId.param['overtb']['value'] = objId.pbc_tb
  objId.param['overtb']['to_show'] = true
}
}



function se_fit_diff_eq_1A_B(param) {
		var dimen = fit_obj.def_options['Dimen']
      var diff_eq = fit_obj.def_options['Diff_eq']
      var trip_eq = fit_obj.def_options['Triplet_eq']
      var diffNum = fit_obj.diffNum
      var tripNum = fit_obj.tripNum

        return function(tc){
        //['offset','GN0','A1','A2','A3','txy1','txy2','txy3','tz1','tz2','tz3','alpha1','alpha2','alpha3','AR1','AR2','AR3','B1','B2','B3','T1','T2','T3','tauT1','tauT2','tauT3','N_mom','bri','CV','f0','overtb','ACAC','ACCC','above_zero','s2n']
        let offset = param[0]
        let GN0 = param[1]
        
          //For no triplets.
        
        if (dimen == 2){
            if (diff_eq == 1){
               //Equation 1A with 3D term.
                if(diffNum ==1){
                  //for one diffusing species

                  let A1 = param[2];
                  let txy1 = param[3];
                  let tz1 = param[4];
                  let alpha1 = param[5];
                  var c = 6;
                  var dif = (A1*((Math.pow(1.+Math.pow((tc/txy1),alpha1),-1))))*((1+Math.pow((tc/tz1),-0.5)));
                    
                }else if (diffNum == 2){
                  //for two diffusing species
                  let A1 = param[2];let A2 = param[3];
                  let txy1 = param[4];let txy2 = param[5];
                  let tz1 = param[6];let tz2 = param[7];
                  let alpha1 = param[8];let alpha2 = param[9];
                  var c = 10;

                  A1 = A1 / (A1 + A2);
                  A2 = A2 / (A1 + A2);
                    
                  var dif = (A1*((Math.pow(1.+Math.pow((tc/txy1),alpha1),-1))))*((1+Math.pow((tc/tz1),-0.5)))
                  dif += (A2*((Math.pow(1.+Math.pow((tc/txy2),alpha2),-1))))*((1+Math.pow((tc/tz2),-0.5)))
                    
                }else if (diffNum==3){
                  //for three diffusing species
                  
                    let A1 = param[2];let A2 = param[3];let A3 = param[4];
                    let txy1 = param[5];let txy2 = param[6];let txy3 = param[7];
                    let tz1 = param[8];let tz2 = param[9];let tz3 = param[10];
                    let alpha1 = param[11];let alpha2 = param[12];let alpha3 = param[13];
                    var c = 14;

                    A1 = A1 / (A1 + A2 + A3);
                    A2 = A2 / (A1 + A2 + A3);
                    A3 = A3 / (A1 + A2 + A3);
                
                    var dif = (A1*((Math.pow(1.+Math.pow((tc/txy1),alpha1),-1))))*((1+Math.pow((tc/tz1),-0.5)))
                    dif += (A2*((Math.pow(1.+Math.pow((tc/txy2),alpha2),-1))))*((1+Math.pow((tc/tz2),-0.5)))
                    dif += (A3*((Math.pow(1.+Math.pow((tc/txy3),alpha3),-1))))*((1+Math.pow((tc/tz3),-0.5)))
                    }
            }else if (diff_eq == 2){
              //['offset','GN0','A1','A2','A3','txy1','txy2','txy3','tz1','tz2','tz3','alpha1','alpha2','alpha3','AR1','AR2','AR3','B1','B2','B3','T1','T2','T3','tauT1','tauT2','tauT3','N_mom','bri','CV','f0','overtb','ACAC','ACCC','above_zero','s2n']
              if (diffNum == 1){
                  let A1 = param[2];
                  let txy1 = param[3];
                  let alpha1 = param[4];
                  let AR1 = param[5];
                  var c = 6;
                 
                  var dif = (A1*((Math.pow(1.+Math.pow((tc/txy1),alpha1),-1))))*(Math.pow((1+(tc/(AR1*AR1*txy1))),-0.5));


            }else if (diffNum == 2){

                  //for two diffusing species
                  let A1 = param[2]; let A2 = param[3];
                  let txy1 = param[4]; let txy2 = param[5];
                  let alpha1 = param[6];let alpha2 = param[7];
                  let AR1 = param[8];let AR2 = param[9];
                  var c = 10;
                  

                  A1 = A1 / (A1 + A2);
                  A2 = A2 / (A1 + A2);


                  var dif = (A1*((Math.pow(1.+Math.pow((tc/txy1),alpha1),-1))))*(Math.pow((1+(tc/(AR1*AR1*txy1))),-0.5));
                  dif += (A1*((Math.pow(1.+Math.pow((tc/txy1),alpha1),-1))))*(Math.pow((1+(tc/(AR2*AR2*txy1))),-0.5));
             }else if (diffNum==3){
                  //for three diffusing species
                  
                  let A1 = param[2];let A2 = param[3];let A3 = param[4];
                  let txy1 = param[5];let txy2 = param[6];let txy3 = param[7];
                  let alpha1 = param[8];let alpha2 = param[9];let alpha3 = param[10];
                  let AR1 = param[11];let AR2 = param[12];let AR3 = param[13];
                  var c = 14;
                 

                  A1 = A1 / (A1 + A2 + A3);
                  A2 = A2 / (A1 + A2 + A3);
                  A3 = A3 / (A1 + A2 + A3);
              
                  var dif = (A1*((Math.pow(1.+Math.pow((tc/txy1),alpha1),-1))))*(Math.pow((1+(tc/(AR1*AR1*txy1))),-0.5));
                  dif += (A2*((Math.pow(1.+Math.pow((tc/txy2),alpha2),-1))))*(Math.pow((1+(tc/(AR2*AR2*txy2))),-0.5));
                  dif += (A3*((Math.pow(1.+Math.pow((tc/txy3),alpha3),-1))))*(Math.pow((1+(tc/(AR3*AR3*txy3))),-0.5));
            }
          }}

          if (dimen == 1){
              if (diffNum == 1){
                  let A1 = param[2];
                  let txy1 = param[3];
                  let alpha1 = param[4];
                  var c = 5;

            
                  var dif = (A1*((Math.pow(1.+Math.pow((tc/txy1),alpha1),-1))))
                   //console.log('A1',A1,'txy1',txy1,'alpha1',alpha1,'tc',tc,'dif',dif)
                  }
                else if (diffNum == 2){
                  let A1 = param[2];
                  let A2 = param[3];
                  let txy1 = param[4];
                  let txy2 = param[5];
                  let alpha1 = param[6];
                  let alpha2 = param[7];
                  var c = 8;

                  A1 = A1 / (A1 + A2);
                  A2 = A2 / (A1 + A2);
            
                  var dif = (A1*((Math.pow(1.+Math.pow((tc/txy1),alpha1),-1))))
                  dif += (A2*((Math.pow(1.+Math.pow((tc/txy2),alpha2),-1))))



                }else if (diffNum == 3){
                  let A1 = param[2];let A2 = param[3];let A3 = param[4];
                  let txy1 = param[5];let txy2 = param[6];let txy3 = param[7];
                  let alpha1 = param[8];let alpha2 = param[9];let alpha3 = param[10];
                  var c = 11;

                  A1 = A1 / (A1 + A2 + A3);
                  A2 = A2 / (A1 + A2 + A3);
                  A3 = A3 / (A1 + A2 + A3);
            
                  var dif = (A1*((Math.pow(1.+Math.pow((tc/txy1),alpha1),-1))))
                  dif += (A2*((Math.pow(1.+Math.pow((tc/txy2),alpha2),-1))))
                  dif += (A3*((Math.pow(1.+Math.pow((tc/txy3),alpha3),-1))))
                }
            }


            
            if (trip_eq == 1){
              //['offset','GN0','A1','A2','A3','txy1','txy2','txy3','tz1','tz2','tz3','alpha1','alpha2','alpha3','AR1','AR2','AR3','B1','B2','B3','T1','T2','T3','tauT1','tauT2','tauT3']
        
              var GT =1
            }else if(trip_eq == 2){
              if(tripNum == 1 ){
                let B1 = param[c];
                let tauT1 = param[c+1];

                var GT = 1 + (B1*Math.exp(-tc/tauT1))
              }else if(tripNum == 2){
                let B1 = param[c];
                let B2 = param[c+1];
                let tauT1 = param[c+2];
                let tauT2 = param[c+3];

                var GT = 1 + (B1*Math.exp(-tc/tauT1))+(B2*Math.exp(-tc/tauT2))

              }else if(tripNum ==3 ){
                let B1 = param[c];
                let B2 = param[c+1];
                let B3 = param[c+2];
                let tauT1 = param[c+3];
                let tauT2 = param[c+4];
                let tauT3 = param[c+5];

                var GT = 1 + (B1*Math.exp(-tc/tauT1))+(B2*Math.exp(-tc/tauT2))+(B3*Math.exp(-tc/tauT3))
              }

            }else if(trip_eq ==3){
              if(tripNum == 1 ){
                let T1  = param[c];
                let tauT1 = param[c+1];
                
                var GT = 1- T1 + (T1*Math.exp(-tc/tauT1));
              }else if(tripNum == 2){
                let T1 = param[c];
                let T2 = param[c+1];
                let tauT1 = param[c+2];
                let tauT2 = param[c+3];

                var  GT = 1- (T1+T2)+ ((T1*Math.exp(-tc/tauT1))+(T2*Math.exp(-tc/tauT2)));

               }else if(tripNum ==3 ){
                let T1 = param[c];
                let T2 = param[c+1];
                let T3 = param[c+2];
                let tauT1 = param[c+3];
                let tauT2 = param[c+4];
                let tauT3 = param[c+5];

                var GT = 1- (T1+T2+T3)+ ((T1*Math.exp(-tc/tauT1))+(T2*Math.exp(-tc/tauT2))+(T3*Math.exp(-tc/tauT3)));

               }

            }
          //console.log('wowzers',offset,GN0, dif,GT)

          return offset+(GN0*dif*GT)
          }
          
        }
