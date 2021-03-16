var parse_fcs = function(feed,filepath){


	lines = feed.replace(/\t/g,"").split("\n")

	line = lines[0].split("-")
	name = line[0]
	version = line[2]
	console.log('name',name)
	console.log('version',version)
	version_num = parseFloat(version.split("version ")[1].split("ANSI")[0]);
	console.log(version_num)
	if (version_num != 3){
		console.log("Version of .fcs file:",version_num," must be 3.0 to continue. Please raise an issue on Github and include your file.")
		return false
		}

	read = true
	ind = 0
	channelnum = 0
	tdata_arr = []
	tscale_arr = []
	cdata_arr = []
	cscale_arr = []
	var i = 0;

	while (read == true){
		i += 1
		if (i > lines.length-1) break
		text = lines[i]
		while(true){
			if (text.split(" = ")[0] == 'Name') name2 = text.split(' = ')[1]
			if (text.split(" = ")[0] == 'Channel') channel_str = text.split(' = ')[1]
			
			if (text.split(' = ')[0] == 'CountRateArray') break
			i += 1
			if (i > lines.length-1){read = false; break}
			text = lines[i]


		}
		if (read == false) break
		
		dimension = text.split(" = ")[1]
		len_of_seq = parseInt(dimension.split(" ")[0])
		if (len_of_seq >0){
			cdata = []
			cscale = []
			i += 1
			text = lines[i].split(" ")
			for (v=0;v<len_of_seq;v++){
				
				if (text.length >1){
					cscale.push(parseFloat(text[0]))
					cdata.push(parseFloat(text[1]))
				}
				i += 1
				text = lines[i].split(" ")
			}
			cdata_arr.push(cdata)
			cscale_arr.push(cscale)
		}
		while (text[0].split(" = ") != 'CorrelationArray') {
			i += 1
			text = lines[i].split(" ")
			
		}

		dimension = text[2]
		len_of_seq = parseInt(dimension.split(" ")[0])
		if (len_of_seq >0){
			tdata = []
			tscale = []
			i += 1
			text = lines[i].split(" ")
			for (v=0;v<len_of_seq;v++){
				
				if (text.length >1){
					//console.log('txt',text)
					tscale.push(parseFloat(text[0])*1000.)
					tdata.push(parseFloat(text[1]))
				}
				i += 1
				text = lines[i].split(" ")
			}
			tdata_arr.push(tdata)
			tscale_arr.push(tscale)
		}

		while (text[0].split(" = ") != 'Channels') {
			i += 1
			text = lines[i].split(" ")
		}

		num_of_channels = parseInt(text[2])

		for(c=0;c<num_of_channels;c++){
			if( text == channel_str) this_is_ch = c
		}
	if (len_of_seq > 0){
		//If a four channel file we want to skip until we have collected all channels.
		if( num_of_channels == 4 && tdata_arr.length != 4) continue
		corrObj1 = new CorrObj(filepath)
		corrObj1.siblings = null


		corrObj1.autoNorm = tdata_arr[0]
		corrObj1.autotime = tscale_arr[0]
		corrObj1.name = name+'-CH0'
		corrObj1.parent_name = '.fcs files'
		corrObj1.parent_uqid = '0'
		corrObj1.ch_type = 0;
		if (cscale_arr.length != 0)
			{//Average counts per bin. Apparently they are normalised to time.
				unit = cscale_arr[0][cscale_arr[0].length-1]/(cscale_arr[0].length-1)
				//And to be in kHz we divide by 1000.
				corrObj1.kcount = d3.mean(cdata_arr[0])/unit/1000000
			}

		corrObj1.param = JSON.parse(JSON.stringify(fit_obj.def_param))

		corrObj1.max = d3.max(corrObj1.autoNorm)
		corrObj1.min = d3.min(corrObj1.autoNorm)
		corrObj1.tmax = d3.max(corrObj1.autotime)
		corrObj1.tmin = d3.min(corrObj1.autotime)

		fit_obj.objIdArr.push(corrObj1)

		if (num_of_channels == 1){
			tscale_arr = []
			tdata_arr = []
			cscale_arr = []
			cdata_arr = []
			continue;
		}

	if (num_of_channels == 4 && tdata_arr.length == 4){
		
		corrObj2 = new CorrObj(filepath)
		corrObj2.siblings = null
		corrObj2.autoNorm = tdata_arr[1]
		corrObj2.autotime = tscale_arr[1]
		
		corrObj2.name = name+'-CH1'
		corrObj2.parent_name = '.fcs files'
		corrObj2.parent_uqid = '0'
		corrObj2.ch_type = 1;
		
		if (cscale_arr.length != 0)
			{//Average counts per bin. Apparently they are normalised to time.
				//And to be in kHz we divide by 1000.
				corrObj2.kcount = d3.mean(cdata_arr[1])/unit/1000000
			}

		corrObj2.param = JSON.parse(JSON.stringify(fit_obj.def_param))
		
		corrObj2.max = d3.max(corrObj2.autoNorm)
		corrObj2.min = d3.min(corrObj2.autoNorm)
		corrObj2.tmax = d3.max(corrObj2.autotime)
		corrObj2.tmin = d3.min(corrObj2.autotime)

		//Correlation Object 3
		corrObj3 = new CorrObj(filepath)
		corrObj3.siblings = null
		corrObj3.autoNorm = tdata_arr[2]
		corrObj3.autotime = tscale_arr[2]
		
		corrObj3.name = name+'-CH01'
		corrObj3.parent_name = '.fcs files'
		corrObj3.parent_uqid = '0'
		corrObj3.ch_type = 2;
		
		corrObj3.param = JSON.parse(JSON.stringify(fit_obj.def_param))
		
		corrObj3.max = d3.max(corrObj2.autoNorm)
		corrObj3.min = d3.min(corrObj2.autoNorm)
		corrObj3.tmax = d3.max(corrObj2.autotime)
		corrObj3.tmin = d3.min(corrObj2.autotime)
		
		//Correlation Object 4
		corrObj4 = new CorrObj(filepath)
		corrObj4.siblings = null
		corrObj4.autoNorm = tdata_arr[3]
		corrObj4.autotime = tscale_arr[3]
		
		corrObj4.name = name+'-CH10'
		corrObj4.parent_name = '.fcs files'
		corrObj4.parent_uqid = '0'
		corrObj4.ch_type = 3;
		

		corrObj4.param = JSON.parse(JSON.stringify(fit_obj.def_param))
		
		corrObj4.max = d3.max(corrObj4.autoNorm)
		corrObj4.min = d3.min(corrObj4.autoNorm)
		corrObj4.tmax = d3.max(corrObj4.autotime)
		corrObj4.tmin = d3.min(corrObj4.autotime)

		corrObj1.siblings = [corrObj2,corrObj3,corrObj4]
		corrObj2.siblings = [corrObj1,corrObj3,corrObj4]
		corrObj3.siblings = [corrObj1,corrObj2,corrObj4]
		corrObj4.siblings = [corrObj1,corrObj2,corrObj3]
		
		
		fit_obj.objIdArr.push(corrObj2);
		fit_obj.objIdArr.push(corrObj3);
		fit_obj.objIdArr.push(corrObj4);

		tscale_arr = []
		tdata_arr = []
		cscale_arr = []
		cdata_arr = []

	}



	}




	}


}