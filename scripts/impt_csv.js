//Part of the controller. The classes and methods here are for parsing input files to populate model.



var parse_csv = function(feed,filepath){

	metadata = {}
	lines = feed.split("\n")
	if (lines[0].split(',')[0] == 'version') {
		var version = check_version(lines[0]);
		if (version == false) return false;}
	else{
		console.log('The version number could not be detected.')
		return false;}

	if (version == 2){
		i = 1
		
		line = lines[i].split(",")
		while(line[0].substring(0,4) != "Time"){
			
			metadata[line[0]] = line.slice(1,4)
			
			
			i++;
			line = lines[i].split(",")
			if (i == 99999) return false;
			}
		
		i++;
		line = lines[i].split(",")
		
		if(metadata['numOfCH'] == 1){
			autoNorm = []
			autotime = []
			
			while(line[0].slice(0,3) != "end"){
				autotime.push(parseFloat(line[0]))
				autoNorm.push(parseFloat(line[1]))
				i++
				line = lines[i].split(",")
				}
		}else if(metadata['numOfCH'] == 2){
			autoNorm = [[],[],[],[]]
			autotime = []
			while(line[0].slice(0,3) != "end"){
				autotime.push(parseFloat(line[0]))
				autoNorm[0].push(parseFloat(line[1]))
				autoNorm[1].push(parseFloat(line[2]))
				autoNorm[2].push(parseFloat(line[3]))
				autoNorm[3].push(parseFloat(line[4]))
				i++
				line = lines[i].split(",")
				}
		}
		
		

		console.log('numOfCH',metadata)

		//Populate objects
		if(parseInt(metadata['numOfCH']) == 1){
			corrObj1 = new CorrObj(filepath)
			
			corrObj1.autoNorm = autoNorm
			corrObj1.autotime = autotime
			corrObj1.max = d3.max(autoNorm)
			corrObj1.min = d3.min(autoNorm)
			corrObj1.tmax = d3.max(autotime)
			corrObj1.tmin = d3.min(autotime)

			corrObj1.parent_name = 'no name'
			corrObj1.parent_uqid = '0'
			

			var pc_text = false
			if ('kcount' in metadata){
				line = metadata['kcount']
				corrObj1.kcount = parseFloat(line[0])
			}
			if ('type' in metadata){
				line = metadata['type']
				corrObj1.type = line[0]
			}
			if ('numberNandB' in metadata){
				line = metadata['numberNandB']
				corrObj1.numberNandB = parseFloat(line[0])
			}
			if ('brightnessNandB' in metadata){
				line = metadata['brightnessNandB']
				corrObj1.brightnessNandB = parseFloat(line[0])
			}
			if ('CV' in metadata){
				line = metadata['CV']
				corrObj1.CV = parseFloat(line[0])
			}
			if ('carpet pos' in metadata){
				line = metadata['carpet pos']
				corrObj1.carpet_position = parseFloat(line[0])
			}
			if ('pc' in metadata){
				line = metadata['pc']
				pc_text = line[0]
				
			}
			if ('pbc_f0' in metadata){
				line = metadata['pbc_f0']
				corrObj1.pbc_f0 = parseFloat(line[0])
			}
			if ('pbc_tb' in metadata){
				line = metadata['pbc_tb']
				corrObj1.pbc_tb = parseFloat(line[0])
			}
			if ('parent_name' in metadata){
				line = metadata['parent_name']
				corrObj1.parent_name = line[0]
			}
			if ('parent_uqid' in metadata){
				line = metadata['parent_uqid']
				corrObj1.parent_uqid = line[0]
			}

			corrObj1.siblings = null
			corrObj1.ch_type = metadata['ch_type']

			if (corrObj1.parent_name == 'no name' && corrObj1.type == ' point')
				{corrObj1.parent_name = "point FCS"}
			if (corrObj1.parent_name == 'no name' && corrObj1.type == ' scan')
				{corrObj1.parent_name = "scan FCS"}
			
			if (pc_text != false)
				{corrObj1.name = corrObj1.name +'_pc_m'+pc_text}
			else
				{corrObj1.name = corrObj1.name+"-CH"+corrObj1.ch_type}
			console.log(autoNorm)
			corrObj1.param = JSON.parse(JSON.stringify(fit_obj.def_param))
			fit_obj.objIdArr.push(corrObj1)


		}else if (metadata['numOfCH'] ==2){
			
			corrObj1 = new CorrObj(filepath);
			corrObj2 = new CorrObj(filepath);
			corrObj3 = new CorrObj(filepath);
			
			
			
			corrObj1.autoNorm = autoNorm[0]
			corrObj1.max = d3.max(autoNorm[0])
			corrObj1.min = d3.min(autoNorm[0])
			corrObj2.autoNorm = autoNorm[1]
			corrObj2.max = d3.max(autoNorm[1])
			corrObj2.min = d3.min(autoNorm[1])
			corrObj3.autoNorm = autoNorm[2]
			corrObj3.max = d3.max(autoNorm[2])
			corrObj3.min = d3.min(autoNorm[2])	
			
			corrObj1.autotime = autotime
			corrObj2.autotime = autotime
			corrObj3.autotime = autotime

			corrObj1.tmax = d3.max(autotime)
			corrObj1.tmin = d3.min(autotime)
			corrObj2.tmax = corrObj1.tmax
			corrObj2.tmin = corrObj1.tmin
			corrObj3.tmax = corrObj1.tmax
			corrObj3.tmin = corrObj1.tmin

			var pc_text = false
			if ('kcount' in metadata){
				line = metadata['kcount']
				corrObj1.kcount = parseFloat(line[0])
				corrObj2.kcount = parseFloat(line[1])
			}
			if ('numberNandB' in metadata){
				line = metadata['numberNandB']
				corrObj1.numberNandB = parseFloat(line[0])
				corrObj2.numberNandB = parseFloat(line[1])
			}
			if ('brightnessNandB' in metadata){
				line = metadata['brightnessNandB']
				corrObj1.brightnessNandB = parseFloat(line[0])
				corrObj2.brightnessNandB = parseFloat(line[1])
			}
			if ('CV' in metadata){
				line = metadata['CV']
				corrObj1.CV = parseFloat(line[0])
				corrObj2.CV = parseFloat(line[1])
				corrObj3.CV = parseFloat(line[2])
			}
			if ('carpet pos' in metadata){
				line = metadata['carpet pos']
				corrObj1.carpet_position = parseFloat(line[0])
				corrObj2.carpet_position = parseFloat(line[1])
			}
			if ('pc' in metadata){
				line = metadata['pc']
				pc_text = parseFloat(line[0])
			}
			if ('pbc_f0' in metadata){
				line = metadata['pbc_f0']
				corrObj1.pbc_f0 = parseFloat(line[0])
				corrObj2.pbc_f0 = parseFloat(line[1])
			}
			if ('pbc_tb' in metadata){
				line = metadata['pbc_tb']
				corrObj1.pbc_tb = parseFloat(line[0])
				corrObj2.pbc_tb = parseFloat(line[1])
			}
			if ('parent_name' in metadata){
				line = metadata['parent_name']
				corrObj1.parent_name = line[0]
				corrObj2.parent_name = line[0]
				corrObj3.parent_name = line[0]
			}
			if ('parent_uqid' in metadata){
				line = metadata['parent_uqid']
				corrObj1.parent_uqid = line[0]
				corrObj2.parent_uqid = line[0]
				corrObj3.parent_uqid = line[0]
			}
			if ('ch_type' in metadata){
				line = metadata['ch_type']
				corrObj1.ch_type = parseInt(line[0])
				corrObj2.ch_type = parseInt(line[1])
				corrObj3.ch_type = parseInt(line[2])
			}
			if (pc_text !=false){
				corrObj1.name = corrObj1.name +'_pc_m'+pc_text
				corrObj2.name = corrObj2.name +'_pc_m'+pc_text
				corrObj3.name = corrObj3.name +'_pc_m'+pc_text
			}
			corrObj1.siblings = [corrObj2,corrObj3]
			corrObj2.siblings = [corrObj1,corrObj3]
			corrObj3.siblings = [corrObj1,corrObj2]


			corrObj1.param = JSON.parse(JSON.stringify(fit_obj.def_param))
			corrObj2.param = JSON.parse(JSON.stringify(fit_obj.def_param))
			corrObj3.param = JSON.parse(JSON.stringify(fit_obj.def_param))
			
			fit_obj.objIdArr.push(corrObj1);
			fit_obj.objIdArr.push(corrObj2);
			fit_obj.objIdArr.push(corrObj3);
		}}
	if (version == 3.0){
		i = 1
	
		line = lines[i].split(",")
		while(line[0].substring(0,4) != "Time"){	
			metadata[line[0]] = line.slice(1)
			i++;
			line = lines[i].split(",")
			if (i == 99999) return false;
			}
		
		i++;
		line = lines[i].split(",")
		numOfCH =parseInt(metadata['numOfCH'][0])
		traces = numOfCH*numOfCH;
		
		autoNorm = []
		autotime = []
		c = 0



		while(line[0] != "end"){
			autotime.push(parseFloat(line[0]))
			autoNorm.push(line.slice(1,traces+1))
			i++
			line = lines[i].split(",")
			}

		

		tmax = d3.max(autotime)
		tmin = d3.min(autotime)
		
		for (var k = 0; k < traces; k++) {
			corrObj = new CorrObj(filepath);
			for (var j = 0; j< autoNorm.length; j++) {
				corrObj.autoNorm[j] = parseFloat(autoNorm[j][k]);
				}
			
			corrObj.max = d3.max(corrObj.autoNorm)
			corrObj.min = d3.min(corrObj.autoNorm)
			corrObj.autotime = autotime
			corrObj.tmax = tmax
			corrObj.tmin = tmin
			corrObj.numOfCH = numOfCH
			corrObj.type = metadata['type']				
			corrObj.ch_type = metadata['ch_type'][k]
			

			corrObj.name = corrObj.name+'-CH'+corrObj.ch_type

			if ('kcount' in metadata){
				if( k < numOfCH) corrObj.kcount = parseFloat(metadata['kcount'][k])}
			if ('numberNandB' in metadata)
				{if( k < numOfCH)corrObj.numberNandB = parseFloat(metadata['numberNandB'][k])}
			if ('brightnessNandB' in metadata)
				{if (k < numOfCH)corrObj.brightnessNandB = parseFloat(metadata['brightnessNandB'][k])}
			if ('CV' in metadata)
				{if( k >= numOfCH)corrObj.CV = parseFloat(metadata['CV'][k])}
			if ('carpet pos' in metadata)
				{corrObj.carpet_position = parseInt(metadata['carpet pos'][0])}
			if ('pc' in metadata)
				{pc_text = parseFloat(metadata['pc'][0])}
			if ('pbc_f0' in metadata)
				{corrObj.pbc_f0 = parseFloat(metadata['pbc_f0'][k])}
			if ('pbc_tb' in metadata)
				{corrObj.pbc_tb = parseFloat(metadata['pbc_tb'][k])}
			if ('parent_name' in metadata)
				{corrObj.parent_name = metadata['parent_name'][0]}
			if ('parent_uqid' in metadata)
				{corrObj.parent_uqid = metadata['parent_uqid'][0]}
			if (pc_text !=false){
				corrObj.name = corrObj.name +'_pc_m'+pc_text
				
			}
			


			corrObj.param = JSON.parse(JSON.stringify(fit_obj.def_param))
			
			fit_obj.objIdArr.push(corrObj);
			


		}
}}


var check_version = function(line){
	    ver = lines[0].split(",")[1]
		if (ver == 2){
			console.log('version 2.0')
			 return ver}
		else if (ver == 3){
			console.log('version 3.0')
			 return ver

		}

		else{console.log('unsupported file version',lines[0].split[1]);
				return false;
		}
}