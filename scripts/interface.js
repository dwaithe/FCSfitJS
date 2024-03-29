//Part of the controller. The classes and methods here only interact with the interface elements.

var lastSelectedRow;
var trs
var width = 800;
var height = 600




// disable text selection
document.onselectstart = function() {
    return false;
}
function mouseX(evt) {
  if (evt.pageX) {
    return evt.pageX;
  } else if (evt.clientX) {
    return evt.clientX + (document.documentElement.scrollLeft ?
      document.documentElement.scrollLeft :
      document.body.scrollLeft);
  } else {
    return null;
  }
}

function mouseY(evt) {
  if (evt.pageY) {
    return evt.pageY;
  } else if (evt.clientY) {
    return evt.clientY + (document.documentElement.scrollTop ?
      document.documentElement.scrollTop :
      document.body.scrollTop);
  } else {
    return null;
  }
}
//This removes our context menu when we right-click on the dataviewer.
document.querySelector("body").addEventListener("click", (e) => {
  if (e.target.offsetParent != document.getElementById("context-menu")) {
    document.getElementById("context-menu").classList.remove("visible");
  }
});


function RowClick(currenttr, lock) {
    if (window.event.ctrlKey) {
        toggleRow(currenttr.closest('tr'));
    }
    if (window.event.which === 3) {
        //console.log('make nav menu appear')
         //alert("contextmenu"+event);
      	const { clientX: mouseX, clientY: mouseY } = window.event;
      	contextMenu = document.getElementById("context-menu");
  		contextMenu.style.top = `${mouseY}px`;
  		contextMenu.style.left = `${mouseX}px`;

  		contextMenu.classList.add("visible");

      //window.event.returnValue = false;

        }
    if (window.event.button === 0) {
        if (!window.event.ctrlKey && !window.event.shiftKey) {
            var sel = currenttr.closest('tr').className
        	clearAll();
        	if (sel == 'selected'){
        		currenttr.closest('tr').className = '';
        	}else{
        		currenttr.closest('tr').className = 'selected';
        	}
        	lastSelectedRow = currenttr.closest('tr')
            
            
        }

        if (window.event.shiftKey) {
        	
            selectRowsBetweenIndexes([lastSelectedRow.closest('tr').rowIndex+1, currenttr.closest('tr').rowIndex+1])
        }
    }
}

function toggleRow(row) {
    row.className = row.className == 'selected' ? '' : 'selected';
    lastSelectedRow = row;
}

function selectRowsBetweenIndexes(indexes) {
    indexes.sort(function(a, b) {
        return a - b;
    });

    for (var i = indexes[0]; i <= indexes[1]; i++) {
        trs[i-1].className = 'selected';
    }
}

function clearAll() {
    for (var i = 0; i < trs.length; i++) {
        trs[i].className = '';
    }
};
function itemsInList(empty){
	

	items_in_list = []
	if (document.getElementById('table') == null)
		{return items_in_list}

	rows =   document.getElementById('table').rows;
	
	//Finds if they have been selected. 
	for (var i = 0; i < rows.length; i++) {
		row = rows[i]
		if (row.id != ''){
			
			if(row.className == 'selected'){	
					for(t=0;t<fit_obj.objIdArr.length;t++){
						
						if(fit_obj.objIdArr[t]['parent_name'] == row.id)
        					{items_in_list.push(t)}

        			}
				}
			}else{
				
				if(row.className == 'selected'){
				idx = parseInt(row.cells[0].id)
				if (items_in_list.indexOf(idx) == -1	){items_in_list.push(idx)}
				}	

			}
		}
	if (empty == true){
			//Catches if none have been selected.
			if (items_in_list.length == 0){
				for(t=0;t<fit_obj.objIdArr.length;t++){
			        items_in_list.push(t)
				}}}
	return items_in_list;
};

