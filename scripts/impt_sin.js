var parse_sin = function(feed,filepath){
	lines = feed.split("\n")
	
	tscale = [];
	tdata = [];
	tdata2 = [];
	tdata3 = [];
	tdata4 = [];
	int_tscale =[];
	int_tdata = [];
	int_tdata2 = [];
	
	proceed = false

	for (i=0;i<lines.length;i++){
		line = lines[i].split("\t");
		if (proceed == 'correlated'){
			//.log('corr')
			if (line.length <2){
				proceed = false
			}else{
				
				tscale.push(parseFloat(line[0])*1000.)
				tdata.push(parseFloat(line[1]))
				if (line.length > 2) tdata2.push(parseFloat(line[2]))
				if (line.length > 3) tdata3.push(parseFloat(line[3]))
				if (line.length > 4) tdata4.push(parseFloat(line[4]))
			}
			}
		if (proceed == 'intensity'){
			if (line.length <2 && line[0].substring(0,11) != 'TraceNumber'){
				proceed = false
			}else if(line.length >1){
				
				int_tscale.push(parseFloat(line[0]))
				int_tdata.push(parseFloat(line[1]))
				if (line.length > 2) int_tdata2.push(parseFloat(line[2]))
			}
		}
		if (line[0].substring(1,12) == "Correlation") proceed = 'correlated'
		else if (line[0].substring(1,11) ==  "IntensityH") proceed = 'intensity'
	}

			corrObj1 = new CorrObj(filepath)
			corrObj1.siblings = null

			corrObj1.autoNorm = tdata
			corrObj1.autotime = tscale

			corrObj1.name = corrObj1.name+'-CH1'
			corrObj1.parent_name = '.SIN files'
			corrObj1.parent_uqid = '0'
			corrObj1.ch_type = 0;

			//unit = int_tscale[int_tscale.length-1]/(int_tscale.length-1)
			//The counts during the interval are already normalised to 1s (even though interval is <1s).
			corrObj1.kcount = d3.mean(int_tdata)/1000	//Converts to khz
			corrObj1.param = JSON.parse(JSON.stringify(fit_obj.def_param))
			
			corrObj1.max = d3.max(corrObj1.autoNorm)
			corrObj1.min = d3.min(corrObj1.autoNorm)
			corrObj1.tmax = d3.max(corrObj1.autotime)
			corrObj1.tmin = d3.min(corrObj1.autotime)
			
			fit_obj.objIdArr.push(corrObj1)
		if (tdata2.length != 0){
			corrObj2 = new CorrObj(filepath)

			corrObj2.autoNorm = tdata
			corrObj2.autotime = tscale

			corrObj2.name = corrObj2.name+'-CH2'
			corrObj2.parent_name = '.SIN files'
			corrObj2.parent_uqid = '0'
			corrObj2.ch_type = 1;

			corrObj1.siblings = [corrObj2]
			corrObj2.siblings = [corrObj1]

			corrObj2.kcount = d3.mean(int_tdata2)/1000	
			corrObj2.param = JSON.parse(JSON.stringify(fit_obj.def_param))
			
			corrObj2.max = d3.max(corrObj2.autoNorm)
			corrObj2.min = d3.min(corrObj2.autoNorm)
			corrObj2.tmax = d3.max(corrObj2.autotime)
			corrObj2.tmin = d3.min(corrObj2.autotime)
			
			fit_obj.objIdArr.push(corrObj2)

		}
		if (tdata3.length != 0){
			corrObj3 = new CorrObj(filepath)

			corrObj3.autoNorm = tdata
			corrObj3.autotime = tscale
			
			corrObj3.ch_type = 2;
			corrObj3.name = corrObj3.name+'-CH12'
			corrObj3.parent_name = '.SIN files'
			corrObj3.parent_uqid = '0'
			
			corrObj3.param = JSON.parse(JSON.stringify(fit_obj.def_param))

			corrObj1.siblings = [corrObj2,corrObj3]
			corrObj2.siblings = [corrObj1,corrObj3]
			corrObj3.siblings = [corrObj1,corrObj2]
			
			corrObj3.max = d3.max(corrObj3.autoNorm)
			corrObj3.min = d3.min(corrObj3.autoNorm)
			corrObj3.tmax = d3.max(corrObj3.autotime)
			corrObj3.tmin = d3.min(corrObj3.autotime)
			
			fit_obj.objIdArr.push(corrObj3)

		}
		if (tdata4.length != 0){
			corrObj4 = new CorrObj(filepath)
			
			corrObj4.autoNorm = tdata
			corrObj4.autotime = tscale
			
			corrObj4.ch_type = 3;
			corrObj4.name = corrObj4.name+'-CH21'
			corrObj4.parent_name = '.SIN files'
			corrObj4.parent_uqid = '0'

			corrObj4.param = JSON.parse(JSON.stringify(fit_obj.def_param))

			corrObj1.siblings = [corrObj2,corrObj3,corrObj4]
			corrObj2.siblings = [corrObj1,corrObj3,corrObj4]
			corrObj3.siblings = [corrObj1,corrObj2,corrObj4]
			corrObj4.siblings = [corrObj1,corrObj2,corrObj3]
			
			corrObj4.max = d3.max(corrObj4.autoNorm)
			corrObj4.min = d3.min(corrObj4.autoNorm)
			corrObj4.tmax = d3.max(corrObj4.autotime)
			corrObj4.tmin = d3.min(corrObj4.autotime)
			
			fit_obj.objIdArr.push(corrObj4)

		}
		
		
		



}