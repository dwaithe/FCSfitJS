//Part of the view. The classes and methods here only interact with the plotting elements.


class PlotManager{
    constructor(){

        this.glb_sel_x0
        this.glb_sel_x1
        this.plot_data
        this.scale_x = 1
        this.scale_y = 1
        this.prev_s = 1
        this.prev_x = 0
        this.prev_y = 0
        this.trans_x = 0
        this.trans_y = 0
        this.xScale //scale range for main plot
        this.yScale //scale range for main plot
        this.x2 //copy of scale range for plot
        this.y2 //copy of scale range for plot
        this.x2Res //scale range for residual plot
        this.y2Res //scale range for residual plot.
        this.reset_zoom = false;
        this.scaleMode =  'both'


        }

  define_scale(){
      //resets the scale, to span entire data, and removes any transforms.
      this.scale_x =1
      this.scale_y =1
      this.prev_s = 1
      this.prev_x =0
      this.prev_y =0
      this.trans_x =0
      this.trans_y = 0
      this.xScale = d3.scaleLog()
                  .domain([fit_obj.data_min_x, fit_obj.data_max_x]) // input
                  .range([0, width]); // output
      this.yScale = d3.scaleLinear()
                  .domain([fit_obj.data_min_y, fit_obj.data_max_y]) // input 
                  .range([height, 0]); // output
      this.x2 = this.xScale.copy();
      this.y2 = this.yScale.copy();
      }

  update_vertical(x0,x1,y0,y1){ 
    
      this.plot_data[this.plot_data.length-2] = [[[x0],[y0]],[[x0],[y0]],[[x0],[y1]],[[x0],[y1]],[[x0],[y1]]]
      this.plot_data[this.plot_data.length-1] = [[[x1],[y0]],[[x1],[y0]],[[x1],[y1]],[[x1],[y1]],[[x1],[y1]]]

       d3.select('d3fc-group')
          .node()
          .requestRedraw();


    }
  
  /**
   * @function prepare_slider 
   * Takes four arguments.
   * The return value is null.
   * @param minx
   * @param maxx
   * @param miny
   * @param maxy
   */
  prepare_slider(minx,maxx,miny,maxy){


    const logScale = d3.scaleLog().domain([minx, maxx])

    d3.select("#slider").remove()
    var x0 = Math.round(minx)
    var x1 = Math.round(maxx) 
    
    this.glb_sel_x0 = minx
    this.glb_sel_x1 = maxx

    var sliderRange = d3
      .sliderBottom(logScale)
      .min(minx)
      .max(maxx)
      .width(750)
      .ticks(3)
      .tickFormat(d3.format(",.4"))
      .default([minx, maxx])
      .fill('#2196f3')
      .on('onchange', function(val){
      
            x0 = Math.round(val[0] * 10000) / 10000
            x1 = Math.round(val[1] * 10000) / 10000

            change_fit_btn_val(x0,x1)

            
            plt_obj.glb_sel_x0 = val[0]
            plt_obj.glb_sel_x1 = val[1]

            plt_obj.update_vertical(val[0],val[1],miny,maxy)
            });
    

    var gRange = d3
      .select('div#slider-range')
        .append('svg')
        .attr('width', 800)
        .attr('height', 100)

        .attr("id","slider")
        .append('g')
        .attr('transform', 'translate(30,30)');
        

    gRange.call(sliderRange);
    }