function define_form(){
	
	var x = document.getElementById("form_sample");
	while(x.firstChild){x.removeChild(x.firstChild)}
	

	


	for (var i = 0; i < fit_obj.order_list.length; i++) {
	    //console.log('fit',fit_obj.objId_sel.param)

		param = fit_obj.objId_sel.param[fit_obj.order_list[i]]
		var createform = document.createElement('div'); // Create New Element Form
	createform.setAttribute("class", "form-inline"); // Setting Action Attribute on Form
	 // Setting Method Attribute on Form
	x.appendChild(createform);
		
		if (param['to_show'] == true){

			

			if (param['calc'] == false){
				
				var paramLabel = document.createElement('label'); // Label of parameter
				paramLabel.setAttribute("class", "label_st");
				paramLabel.innerHTML = param['alias'];
				createform.appendChild(paramLabel);
				id = fit_obj.order_list[i]
				var paramValue = document.createElement('input'); // Initial value for the fitting.
				paramValue.setAttribute("class", "form-control form-control-sm");
				paramValue.setAttribute("style", "width: 80px");
				paramValue.setAttribute("type","number")
				paramValue.setAttribute("min",param['minv'])
				paramValue.setAttribute("max",param['maxv'])
				paramValue.setAttribute("value",param['value'])
				paramValue.setAttribute("step",0.001)
				paramValue.setAttribute("id",id+'_value')
				createform.appendChild(paramValue);

				var paramVary = document.createElement('input'); // Checkbox for varying the fit or keepin it fixed.
				paramVary.setAttribute("class", "check_st");
				paramVary.setAttribute("type","checkbox")
				paramVary.checked = param['vary']
				paramVary.setAttribute("id",id+'_vary')
				createform.appendChild(paramVary);

				var paramMin = document.createElement('input'); // For setting parameter min.
				paramMin.setAttribute("class", "form-control form-control-sm");
				paramMin.setAttribute("type","number")
				paramMin.setAttribute("min",-999.)
				paramMin.setAttribute("max",999.)
				paramMin.setAttribute("value",param['minv'])
				paramMin.setAttribute("step",0.001)
				paramMin.setAttribute("id",id+'_minv')
				createform.appendChild(paramMin);

				var paramMax = document.createElement('input'); /// For setting parameter max.
				paramMax.setAttribute("class", "form-control form-control-sm");
				paramMax.setAttribute("type","number")
				paramMax.setAttribute("min",-999)
				paramMax.setAttribute("max",999)
				paramMax.setAttribute("value",param['maxv'])
				paramMax.setAttribute("step",0.001)
				paramMax.setAttribute("id",id+'_maxv')
				createform.appendChild(paramMax);
				var linebreak = document.createElement('br');
				createform.appendChild(linebreak);
			}else{
				var paramLabel = document.createElement('label'); // Label of parameter
				paramLabel.setAttribute("class", "label_st_calc");
				paramLabel.innerHTML = param['alias'];
				createform.appendChild(paramLabel);
				var paramLabel = document.createElement('label'); // Label of parameter
				paramLabel.setAttribute("class", "label_st_calc");
				paramLabel.innerHTML = param['value'].toFixed(3);
				createform.appendChild(paramLabel);
				


				var linebreak = document.createElement('br');
				createform.appendChild(linebreak);}

			}

}
}
var select = document.getElementById("modelFitSel");
function populate_list_view(response_data){
//Populates the drop-down box, with all the curves.
	fit_obj.model_obj_list = []
	while(select.firstChild){select.removeChild(select.firstChild)}
	
		for(t=0;t<fit_obj.objIdArr.length;t++){  

				var name = fit_obj.objIdArr[t].name
				if (fit_obj.objIdArr[t].ch_type == '0' || fit_obj.objIdArr[t].ch_type == '1_1'){
		    		if (document.getElementById('CH1_chbx').checked == false){
		    			continue
		    		}
		    	}
		    	else if (fit_obj.objIdArr[t].ch_type  == '1'|| fit_obj.objIdArr[t].ch_type == '2_2'){
		    		if (document.getElementById('CH2_chbx').checked == false){
		    			continue
		    		}

		    	}
		    	else if (fit_obj.objIdArr[t].ch_type  == '2'|| fit_obj.objIdArr[t].ch_type == '1_2'){
		    		if (document.getElementById('CH12_chbx').checked == false){
		    			continue
		    		}
		    		
		    	}
		    	else if (fit_obj.objIdArr[t].ch_type  == '3'|| fit_obj.objIdArr[t].ch_type == '2_1'){
		    		if (document.getElementById('CH21_chbx').checked == false){
		    			continue
		    		}
		    		
		    	}
		    	else if (fit_obj.objIdArr[t].ch_type == '1_3'){
		    		if (document.getElementById('CH13_chbx').checked == false){
		    			continue
			    		}
		    		
		    	}
		    	else if (fit_obj.objIdArr[t].ch_type == '1_4'){
		    		if (document.getElementById('CH14_chbx').checked == false){
		    			continue
		    		}
		    		
		    	}
		    	else if (fit_obj.objIdArr[t].ch_type == '2_3'){
		    		if (document.getElementById('CH23_chbx').checked == false){
		    			continue
		    		}
		    		
		    	}
		    	else if (fit_obj.objIdArr[t].ch_type == '2_4'){
		    		if (document.getElementById('CH24_chbx').checked == false){
		    			continue
		    		}
		    		
		    	}
		    	else if (fit_obj.objIdArr[t].ch_type == '3_4'){
		    		if (document.getElementById('CH34_chbx').checked == false){
		    			continue
		    		}
		    		
		    	}
		    	else if (fit_obj.objIdArr[t].ch_type == '3_1'){
		    		if (document.getElementById('CH31_chbx').checked == false){
		    			continue
			    		}
		    		
		    	}
		    	else if (fit_obj.objIdArr[t].ch_type == '4_1'){
		    		if (document.getElementById('CH41_chbx').checked == false){
		    			continue
		    		}
		    		
		    	}
		    	else if (fit_obj.objIdArr[t].ch_type == '3_2'){
		    		if (document.getElementById('CH32_chbx').checked == false){
		    			continue
		    		}
		    		
		    	}
		    	else if (fit_obj.objIdArr[t].ch_type == '4_2'){
		    		if (document.getElementById('CH42_chbx').checked == false){
		    			continue
		    		}
		    		
		    	}
		    	else if (fit_obj.objIdArr[t].ch_type == '4_3'){
		    		if (document.getElementById('CH43_chbx').checked == false){
		    			continue
		    		}
		    		
		    	}
				var el = document.createElement("option");
				el.textContent = name
				el.value = t
				select.appendChild(el)
				fit_obj.model_obj_list.push(fit_obj.objIdArr[t])
				
			}
		if (select.childElementCount>0){
		react_to_fit_change()}

	}


