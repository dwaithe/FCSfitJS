//Part of the view. The classes and methods here only interact with the plotting elements.


class PlotManager{
    constructor(){

        this.glb_sel_x0
        this.glb_sel_x1
        this.plot_data
        this.xScale //scale range for main plot
        this.yScale //scale range for main plot
        this.x2 //copy of scale range for plot
        this.y2 //copy of scale range for plot
        this.x2Res //scale range for residual plot
        this.y2Res //scale range for residual plot.
        this.xmpt = 0 //Where the mouse has been clicked.
        this.ympt = 0 //Where the mouse has been clicked.


        }

  define_scale(){
      //resets the scale, to span entire data, and removes any transforms.
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

    //Size the slider to the plot pane, with equal margins either side so it is
    //centred and its end tick labels are not clipped. The viewBox keeps it
    //centred if the pane is later resized.
    var sliderMargin = 50
    var sliderBox = Math.max(300, document.getElementById('slider-range').clientWidth || 800)
    var sliderRange = d3
      .sliderBottom(logScale)
      .min(minx)
      .max(maxx)
      .width(sliderBox - 2 * sliderMargin)
      .ticks(3)
      .tickFormat(d3.format(",.4"))
      .default([minx, maxx])
      .fill('#2FA348')
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
        .attr('viewBox', '0 0 ' + sliderBox + ' 72')
        .attr('width', '100%')
        .attr('height', 72)
        .attr('preserveAspectRatio', 'xMidYMid meet')

        .attr("id","slider")
        .append('g')
        .attr('transform', 'translate(' + sliderMargin + ',30)');
        

    gRange.call(sliderRange);
    this.sliderRange = sliderRange //so the fit limits can also be dragged on the plot
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

        //Highlighted curves are drawn last, so they sit on top of the others.
        var high_points = []
        var high_data = []

        for(t=0;t<fit_obj.objIdArr.length;t++){
            if (fit_obj.objIdArr[t].toFit == true){
            if (fit_obj.objIdArr[t].checked==true){
                var high = fit_obj.objIdArr[t].highlight == true
                var series_out = high ? high_points : points
                var data_out = high ? high_data : this.plot_data
                series_out.push(high ? pointSeriesHigh : pointSeries)
                data_out.push(fit_obj.objIdArr[t].autotime.map(function(x, i) {return [x, fit_obj.objIdArr[t].autoNorm[i],t]}))

                if (fit_obj.objIdArr[t].model_autoNorm.length !=0){
                    series_out.push(high ? lineSeriesHigh : lineSeries)
                    //We need to pad the points with the same value to ensure they go upto edge.
                    var m_t = fit_obj.objIdArr[t].model_autotime.map((x, i) => [x, fit_obj.objIdArr[t].model_autoNorm[i]])
                    m_t.unshift([fit_obj.objIdArr[t].model_autotime[0],fit_obj.objIdArr[t].model_autoNorm[0]])
                    const leng = fit_obj.objIdArr[t].model_autotime.length
                    m_t.push([fit_obj.objIdArr[t].model_autotime[leng-1],fit_obj.objIdArr[t].model_autoNorm[leng-1]])
                    data_out.push(m_t)
                }
            }}
              fit_obj.objIdArr[t].highlight = false
            }
        points.push.apply(points, high_points)
        this.plot_data.push.apply(this.plot_data, high_data)

        //Clicking a data point selects its curve in the Data Viewer: see
        //fitproCurveAt in scripts/fitpro_ui.js.

        points.push(verticalLine)
        points.push(verticalLine)

        this.plot_data.push([[[this.glb_sel_x0],[-450]],[[this.glb_sel_x0],[0.1]],[[this.glb_sel_x0],[25]],[[this.glb_sel_x0],[450]]])
        this.plot_data.push([[[this.glb_sel_x1],[-450]],[[this.glb_sel_x1],[0.1]],[[this.glb_sel_x1],[25]],[[this.glb_sel_x1],[450]]])
        
        const decorate = sel => {
            //Attach the zoom on first render, and again whenever define_scale has
            //replaced the scales (e.g. after loading more files). Otherwise the zoom
            //keeps moving the old scale objects and the plot looks locked.
            var target = sel.enter()
            if (this.zoomScales !== this.xScale){
                this.zoomScales = this.xScale
                target = sel.merge(sel.enter())
                target.selectAll('.plot-area, .x-axis, .y-axis').property('__zoom', d3.zoomIdentity)
            }
            target.selectAll('.plot-area')
                .call(this.zoom,this.xScale,this.yScale);
            target
                .selectAll('.x-axis')
                .call(this.zoom, this.xScale, null);
            target
                .selectAll('.y-axis')
                .call(this.zoom, null, this.yScale);
            //sel.enter().select('d3fc-svg.plot-area').call(pointer)
            }



        

        var multi = fc.seriesCanvasMulti()
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
                    case brush:
                        return plot_data.brushedRange;
                    
                    }
                })



        const chart = fc
            .chartCartesian(this.xScale, this.yScale)

            .xLabel('\u03C4  (ms)')
            .yLabel('Correlation G(\u03C4)')
            .xTickFormat(d3.format(","))
            .xTicks(3)
            .yOrient('left')
            .yAxisWidth('5em')
            .svgPlotArea(gridLineSeries)
            .canvasPlotArea(multi)
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
                .domain(this.xScale.domain()) // follows the main plot's tau range (sync_residuals)
                .range([0, width]); // output
            this.y2Res = d3.scaleLinear()
                .domain([d3.min(res_min)*1.1,d3.max(res_max)*1.1]) // input 
                .range([height, 0]); // output

        const res_multi = fc.seriesCanvasMulti()
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
          .yAxisWidth('5em')
          .svgPlotArea(gridLineSeries_res)
          .canvasPlotArea(res_multi)
              

        d3.select('#residuals')
          .datum(residual_data)
          .call(residual);
        }
          

        d3.select('#chart')
        .datum(this.plot_data)
        .call(chart);
        this.update_vertical(this.glb_sel_x0,this.glb_sel_x1,fit_obj.data_min_y, fit_obj.data_max_y)

  }