  prepare_axis(){
      //Method for showing the axis and plotting the data.
        this.plot_data = []
        var points = []
        var items_to_highlight = itemsInList(false)

        for (var i = 0; i < items_to_highlight.length; i++) {
            var selected = items_to_highlight[i]
            fit_obj.objIdArr[selected].highlight = true
        }


        for(t=0;t<fit_obj.objIdArr.length;t++){
            if (fit_obj.objIdArr[t].toFit == true){
            if (fit_obj.objIdArr[t].checked==true){
                if(fit_obj.objIdArr[t].highlight == true)
                  {points.push(pointSeriesHigh)}else{points.push(pointSeries)}
                
                this.plot_data.push(fit_obj.objIdArr[t].autotime.map((x, i) => [x, fit_obj.objIdArr[t].autoNorm[i]]))
                
                
                if (fit_obj.objIdArr[t].model_autoNorm.length !=0){
                    
                    
                    if(fit_obj.objIdArr[t].highlight == true)
                      {points.push(lineSeriesHigh)}else{points.push(lineSeries)}
                    //We need to pad the points with the same value to ensure they go upto edge.
                    var m_t = fit_obj.objIdArr[t].model_autotime.map((x, i) => [x, fit_obj.objIdArr[t].model_autoNorm[i]])
                    m_t.unshift([fit_obj.objIdArr[t].model_autotime[0],fit_obj.objIdArr[t].model_autoNorm[0]])
                    const leng = fit_obj.objIdArr[t].model_autotime.length
                    m_t.push([fit_obj.objIdArr[t].model_autotime[leng-1],fit_obj.objIdArr[t].model_autoNorm[leng-1]])
                    this.plot_data.push(m_t)
                    
               
        
                }
            }}
              fit_obj.objIdArr[t].highlight = false
            }
        



        points.push(verticalLine)
        points.push(verticalLine)

        this.plot_data.push([[[this.glb_sel_x0],[-450]],[[this.glb_sel_x0],[0.1]],[[this.glb_sel_x0],[25]],[[this.glb_sel_x0],[450]]])
        this.plot_data.push([[[this.glb_sel_x1],[-450]],[[this.glb_sel_x1],[0.1]],[[this.glb_sel_x1],[25]],[[this.glb_sel_x1],[450]]])

        const decorate = sel => {
            sel.select('d3fc-svg.plot-area')             
                .call(this.zoom)
            }


        var multi = fc.seriesWebglMulti()
            .xScale(this.xScale)
            .yScale(this.yScale)
            .series(points)
            .mapping((plot_data, index, series) => {
                switch (series[index]) {
                    case pointSeriesHigh:
                        return plot_data[index];
                    case pointSeries:
                        return plot_data[index];
                    case lineSeries:
                        return plot_data[index];
                    case lineSeriesHigh:
                        return plot_data[index];
                    case verticalLine:
                        return plot_data[index];
                    
                    }
                })



        const chart = fc
            .chartCartesian(this.xScale, this.yScale)

            .xLabel('\u03C4  (ms)')
            .yLabel('Correlation G(\u03C4)')
            .xTickFormat(d3.format(","))
            .xTicks(3)
            .yOrient('left')
            .svgPlotArea(gridLineSeries)
            .webglPlotArea(multi)
            .decorate(decorate)

        var residual_data = []
        var residual_points = []
        var res_min = []
        var res_max = []
        for(t=0;t<fit_obj.objIdArr.length;t++){
            
              if (fit_obj.objIdArr[t].checked==true){
                    if (fit_obj.objIdArr[t].model_autoNorm.length !=0){
                        residual_points.push(pointSeries)
                        //We need to pad the points with the same value to ensure they go upto edge.
                        residual_data.push(fit_obj.objIdArr[t].model_autotime.map((x, i) => [x, fit_obj.objIdArr[t].residuals[i]]))
                        res_min.push(d3.min(fit_obj.objIdArr[t].residuals))
                        res_max.push(d3.max(fit_obj.objIdArr[t].residuals))
                    }}
        }
         
        if (residual_data.length > 0){
            this.x2Res = d3.scaleLog()
                .domain([fit_obj.data_min_x, fit_obj.data_max_x]) // input
                .range([0, width]); // output
            this.y2Res = d3.scaleLinear()
                .domain([d3.min(res_min)*1.1,d3.max(res_max)*1.1]) // input 
                .range([height, 0]); // output

        const res_multi = fc.seriesWebglMulti()
          .xScale(this.x2Res)
          .yScale(this.y2Res)
          .series(residual_points)
          .mapping((residual_data, index, series) => {
              switch (series[index]) {
                  case pointSeries:
                      return residual_data[index];}
                  })
        const residual = fc
          .chartCartesian(this.x2Res, this.y2Res)
          .xLabel('\u03C4  (ms)')
          .yLabel('Residuals')
          .xTickFormat(d3.format(","))
          .xTicks(3)
          .yTicks(5)
          .yOrient('left')
          .svgPlotArea(gridLineSeries_res)
          .webglPlotArea(res_multi)
              

        d3.select('#residuals')
          .datum(residual_data)
          .call(residual);
        }
          

        d3.select('#chart')
        .datum(this.plot_data)
        .call(chart);
        this.update_vertical(this.glb_sel_x0,this.glb_sel_x1,fit_obj.data_min_y, fit_obj.data_max_y)

  }
  reset_plot = function(){
          var zoom_ele = d3.select('d3fc-svg.plot-area')._groups[0][0].__zoom
          zoom_ele.x = 0
          zoom_ele.y = 0
          zoom_ele.k = 1
          d3.select('d3fc-svg.plot-area').call(plt_obj.zoom)
          this.define_scale()
          this.prepare_axis()

  }
  change_zoom = function(factor){
          var zoom_ele = d3.select('d3fc-svg.plot-area')._groups[0][0].__zoom
          //console.log('zoom_ele',zoom_ele,this.scale_x)
          zoom_ele.k *= factor
          this.scale_x *=factor
          this.scale_y *=factor
          
          var transform = d3.zoomIdentity
      
          .scale(zoom_ele.k) 
      
    
          d3.select('d3fc-svg.plot-area').call(this.zoom.transform, transform);
          this.prepare_axis()

  }
  