$(document).on("click", ".down", function() {
	//To expand and contract the table rows.
  	
  	rowIndex = $(this).parent().index('tr')

    rows =   document.getElementById('table').rows;
    rowId =  rows[rowIndex].id
    endidx = parent_dict[rowId]+rowIndex
    //console.log('ebd',rowIndex+1,endidx)
    cells =  rows[rowIndex].cells[1];
    rows[rowIndex+1].style.display = ((rows[rowIndex+1].style.display == '') ? cells.innerHTML = "►" : cells.innerHTML = "▼");
    for (var i = rowIndex+1; i < endidx; i++) {
    	row = rows[i];
    	
    	row.style.display = ((row.style.display == '') ? 'none' : '');
    	
    }
		

});

function checkedBoxSingle(event){
   if (event.checked){	
    	fit_obj.objIdArr[event.value].checked = true
    	} else {
    	fit_obj.objIdArr[event.value].checked = false
    	
    }}

function checkedBoxMultiple(event)
{

 parent_id = fit_obj.objIdArr[event.value].parent_name
  	
     for(t=0;t<fit_obj.objIdArr.length;t++){  
    	key = fit_obj.objIdArr[t].parent_name
    	if (key == parent_id){
    	if (event.checked) 
  		{	
    	document.getElementById('chbx_toplot'+t).checked=true
    	fit_obj.objIdArr[t].checked = true
    	} else {
    	document.getElementById('chbx_toplot'+t).checked=false
    	fit_obj.objIdArr[t].checked = false
    	
    	
    }}
      
  

     
  }}

var parent_dict
var response_data
var dlist = document.getElementById("data-list");