render = function(){
    d3.select('#chart d3fc-group')
        .node()
        .requestRedraw()
    plt_obj.sync_residuals()
  }

  //Keep the residuals plot on the same tau range as the main plot.
  sync_residuals(){
    if (!this.x2Res || !this.xScale) return
    this.x2Res.domain(this.xScale.domain())
    var res = document.querySelector('#residuals d3fc-group')
    if (res && res.requestRedraw) res.requestRedraw()
  }
  
  zoom = fc.zoom()
      .on('zoom',this.render)
      .wheelDelta(function(event){
          //d3-zoom's default wheelDelta, scaled down. The x-axis spans many
          //decades on a log scale, so the default sensitivity turns a single
          //wheel notch into a huge domain jump - see the filter below.
          return -event.deltaY * (event.deltaMode === 1 ? 0.05 : event.deltaMode ? 1 : 0.002) * (event.ctrlKey ? 10 : 1) * 0.2
      })
      .filter(function(event){
          //Default d3-zoom filter (ignore ctrl-drag and non-primary-button drags),
          //plus a lower bound on scroll-to-zoom-out. Without this, scrolling out far
          //enough drives the zoom scale (k) towards 0, which sends the log-scaled
          //x-axis domain to Infinity/NaN and breaks the plot (SVG "NaN" attribute errors).
          if (event.type === 'wheel' && event.deltaY > 0){
              var k = this.__zoom ? this.__zoom.k : 1
              if (k <= 0.5) return false
          }
          return (!event.ctrlKey || event.type === 'wheel') && !event.button
      })

    
  }


//Seperate objects which have no dependencies.

//Reads a --plot-* colour token from the current theme (light/dark), set in index.html.
function themeColor(name){
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

const pointSeries = fc
    .seriesCanvasPoint()
    .crossValue(d => d[0])
    .mainValue(d => d[1])
    //.type(d3.symbolSquare)

    .decorate(context => {
            var c = themeColor('--plot-point');
            context.fillStyle = c;
            context.strokeStyle = c;
    });
const pointSeriesHigh = fc
    .seriesCanvasPoint()
    .crossValue(d => d[0])
    .mainValue(d => d[1])
    //.type(d3.symbolSquare)
    .decorate(context => {
            var c = themeColor('--plot-point-high');
            context.fillStyle = c;
            context.strokeStyle = c;
    });

const lineSeries = fc
    .seriesCanvasLine()
    .crossValue(d => d[0])
    .mainValue(d => d[1])
    .decorate(context => {
            context.strokeStyle = themeColor('--plot-fit');
            context.lineWidth = 4;
        });
const lineSeriesHigh = fc
    .seriesCanvasLine()
    .crossValue(d => d[0])
    .mainValue(d => d[1])
    .decorate(context => {
            context.strokeStyle = themeColor('--plot-fit-high');
            context.lineWidth = 4;
        });



const verticalLine = fc
    .seriesCanvasLine()
    .crossValue(d => d[0])
    .mainValue(d => d[1])
    .decorate(context => {
            context.strokeStyle = themeColor('--plot-marker');
            context.lineWidth = 4;
        });

const gridLineSeries = fc
    .annotationSvgGridline()
    .yTicks(5)
    .xTicks(5);

const gridLineSeries_res = fc
    .annotationSvgGridline()
    .yTicks(5)
    .xTicks(5);