  zoom = d3.zoom()
      .on('zoom', event => {
      //The zoom functionality works great if you want joint scaling in both x and y.
      //We want to sometimes scales in one axis and not the other.
      //This made it necessary to independently store and update the scaling parameters.
      const t = event.transform;

      var delta_k = t.k-this.prev_s;
      var delta_x = t.x-this.prev_x
      var delta_y = t.y-this.prev_y
          
      if(this.scaleMode == "vertical") {
         
        this.scale_y += delta_k
       
        if (this.scale_y < 0.1) {
          this.scale_y = 0.1;
          t.x = this.prev_x
          t.y = this.prev_y
          t.k = this.prev_s

          
        }else{
          this.trans_y += delta_y  
          this.prev_y = t.y
          this.prev_s = t.k
          var ty = d3.zoomIdentity.translate(0,this.trans_y).scale(this.scale_y);
          this.yScale.domain(ty.rescaleY(this.y2).domain());}
        }
        
      
      if(this.scaleMode == "horizontal") {
        this.scale_x += delta_k
        
        if (this.scale_x < 0.1) {
          this.scale_x = 0.1
          t.x = this.prev_x
          t.y = this.prev_y
          t.k = this.prev_s

          }else{
          this.trans_x += delta_x
          this.prev_x = t.x
          this.prev_s = t.k
          var tx = d3.zoomIdentity.translate(this.trans_x,0).scale(this.scale_x);
          this.xScale.domain(tx.rescaleX(this.x2).domain());

          }
        
        }
      
      if(this.scaleMode == "both") {
        
        this.scale_y += delta_k
        this.scale_x += delta_k
        if (this.scale_x < 0.1) {
            this.scale_x = 0.1;
            t.x = this.prev_x
            t.k = this.prev_s
           }else{
             this.trans_x += delta_x
             this.prev_x = t.x
             this.prev_y = t.y
             this.prev_s = t.k
             var tx = d3.zoomIdentity.translate(this.trans_x,0).scale(this.scale_x);
             this.xScale.domain(tx.rescaleX(this.x2).domain());
           }
        if (this.scale_y < 0.1) {
            this.scale_y = 0.1;
            
            t.y = this.prev_y
            t.k = this.prev_s
            }else{
            this.trans_y += delta_y
            this.prev_x = t.x
            this.prev_y = t.y
            this.prev_s = t.k
            var ty = d3.zoomIdentity.translate(0,this.trans_y).scale(this.scale_y);
             this.yScale.domain(ty.rescaleY(this.y2).domain());
          }
  
    }

 d3.select('d3fc-group')
        .node()
        .requestRedraw();
  });
}



//Seperate objects which have no dependencies.

const pointSeries = fc
    .seriesWebglPoint()
    .crossValue(d => d[0])
    .mainValue(d => d[1])
    //.type(d3.symbolSquare)
    .decorate(program => {
            fc.webglFillColor([50 / 255, 50 / 255, 50 / 255, 1.0])(program);
    });
const pointSeriesHigh = fc
    .seriesWebglPoint()
    .crossValue(d => d[0])
    .mainValue(d => d[1])
    //.type(d3.symbolSquare)
    .decorate(program => {
            fc.webglFillColor([0 / 255, 0 / 255, 200 / 255, 1.0])(program);
    });

const lineSeries = fc
    .seriesWebglLine()
    .crossValue(d => d[0])
    .mainValue(d => d[1])
    .lineWidth(4)
    .decorate(program => {
            fc.webglStrokeColor([255 / 255, 0 / 255, 0 / 255, 1.0])(program); 
        });
const lineSeriesHigh = fc
    .seriesWebglLine()
    .crossValue(d => d[0])
    .mainValue(d => d[1])
    .lineWidth(4)
    .decorate(program => {
            fc.webglStrokeColor([0 / 255, 200 / 255, 0 / 255, 1.0])(program); 
        });



const verticalLine = fc
    .seriesWebglLine()
    .crossValue(d => d[0])
    .mainValue(d => d[1])
    .lineWidth(4)
    .decorate(program => {
            fc.webglStrokeColor([0 / 255, 0 / 255, 128 / 255, 1.0])(program); 
        });

const gridLineSeries = fc
    .annotationSvgGridline()
    .yTicks(5)
    .xTicks(5);

const gridLineSeries_res = fc
    .annotationSvgGridline()
    .yTicks(5)
    .xTicks(5);