function populate_data_viewer(){
//Populates the data viewer, where you can check the data to be plotted.
	
	
	while(dlist.firstChild){dlist.removeChild(dlist.firstChild)}
	
	
	

	//This generates parent list of 
	parent_dict = {}
	var main_list = document.createElement("TABLE");
	main_list.setAttribute('id',"table")
    
	ct = 0
    for(t=0;t<fit_obj.objIdArr.length;t++){  
    	key = fit_obj.objIdArr[t].parent_name
    	count = 0
    	for (var key1 in parent_dict) {
    		
    		count += parent_dict[key1]
    		if (key == key1)
    			break;
    	}

    	fit_obj.objIdArr[t].toFit = true
    	
    	if (fit_obj.objIdArr[t].ch_type == '0'|| fit_obj.objIdArr[t].ch_type == '1_1'){
    		if (document.getElementById('CH1_chbx').checked == false){
    			fit_obj.objIdArr[t].toFit = false
    			continue
    		}
    	}
    	else if (fit_obj.objIdArr[t].ch_type == '1'|| fit_obj.objIdArr[t].ch_type == '2_2'){
    		if (document.getElementById('CH2_chbx').checked == false){
    			fit_obj.objIdArr[t].toFit = false
    			continue
    		}

    	}
    	else if (fit_obj.objIdArr[t].ch_type == '3_3'){
    		if (document.getElementById('CH3_chbx').checked == false){
    			fit_obj.objIdArr[t].toFit = false
    			continue
    		}

    	}
    	else if (fit_obj.objIdArr[t].ch_type == '4_4'){
    		if (document.getElementById('CH4_chbx').checked == false){
    			fit_obj.objIdArr[t].toFit = false
    			continue
    		}

    	}
    	else if (fit_obj.objIdArr[t].ch_type == '2'|| fit_obj.objIdArr[t].ch_type == '1_2'){
    		if (document.getElementById('CH12_chbx').checked == false){
    			fit_obj.objIdArr[t].toFit = false
    			continue
    		}
    		
    	}
    	else if (fit_obj.objIdArr[t].ch_type == '3'|| fit_obj.objIdArr[t].ch_type == '2_1'){
    		if (document.getElementById('CH21_chbx').checked == false){
    			fit_obj.objIdArr[t].toFit = false
    			continue
    		}
    		
    	}
    	else if (fit_obj.objIdArr[t].ch_type == '1_3'){
    		if (document.getElementById('CH13_chbx').checked == false){
    			fit_obj.objIdArr[t].toFit = false
    			continue
    		}
    		
    	}
    	else if (fit_obj.objIdArr[t].ch_type == '1_4'){
    		if (document.getElementById('CH14_chbx').checked == false){
    			fit_obj.objIdArr[t].toFit = false
    			continue
    		}
    		
    	}
    	else if (fit_obj.objIdArr[t].ch_type == '2_3'){
    		if (document.getElementById('CH23_chbx').checked == false){
    			fit_obj.objIdArr[t].toFit = false
    			continue
    		}
    		
    	}
    	else if (fit_obj.objIdArr[t].ch_type == '2_4'){
    		if (document.getElementById('CH24_chbx').checked == false){
    			fit_obj.objIdArr[t].toFit = false
    			continue
    		}
    		
    	}
    	else if (fit_obj.objIdArr[t].ch_type == '3_4'){
    		if (document.getElementById('CH34_chbx').checked == false){
    			fit_obj.objIdArr[t].toFit = false
    			continue
    		}
    		
    	}
    	else if (fit_obj.objIdArr[t].ch_type == '3_1'){
    		if (document.getElementById('CH31_chbx').checked == false){
    			fit_obj.objIdArr[t].toFit = false
    			continue
    		}
    		
    	}
    	else if (fit_obj.objIdArr[t].ch_type == '4_1'){
    		if (document.getElementById('CH41_chbx').checked == false){
    			fit_obj.objIdArr[t].toFit = false
    			continue
    		}
    		
    	}
    	else if (fit_obj.objIdArr[t].ch_type == '3_2'){
    		if (document.getElementById('CH32_chbx').checked == false){
    			fit_obj.objIdArr[t].toFit = false
    			continue
    		}
    		
    	}
    	else if (fit_obj.objIdArr[t].ch_type == '4_2'){
    		if (document.getElementById('CH42_chbx').checked == false){
    			fit_obj.objIdArr[t].toFit = false
    			continue
    		}
    		
    	}
    	else if (fit_obj.objIdArr[t].ch_type == '4_3'){
    		if (document.getElementById('CH43_chbx').checked == false){
    			fit_obj.objIdArr[t].toFit = false
    			continue
    		}
    		
    	}
    	
    	
    	//Catches the first mention. This therefore defines a new header.
    	if (!parent_dict.hasOwnProperty(key)){
    		var row = main_list.insertRow(count);
    		parent_dict[key] = 1
    		row.setAttribute("id",key)
    		var checkbox = document.createElement('input');
			
			checkbox.type = 'checkbox';
			checkbox.name = 'idx';
			checkbox.id = 'chbx_header'+ct;
			checkbox.value = t;//repeated below, for entries.
			checkbox.checked = true;//repeated below, for entries.
			fit_obj.objIdArr[t].checked = true
			checkbox.setAttribute("onclick","checkedBoxMultiple(this)");
    		count +=1
    		ct +=1
    		row.insertCell();
    		var cell1 = row.insertCell();
    		
    		row.appendChild(checkbox)
    		row.setAttribute("class",key)
    		cell1.setAttribute("class", "down");
    		cell1.innerHTML = "▼";
    		var cell2 = row.insertCell();
    		cell2.colSpan = "2";
    		cell2.innerHTML = "&nbsp;  "+key;
			cell2.setAttribute("onmousedown","RowClick(this,false);");
			

    	}

    	

    	var row1 = main_list.insertRow(count);
    	parent_dict[key] += 1

    	row1.insertCell(0);
    	row1.insertCell(0);
    	var cell3 = row1.insertCell(0);
    	var checkbox = document.createElement('input');
		row1.appendChild(checkbox)	
		var cell4 = row1.insertCell();
		checkbox.setAttribute("onclick","checkedBoxSingle(this)");
		
		//cell3.innerHTML = "     - "

		// Add some text to the new cells:
		var _name = "&nbsp;  "+fit_obj.objIdArr[t].name
		
		cell4.innerHTML = _name;
		cell3.setAttribute("id",t)
		
		checkbox.type = 'checkbox';
		checkbox.id = 'chbx_toplot'+t;
		checkbox.name = 'idx';
		checkbox.checked = true;
		fit_obj.objIdArr[t].checked = true
		checkbox.value = t;


    	
        cell4.setAttribute("onmousedown","RowClick(this,false);");
		dlist.appendChild(main_list);
		trs = document.getElementById('table').rows;
	        
}
populate_list_view()
}

