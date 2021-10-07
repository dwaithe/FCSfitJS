var parse_fcs = function(feed,filepath){


	lines = feed.replace(/\t/g,"").replace(/\r/g,"").split("\n")

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
	ind1 = 0
	ind2 = 0
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
		channel_str = new String(channel_str)
		

		if (channel_str == 'Auto-correlation detector Meta1')
			{channel = 0
			chname = 'CH1'
			ind1 +=1}
		if (channel_str == 'Auto-correlation detector Ch1')
			{channel = 0
				continue;
			chname = 'CH1'}
		if(channel_str == 'Auto-correlation detector Meta2')
			{channel = 1
			chname = 'CH2'
			ind2 +=1}
		if(channel_str == 'Auto-correlation detector Ch2')
			{channel = 1
							continue;
;
			chname = 'CH2'
			}
		if (channel_str == 'Cross-correlation detector Meta2 versus detector Meta1')
			{channel = 3
			chname = 'CH21'}
		if (channel_str == 'Cross-correlation detector Meta1 versus detector Meta2')
			{channel = 2
			chname = 'CH12'}

		
		ind = Math.max(ind1,ind2)

		num_of_channels = parseInt(text[2])

		
		if (len_of_seq > 0){
		
		
			corrObj1 = new CorrObj(filepath)
			corrObj1.siblings = null


			corrObj1.autoNorm = tdata_arr[0]
			corrObj1.autotime = tscale_arr[0]
			corrObj1.name = name+'_'+parseInt(ind)+'_'+chname
			corrObj1.parent_name = '.fcs files'
			corrObj1.parent_uqid = '0'
			corrObj1.ch_type = channel.toString();
			if (cscale_arr.length != 0)
				{//Average counts per bin. Apparently they are normalised to time.
					
					//And to be in kHz we divide by 1000.
					corrObj1.kcount = d3.mean(cdata_arr[0])/1000
				}

			corrObj1.param = JSON.parse(JSON.stringify(fit_obj.def_param))

			corrObj1.max = d3.max(corrObj1.autoNorm)
			corrObj1.min = d3.min(corrObj1.autoNorm)
			corrObj1.tmax = d3.max(corrObj1.autotime)
			corrObj1.tmin = d3.min(corrObj1.autotime)

			fit_obj.objIdArr.push(corrObj1)

			
			tscale_arr = []
			tdata_arr = []
			cscale_arr = []
			cdata_arr = []
		}




	}


}