cancel_select = function(){


}

document.getElementById('CH1_chbx').onclick = function(event){
	populate_data_viewer()
}
document.getElementById('CH2_chbx').onclick = function(event){
	populate_data_viewer()
}
document.getElementById('CH3_chbx').onclick = function(event){
	populate_data_viewer()
}
document.getElementById('CH4_chbx').onclick = function(event){
	populate_data_viewer()
}
document.getElementById('CH12_chbx').onclick = function(event){
	populate_data_viewer()
}
document.getElementById('CH13_chbx').onclick = function(event){
	populate_data_viewer()
}
document.getElementById('CH14_chbx').onclick = function(event){
	populate_data_viewer()
}
document.getElementById('CH21_chbx').onclick = function(event){
	populate_data_viewer()
}
document.getElementById('CH23_chbx').onclick = function(event){
	populate_data_viewer()
}
document.getElementById('CH24_chbx').onclick = function(event){
	populate_data_viewer()
}
document.getElementById('CH34_chbx').onclick = function(event){
	populate_data_viewer()
}
document.getElementById('CH31_chbx').onclick = function(event){
	populate_data_viewer()
}
document.getElementById('CH41_chbx').onclick = function(event){
	populate_data_viewer()
}
document.getElementById('CH32_chbx').onclick = function(event){
	populate_data_viewer()
}
document.getElementById('CH42_chbx').onclick = function(event){
	populate_data_viewer()
}
document.getElementById('CH43_chbx').onclick = function(event){
	populate_data_viewer()
}



//Clear fit parameters from data.
document.getElementById('clear_fits').onclick = function(event){
	clear_fits()

	}
function clear_fits(){
	items_to_clear = itemsInList(true)
	


	for (var i = 0; i < items_to_clear.length; i++) {
        selected = items_to_clear[i]
        var objId = fit_obj.objIdArr[selected]
        objId.model_autoNorm =[]
        objId.model_autotime =[] 
        objId.fitted = false 
        }

    
    plt_obj.prepare_axis()
    plt_obj.update_vertical(plt_obj.glb_sel_x0,plt_obj.glb_sel_x1,fit_obj.data_min_y, fit_obj.data_max_y)
//This closes the context. menu when you select and option.
document.getElementById("context-menu").classList.remove("visible");

}

//Remove data from software
document.getElementById('remove_data').onclick = function(event){
	remove_data()

	}
function remove_data(){
	items_to_clear = itemsInList(true)
	items_sorted = items_to_clear.sort(function(a,b) { return a - b; });
	items_sorted.reverse();
		for (var i = 0; i < items_sorted.length; i++) {
			selected = items_sorted[i]
	        fit_obj.objIdArr.splice(selected, 1); 
           

	}
//This closes the context. menu when you select and option.

document.getElementById("context-menu").classList.remove("visible");
populate_data_viewer()
plt_obj.prepare_axis()

}




function loadJSONFile(files) {
    var input, file, fr;

    if (typeof window.FileReader !== 'function') {
      alert("The file API isn't supported on this browser yet.");
      return;
    }

    
    else if (!files[0]) {
      alert("Please select a file before clicking 'Load'");
    }
    else {
      file = files[0];
      fr = new FileReader();
      fr.onload = receivedText;
      fr.readAsText(file);
    }

    function receivedText(e) {
      let lines = e.target.result;
      
      if (fit_obj.objIdArr.length >0){
      			fit_obj.fit_profile = JSON.parse(lines);
				fit_obj.def_options = JSON.parse(JSON.stringify(fit_obj.fit_profile['def_options']))
	
				document.getElementById("diffNumSpecSpin").value  = fit_obj.def_options['Diff_species']
				document.getElementById("tripNumSpecSpin").value = fit_obj.def_options['Triplet_species']
				fit_obj.objId_sel.param = JSON.parse(JSON.stringify(fit_obj.fit_profile['param']))
				document.getElementById("equation").value = fit_obj.fit_profile['equation']
				document.getElementById("triplet").value = fit_obj.def_options['Triplet_eq']
				document.getElementById("dimension").value = fit_obj.def_options['Dimen']
				define_form()
				//fit_obj.defineTable()
				
				alert('Profile Applied.')}
		else{
					alert("Please load in some data before applying a param profile.")} 
    }
  }


document.getElementById('load_default_profile').onclick = function(event){
	let input = document.createElement('input');
  	input.type = 'file';

  	input.onchange = _ => {
    // you can use this method to get file and perform respective operations
            let files =   Array.from(input.files);
            loadJSONFile(files);
        };
  	input.click();

}
document.getElementById('save_default_profile').onclick = function(event){
		if (fit_obj.objIdArr.length >0){
					fit_obj.fit_profile = {}
					update_params()
					fit_obj.fit_profile['param'] = JSON.parse(JSON.stringify(fit_obj.objId_sel.param))
					fit_obj.fit_profile['def_options'] = JSON.parse(JSON.stringify(fit_obj.def_options))
					fit_obj.fit_profile['equation'] = JSON.parse(JSON.stringify(fit_obj.eqn_selected))
					var filename = prompt("What would you like to name the profile settings file?", "profile_settings.json");
					  if (filename != null) {
					    
					    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fit_obj.fit_profile));
						var dlAnchorElem = document.getElementById('downloadAnchorElem');
						dlAnchorElem.setAttribute("href",     dataStr     );
						dlAnchorElem.setAttribute("download", filename);
						dlAnchorElem.click();
						alert('Profile saved to file, use the \'load\' button and select file to apply.')}
					  }
					
		else{
					alert("Please load in some data before saving a param profile.")}

}
document.getElementById('store_default_profile').onclick = function(event){
		if (fit_obj.objIdArr.length >0){
					fit_obj.fit_profile = {}
					update_params()
					fit_obj.fit_profile['param'] = JSON.parse(JSON.stringify(fit_obj.objId_sel.param))
					fit_obj.fit_profile['def_options'] = JSON.parse(JSON.stringify(fit_obj.def_options))
					fit_obj.fit_profile['equation'] = JSON.parse(JSON.stringify(fit_obj.eqn_selected))
					
					alert('Profile stored, use the \'Apply\' button to apply.')}
		else{
					alert("Please load in some data before storing a param profile.")}


}
document.getElementById('apply_default_profile').onclick = function(event){
	if (fit_obj.objIdArr.length >0){
				fit_obj.def_options = JSON.parse(JSON.stringify(fit_obj.fit_profile['def_options']))
	
				document.getElementById("diffNumSpecSpin").value  = fit_obj.def_options['Diff_species']
				document.getElementById("tripNumSpecSpin").value = fit_obj.def_options['Triplet_species']
				fit_obj.objId_sel.param = JSON.parse(JSON.stringify(fit_obj.fit_profile['param']))
				document.getElementById("equation").value = fit_obj.fit_profile['equation']
				document.getElementById("triplet").value = fit_obj.def_options['Triplet_eq']
				document.getElementById("dimension").value = fit_obj.def_options['Dimen']
				define_form()
				//fit_obj.defineTable()
				
				alert('Profile Applied.')}
		else{
					alert("Please load in some data before applying a param profile.")}

}




document.getElementById('save_param').onclick = function(event){
	items_in_list = itemsInList(true)
	var copyStr = fit_obj.copy_params(items_in_list).replace(/\t/g, ',');
	if( copyStr == "")
		alert("You have not fitted any models to your curves and so there are no fit parameters to save. Please fit one or more curves and try again.")
	else{
		download(copyStr,'outputParam.csv','csv')
	}
	

}

document.getElementById('copy_param').onclick = function(event){
	items_in_list = itemsInList(true)
	var copyStr = fit_obj.copy_params(items_in_list)
	if( copyStr == "")
		alert("You have not fitted any models to your curves and so there are no fit parameters to copy. Please fit one or more curves and try again.")
	else{
		copyToClipboard(copyStr)
	}
	
}

document.getElementById('copy_plot_data').onclick = function(event){
	items_in_list = itemsInList(true)
	var copyStr = fit_obj.copy_plot_data(items_in_list).replace(/\t/g, ',');
	if( copyStr == "")
		alert("You have not fitted any models to your curves and so there is no plot data to copy. Please fit one or more curves and try again.")
	else{
		copyToClipboard(copyStr)
	}
	

}

document.getElementById('save_plot_data').onclick = function(event){
	items_in_list = itemsInList(true)
	var copyStr = fit_obj.copy_plot_data(items_in_list).replace(/\t/g, ',');
	if( copyStr == "")
		alert("You have not fitted any models to your curves and so there is no plot data to save. Please fit one or more curves and try again.")
	else{
		download(copyStr,'outputPlotData.csv','csv')
	}
	

}


document.getElementById('plot_checked').onclick = function(event){
	console.log('Plot checked.')
    plt_obj.prepare_axis()
}
var checked_all = true;
document.getElementById('check_all').onclick = function(event){
	ct = 0
    	for (var key1 in parent_dict) {
    		ct +=1
    	}
    

	if (checked_all == false){
		for(t=0;t<ct;t++){  
			document.getElementById('chbx_header'+t).checked=true}
			fit_obj.objIdArr[t].checked = true
		document.getElementById('check_all').setAttribute('value', 'Check None')
		for(t=0;t<fit_obj.objIdArr.length;t++){  	
		    	document.getElementById('chbx_toplot'+t).checked=true
		    	fit_obj.objIdArr[t].checked = true
		    	checked_all = true}
    }else{
    	for(t=0;t<ct;t++){  
			document.getElementById('chbx_header'+t).checked=false}
			fit_obj.objIdArr[t].checked = false
		document.getElementById('check_all').setAttribute('value', 'Check All')
		for(t=0;t<fit_obj.objIdArr.length;t++){  
		    	document.getElementById('chbx_toplot'+t).checked=false
		    	fit_obj.objIdArr[t].checked = false
		    	checked_all = false}
	}	

}
const copyToClipboard = str => {
		const el = document.createElement('textarea');
		el.value = str;
		el.setAttribute('readonly', '');
		el.style.position = 'absolute';
		el.style.left = '-9999px';
		document.body.appendChild(el);
		el.select();
		document.execCommand('copy');
		document.body.removeChild(el);
};
function update_fit_range(){
	    //When the limits get manually changed for the fit.
	    plt_obj.glb_sel_x0 = document.getElementById('fit_btn_min').value
	    plt_obj.glb_sel_x1 = document.getElementById('fit_btn_max').value

	    plt_obj.update_vertical(plt_obj.glb_sel_x0,plt_obj.glb_sel_x1,fit_obj.data_min_y, fit_obj.data_max_y)
	    plt_obj.prepare_slider(plt_obj.glb_sel_x0,plt_obj.glb_sel_x1,fit_obj.data_min_y, fit_obj.data_max_y)

}
function change_fit_btn_val(x0,x1){
		document.getElementById("fit_btn_min").value = x0
        document.getElementById("fit_btn_max").value = x1
    	}
function react_to_eqn_change(){
	fit_obj.eqn_selected = document.getElementById("equation").value;
	fit_obj.initialModel()
	react_to_fit_change()
}
function react_to_fit_change(){

		var selected =  parseInt(document.getElementById("modelFitSel").value);

		

		if (fit_obj.eqn_selected == 0 || fit_obj.eqn_selected ==1){
				document.getElementById("triplet").disabled = false;
				document.getElementById("dimension").disabled = false;
				document.getElementById("diffNumSpecSpin").disabled = false;
				document.getElementById("tripNumSpecSpin").disabled = false;
		
				
				var tri =  parseInt(document.getElementById("triplet").value);
				var dim =  parseInt(document.getElementById("dimension").value);
				var diffNum = parseInt(document.getElementById("diffNumSpecSpin").value);
				var tripNum = parseInt(document.getElementById("tripNumSpecSpin").value);
				
		
				
		
				fit_obj.def_options['Dimen'] = dim
				fit_obj.def_options['Triplet_eq'] = tri
		
				fit_obj.diffNum = diffNum
				fit_obj.tripNum = tripNum}
		else{
			document.getElementById("triplet").disabled = true;
			document.getElementById("dimension").disabled = true;
			document.getElementById("diffNumSpecSpin").disabled = true;
			document.getElementById("tripNumSpecSpin").disabled = true;


		}

		fit_obj.objId_sel = fit_obj.model_obj_list[selected]
		fit_obj.defineTable()
		define_form()
}
function download(data, filename, type) {
    var file = new Blob([data], {type: type});
    if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
    else { // Others
        var a = document.createElement("a"),
                url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);  
        }, 0); 
    }
}

function update_params(){
//Reads values from inteface and updates the fit paramaters values in the current selected object.
    for (var i = 0; i < fit_obj.order_list.length; i++) {
            param = fit_obj.objId_sel.param[fit_obj.order_list[i]]
            if (param['to_show'] == true && param['calc'] == false){
                id = fit_obj.order_list[i]
                param['value'] = document.getElementById(id+'_value').value
                param['vary'] = document.getElementById(id+'_vary').checked
                param['minv'] = document.getElementById(id+'_minv').value
                param['maxv'] = document.getElementById(id+'_maxv').value

                fit_obj.objId_sel.param[fit_obj.order_list[i]] = param
            }
        }
}


document.getElementById('fitCurrent_btn').onclick = function(event){
    event.preventDefault();
    console.log("Fit data")
    update_params()
    

    fit_obj.fitToParameters(fit_obj.objId_sel, plt_obj.glb_sel_x0,plt_obj.glb_sel_x1)

    define_form()
    plt_obj.prepare_axis()
    plt_obj.update_vertical(plt_obj.glb_sel_x0,plt_obj.glb_sel_x1,fit_obj.data_min_y, fit_obj.data_max_y)
}

document.getElementById('fitSelected_btn').onclick = function(event){
    event.preventDefault();
    console.log("Fitting All data")
    update_params()
    rows =   document.getElementById('table').rows;

    items_to_fit = []
    for (var i = 0; i < rows.length; i++) {
        row = rows[i]
        if (row.id != ''){
            
            if(row.className == 'selected'){    
                    for(t=0;t<num_of_plots;t++){
                    
                        if(fit_obj[t].parent_name == row.id)
                            {items_to_fit.push(t)}

                    }
                }
            }else{
                
                if(row.className == 'selected'){    
                items_to_fit.push(parseInt(row.cells[0].id))} 

            }
        }
    //First we synch the parameters with the currently selected one in the dropdown list.
    for (var i = 0; i < items_to_fit.length; i++) {
        selected = items_to_fit[i]
        var objId = fit_obj.objIdArr[selected]
        objId.param =  JSON.parse(JSON.stringify(fit_obj.objId_sel.param))
        }
     //Now we apply the fit
    for (var i = 0; i < items_to_fit.length; i++) {
        selected = items_to_fit[i]
        var objId = fit_obj.objIdArr[selected]
        fit_obj.fitToParameters(objId, plt_obj.glb_sel_x0, plt_obj.glb_sel_x1)       
        }
    define_form()
               
    plt_obj.prepare_axis()
    plt_obj.update_vertical(plt_obj.glb_sel_x0, plt_obj.glb_sel_x1, fit_obj.data_min_y, fit_obj.data_max_y)
}


document.getElementById('fitAll_btn').onclick = function(event){
    event.preventDefault();
    console.log("Fitting All data")
    update_params()
    items_to_fit = []

    var children = select.childNodes;
    children.forEach(function(item){items_to_fit.push(item.value);});


    //First we synch the parameters with the currently selected one in the dropdown list.
    for (var i = 0; i < items_to_fit.length; i++) {
        selected = items_to_fit[i]
        var objId = fit_obj.objIdArr[selected]
        objId.param =  JSON.parse(JSON.stringify(fit_obj.objId_sel.param))
        }
     //Now we apply the fit
    for (var i = 0; i < items_to_fit.length; i++) {
        selected = items_to_fit[i]
        var objId = fit_obj.objIdArr[selected]
        fit_obj.fitToParameters(objId, plt_obj.glb_sel_x0,plt_obj.glb_sel_x1)       
        }

    define_form()
               
    plt_obj.prepare_axis()
    plt_obj.update_vertical(plt_obj.glb_sel_x0,plt_obj.glb_sel_x1,fit_obj.data_min_y, fit_obj.data_max_y)
}
var open_file_imprt = function(event){
		document.getElementById('splash').style.display = "none";
      var input = event.target;
      reader = []

      count = 0
      for (var i = 0; i < input.files.length; i++) {
        reader[i] = new FileReader();
        reader[i].onload = function(ev){
      	namestr = input.files[count].name.split(".");
      	ext = namestr[namestr.length-1];
      	console.log('ext',ext)
      	parse_data = false
      	if(ext == 'csv') parse_data = parse_csv(ev.currentTarget.result,input.files[count].name)
      	else if(ext == 'fcs') parse_data = parse_fcs(ev.currentTarget.result,input.files[count].name)
        else if(ext == 'sin' || ext == 'SIN') parse_data = parse_sin(ev.currentTarget.result,input.files[count].name)
        
        if(parse_data == false){
          alert("There was a problem reading file: "+input.files[count].name)

        }
        count +=1
        if(count == input.files.length && fit_obj.objIdArr.length>0){
          //All files imported.

            

            
            populate_data_viewer()
            fit_obj.calc_limits()

            plt_obj.prepare_slider(fit_obj.data_min_x, fit_obj.data_max_x,fit_obj.data_min_y, fit_obj.data_max_y)
            plt_obj.define_scale()
            

            plt_obj.prepare_axis()


          }
}
    reader[i].readAsText(input.files[i])
  }
  
}

			
 $(document).keyup(function(e) {
        if (e.which === 38) {
          //up was pressed
         
			var event = jQuery.Event( "mousewheel" );
			event.deltaY = -1;
			$(".test").trigger(event);
			console.log('wte')


      }
    });   
