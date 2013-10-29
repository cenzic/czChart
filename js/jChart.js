/**
* Copyright © Quoc Quach 2013-2014
* Author: Quoc Quach
* Email: quoc_cooc@yahoo.com
* Released under the MIT license
* Date: 10/29/2013
*/

(function($) {
	//handle for jquery plugin
	$.fn.jChart = function (opts) {
		if($(this).length!=1) return null;
		var chart = new $.jChart(this, opts);
		chart.render();
		chart.toImage();

		$(window).bind('resize', function () {
			chart.fixChartPosition();
		});
		return chart;
	};
	$.jChart = function(jObj, opts){
		this.jObj = jObj;
		var options = $.extend(true, { }, $.jChart.defaultOptions, opts);
		this.options = options;
		//no default colors defined
		if (this.options.colors == undefined || this.options.colors.length == 0)
			this.options.colors = ["red", "green", "blue", "aqua", "coral", "brown", "cornflowerblue", "darkblue", "darkorange", "cyan", "darkred", "gold", "indigo", "lightblue", "magenta", "navy", "orange", "orchid", "purple"];
		this.configureChart(opts);
	};
	$.jChart.defaultOptions = {
		scale:2,
		data: [],//value of chart to create.[[1,2,3],[2,3,4],[3,4,5]] for group bars
		title: {
			label: "Chart Title",
			position: "bottom",//"top, bottom, left, right" left or right will be rotate 90 or -90 degree,
			fontSize: 16,
			padding: 10
		},
		type: 'vBar',
		//array of colors e.g. ["red", "blue", "green"]. Colors will be rotated if data length exceeds number of colors
		colors:[],
		metadata: [], // any extra data that should be passed along with each bar
		groupMetadata: [], //any extra data that should be passed along with each group
		stackMetadata: [], //any extra data that should be passed along with each stack of bars (for stack bar charts)
        dataLabels: [], //label for each bar,
        groupLabels: [],//"first", "second", "third"
		labelAngle:0,
		labelFont: "normal 12px arial",
		showDataLabels: true,
		showGroupLabels: true,//set this to show group label instead of individual label.
		showDataValues: true,
		maxValue:0,		
		xPadding: 30,//space for x axis labels.
		yPadding: 30,//space for y axis labels.						
		padding: 10,// padding for chart to edge of the wrapper
		addEffect:true,
		showStroke:true,
		gridStyle:"solid",
		gridColor:"#ccc",
		interactive: true,
		iCanvas:null,		
		axes: {
			origin: { top: 0, left: 0 },//this value will be set when create the grid
			padding: 20,//space between the left most bar and the edge of the chart.				
			xAxis: {
				show: true,
				showGrid: true,
				label: "xAxis",
				incrementValue: 1,
				font: "normal 12px arial"
			},
			yAxis: {
				show: true,
				showGrid: true,
				label: "yAxis",
				incrementValue: 1,
				font: "normal 12px arial"
			},
			x2Axis: {
				show: false,
				showGrid: true,
				label: "x2Axis",
				incrementValue: 1,
				font: "normal 12px arial"
			},
			y2Axis: {
				show: false,
				showGrid: true,
				label: "y2Axis",
				incrementValue: 1,
				font: "normal 12px arial"
			}
		},
		legend: {
			showLegend: false,
			font: "normal 12px arial",			
			legendLabels:[],//if not defined it will used data labels
			colorBoxSize: 10,//10 pixel for the color box 
			padding:10,//5 pixel padding each side.
			margin:10,//margin to the wrapper div.
			boxPadding:5,//padding between box and text.
			textPadding:3,//space between each line of text both top and bottom.
			border:true,
			location: "ne", // n ne e se s sw w nw
			placement: "outside", //outside or inside.
			direction: "vertical", //vertical or horizontal
			autoScale:true,//this value to tell weather auto scale the legend or not, if font was set. 
			//autoScale will be set to false and scale will be set to 1, 
			//if not it will calculate to shrink the legend if needed.
			scale:1, //this will be set programmatically if autoScale is true.
			maxColumns: 0 //use for north or south location to create multiple row legend.
		},
		mouseoverHandler: function(e){
            e.target.lighten(100);
		},
		clickHandler : function(e){
			console.log("click on %d in stack %d in group %d", e.target.index, e.target.stackIndex, e.target.groupIndex);
		},
		mouseoutHandler: function(e){
			e.target.restore();
		}
	};
	/**
	 * register plugins for different types of chart.
	 */
	$.jChart.extend = function(plugin){
		//verify all property are defined.
		if(!plugin.types || !$.isArray(plugin.types) || 
			(plugin.init && typeof(plugin.init) != 'function') ||
			(plugin.processData && typeof(plugin.processData) != 'function') ||
			(plugin.render && typeof(plugin.render) != 'function') ||
			!plugin.defaultOptions || !plugin.prototype){
			console.error("jChart extend error. Plugin signature incorrect");
			return;
		}
		
		for(var i=0; i< plugin.types.length; i++){
			var type = plugin.types[i];
			$.jChart.prototype.chartTypes[type] = plugin;
			var opts = {};
			opts[type]=plugin.defaultOptions;
			$.extend(true,$.jChart.defaultOptions, plugin.defaultOptions);
		};
		
		if(plugin.init)	$.jChart.prototype.initHandlers.push(plugin.init);
				
		$.extend($.jChart.prototype, plugin.prototype);		
	};
	
	/**
	 * share functions or properties of all chart.
	 */
	$.jChart.prototype = {		
		/**
		 * initialization process for all extended
		 */
		initHandlers:[],
		
		/**
		 * Hash of type => plugin
		 */
		chartTypes:{},
		
		/*
		*  If you create many charts at once or you resize the window the chart may be out of place
		*  due to the static positioning of the canvases. Calling this method will fix this charts position
		*/
		fixChartPosition: function () {
			var pos = this.jObj.offset();
			$(this.bCanvas).css("top", pos.top);
			$(this.bCanvas).css("left", pos.left);
			$(this.canvas).css("top", pos.top);
			$(this.canvas).css("left", pos.left);
			this.iCanvas.initCanvasPos();
		},
		/**
		* entry point to draw charts
		*/
		render: function () {
			this.createLayout();
			this.initInterative();
			this.calculateData();
			this.drawGridLines();
			this.drawChart();
		},		
		/*
		* Convert the current canvas to image.
		*/
		toImage:function () {			
			if(typeof(HTMLCanvasElement) == "undefined" || this.options.interactive) return;
			var image = document.createElement("img");
			var c = this.canvas.get(0);
			image.src = c.toDataURL();
			image.width = c.width/this.options.scale;
			image.height = c.height/this.options.scale;
			this.canvas.replaceWith(image);
		},
		
		initInterative:function(){
			//check for interactive chart and 
			if(this.options.interactive){
				if(this.jObj.jGraphic){
					this.iCanvas = $(this.canvas).jGraphic();
				}else{
					this.options.interactive = false;
					console.warn("jGraphic not found, to use interactive jGraphic need to be included.");	
				}				
			}
		},
		/*
		* Get the position of the chart on the page.
		*/
		configureChart: function(opts) {
			//For IE8-- always set scale to 1 since there is no raterize function for excanvas library
			if(typeof(HTMLCanvasElement) == "undefined" || this.options.interactive) this.options.scale = 1;
			//set default legend direction
			if(opts.legend && (opts.legend.location == 'n' || opts.legend.location == 's') && !opts.direction){
				this.options.legend.direction = 'horizontal';
			}
			var offset = this.jObj.offset(),
			    top = offset.top,
			    left = offset.left,
			    width = this.jObj.width(),
			    height = this.jObj.height();
			this.wrapperPosition = { top: top, left: left, width: width, height: height };			
						
			//configure legend scale:
			if(opts.legend && opts.legend.font) {
				this.options.legend.autoScale = false;
			}
			//handle for zero data chart
			if(this.options.maxValue==0) {
				var tmpArr = [];
				if($.isArray(this.options.data[0]))
				{
					for(var i=0;i<this.options.data.length;i++) {
						tmpArr = tmpArr.concat(this.options.data[i]);
					}
				}
				else {
					tmpArr = this.options.data;
				}
				var max = Math.max.apply(this, tmpArr);
				if (max === 0) this.options.maxValue = 1;
				
			}
						
			//invoke all initializing process for plugin.
			for(var i=0; i< this.initHandlers.length; i++){
				this.initHandlers[i].apply(this);
			}
		},
		/**
		*	create html elements for chart layout. We can render differently for canvas here.		
        *   There are 2 layer for the chart: 
        *   layer 1: is grid, legend, title;
        *   layer 2: is the chart itself and values
		*/
		createLayout: function () {
			var canvas = $(this._format('<canvas style="position:absolute;" width="%d" height="%d"/>', this.wrapperPosition.width, this.wrapperPosition.height));
			var c = canvas.get(0);
			var s = this.options.scale;
			c.width *= s;
			c.height *= s;
			var pos = this.jObj.offset();
			canvas.css("top", pos.top);
			canvas.css("left", pos.left);

			var bCanvas = canvas.clone();
			this.jObj.append(bCanvas);

			//if this is a re-rendering, remove the originally rendered chart first
			if (this.canvas != undefined)
				this.canvas.remove();
			if (this.bCanvas != undefined)
				this.bCanvas.remove();

			this.bCanvas = bCanvas;
			this.canvas = canvas;

			this.jObj.append(bCanvas);
			this.jObj.append(canvas);

			var bEl = bCanvas.get(0);
			var el = canvas.get(0);


			//special initialize for canvas context with excanvas library
			if (typeof (HTMLCanvasElement) != "undefined") {
				this.bContext = bEl.getContext("2d");
				this.context = el.getContext("2d");
			} else {
				G_vmlCanvasManager.initElement(bEl);
				G_vmlCanvasManager.initElement(el);
				this.bContext = bEl.getContext('2d');
				this.context = el.getContext('2d');
			}
			this.bContext.scale(s, s);
			this.context.scale(s, s);


			//adding chart title if it defined.
			if (this.options.title.label) {
				this._addTitle();
				this._addGridAndLegend();
			} else {
				this._addGridAndLegend();
			}
		},
		
		_addTitle: function() {			
		    var t = this.options.title,
		        font = "bold " + t.fontSize + "px Arial";            
		    var pos = this._getTitlePosition();
		    this.titlePos = pos;
		    this._addText(pos.x, pos.y, this.options.title.label, { align: pos.align, font: font, vAlign: pos.vAlign, angle: pos.angle }, this.bContext);
		},
	    /**
        * Calculate neccessary information to render the label.
        */
		_getTitlePosition: function () {
		    var t = this.options.title;		    
		    var pos = {
		        align: "center",
		        height: 2 * t.padding + t.fontSize
		    };
		    switch(t.position) {
		        case "top":
		            pos.x = this.wrapperPosition.width / 2;
		            pos.y = t.padding;		            
		            pos.vAlign = "top";
		            pos.angle = 0;
		            break;
		        case "bottom":
		            pos.x = this.wrapperPosition.width / 2;
		            pos.y = this.wrapperPosition.height - t.padding;		            
		            pos.vAlign = "bottom";
		            pos.angle = 0;
		            break;
		        case "left":
		            pos.x = t.padding;
		            pos.y = this.wrapperPosition.height / 2;		            
		            pos.vAlign = "top";
		            pos.angle = 90;
		            break;
		        case "right":
		            pos.x = this.wrapperPosition.width - t.padding;
		            pos.y = this.wrapperPosition.height / 2;		            
		            pos.vAlign = "top";
		            pos.angle = -90;
		            break;
		        default:
		            console.error("title position is invalid - allowed value [top, right, bottom, left]");
		            break;
		    }
		    return pos;
		},

		_addGridAndLegend: function() {
			var l = this.options.legend;
			if (l.showLegend) {
				this._createLegend();
				this._createGrid(l.placement == "inside");
			}else {
				this._createGrid(true);
			}				
		},
		_createLegend: function() {
			//console.log("_createLegend");
			var l = this.options.legend;
			if(l.legendLabels.length==0) l.legendLabels = this.options.dataLabels;
			this._createCanvasLegend();
		},
		// need to now where to create the legend and create the space for it.
		_createCanvasLegend:function () {
			this._calculateLegendSize();
			this._renderCanvasLegend();
		},
		_renderCanvasLegend: function () {
		    var ctx = this.bContext;
			var l = this.options.legend,
				lPos = this.legendPosition;
			//console.log("legendPosition: %j", lPos);
			ctx.save();
			ctx.strokeStyle = "black";
			ctx.lineWidth = 1;
			ctx.textAlign = "left";
			ctx.textBaseline = "top";
			if(l.scale!=1) {
				var font = "normal "+ Math.round(12 * l.scale) + "px arial";
				//console.log("font: %s", font);
				ctx.font = font;				
			}else {
				ctx.font = l.font;
			}			
			if(l.border) {				
				ctx.strokeRect(lPos.left, lPos.top, lPos.width, lPos.height);
			}

			var size = this.legend.size;
			var y = lPos.top + l.scale*l.padding;
			for(var i=0;i<size.rows;i++){
				var x1, x2,prevLength = 0;
				y +=  l.scale * l.textPadding;				
				for(var j=0; j< size.columns; j++){								
					var count = i*size.columns + j;
					if(count==l.legendLabels.length) break;
					left = j == 0 ? lPos.left : 0;
					x1 = left + l.scale*(l.padding + l.boxPadding) + prevLength;					
					x2 = x1 + l.scale*(l.colorBoxSize + l.boxPadding);
					prevLength = x2 + this.legend.columnWidth[j]*l.scale;
					//console.log("x1: %d, x2: %d, y: %d, color: %s", x1, x2, y,this.options.colors[count%this.options.colors.length]);
					ctx.beginPath();
					ctx.fillStyle = this.options.colors[count%this.options.colors.length];
					ctx.rect(x1, y, l.scale*l.colorBoxSize, l.scale*l.colorBoxSize);
					ctx.stroke();
					ctx.fill();
					ctx.beginPath();
					ctx.fillStyle = "black";
					ctx.fillText(l.legendLabels[count], x2, y);	
				}
				y += l.scale * (l.textPadding + 12);
			}			
			ctx.restore();
		},
		/*
		 * rows and columns
		 * */
		_calculateLegendDimension:function(){
			var l = this.options.legend;
			var rows, columns;
			if(l.direction=="vertical") {
				columns = l.maxColumns===0 ? 1 : l.maxColumns;				
			}else{
				columns = l.maxColumns===0 ? l.legendLabels.length : l.maxColumns;				
			}			
			rows = Math.ceil(l.legendLabels.length/columns);
			return {rows:rows, columns: columns};
		},
		//base on the options need to calculate the location of the legend with x, y, width and height.
		_calculateLegendSize:function () {
			//console.log("_calculateLegenSize");
			this.legend = {
				size: { rows: 0, cols: 0 },
				text: [],//2 D array of legend.
				columnWidth: []//array of max column width
			};
		    var l = this.options.legend,
		        wrapper = this.wrapperPosition,
		        wrapperWidth = wrapper.width,
		        wrapperHeight = wrapper.height,
		        width = this._calculateLegendWidth(),
		        height = this._calculateLegendHeight(),
		        x = 0,
		        y = 0,
		        tTop = 0,
		        tBottom = 0,
		        tLeft = 0,
		        tRight = 0;				
		    
			if (this.titlePos) {
			    switch (this.options.title.position) {
			        case "top":
			            tTop = this.titlePos.height;
			            break;
			        case "right":
			            tRight = this.titlePos.height;
			            wrapperWidth -= this.titlePos.height;
			            break;
			        case "bottom":
			            tBottom = this.titlePos.height;
			            break;
			        case "left":			            
			            wrapperWidth -= this.titlePos.height;
			            break;
			        default:
			    }
			}
		    //apply scale
			if (l.autoScale) {
			    var wScale = 1, hScale = 1;			    
			    if (width >= wrapperWidth) {
			        var tmpWidth = (wrapperWidth - 2 * l.margin);
			        wScale = tmpWidth / width;
			        width = tmpWidth;
			    }			    
			    if (height >= wrapperHeight) {
		            var tmpHeight = (wrapperHeight - 2 * l.margin);
			        hScale = tmpHeight / height;
			        height = tmpHeight;
			    }
			    this.options.legend.scale = (wScale < hScale) ? wScale : hScale;
		        //console.log("this.options.legend.scale: %d", this.options.legend.scale);	
		    }
			switch (l.location) {
				case "n":
					x = (wrapper.width - width)/2 + tLeft;
					y = l.margin + tTop;
					break;
				case "ne":
					x = wrapper.width - width - l.margin + tLeft;
					y = l.margin + tTop;						
					break;
				case "e":
				    x = wrapper.width - width - l.margin + tLeft;
					y = (wrapper.height - height) / 2;
					break;
				case "se":
				    x = wrapper.width - width - l.margin + tLeft;
					y = wrapper.height - height - l.margin - tBottom;
					break;
				case "s":
				    x = (wrapper.width - width) / 2 + tLeft;
					y = wrapper.height - height - l.margin - tBottom;
					break;
				case "sw":
				    x = l.margin + tLeft;
					y = wrapper.height - height - l.margin - tBottom;
					break;
				case "w":
				    x = l.margin + tLeft;
					y = (wrapper.height - height) / 2;
					break;
				case "nw":
				    x = l.margin + tLeft;
					y = l.margin + tTop;
					break;				
			default:
				console.error("legend location not available");
			}

			
			this.legendPosition = { left: x, top: y, width: width, height: height };
		},
		_calculateLegendWidth:function () {
			//console.log("_calculateLegendWidth");
			var l = this.options.legend;
			//get array of all text length
			var lengthArr = this._getLegendTextLength();
			this.legend.size = this._calculateLegendDimension();
			
			for(var i=0;i<this.legend.size.rows;i++){				
				this.legend.text[i] = [];
				for(var j=0; j<this.legend.size.columns;j++){
					var count = i*this.legend.size.columns + j;
					this.legend.text[i][j] = l.legendLabels[count];
					this.legend.columnWidth[j] = (this.legend.columnWidth[j]==undefined || this.legend.columnWidth[j] < lengthArr[count]) 
						? lengthArr[count] : this.legend.columnWidth[j];					
				}
			}
			var length = 0;
			for(var i=0;i<this.legend.columnWidth.length;i++) {
				length += this.legend.columnWidth[i];
			}
			length += (2 * l.boxPadding + l.colorBoxSize + l.padding) * this.legend.size.columns + l.padding;								
			return length;
		},
		//this should be used by canvas only.
		_getLegendTextLength: function () {
		    var ctx = this.bContext;
			var l = this.options.legend;
			var arr = [];
			ctx.font = l.font;				
			for(var i = 0; i<l.legendLabels.length;i++) {
				arr.push(ctx.measureText(l.legendLabels[i]).width);
			}	
			return arr;
		},
		_calculateLegendHeight:function () {
			//console.log("_calculateLegendHeight");
			var l = this.options.legend;		
			//calculate for canvas legend
			var height = 2 * l.textPadding * (this.legend.size.rows-1) + 12 * this.legend.size.rows + 2*l.padding;
			return height;
		},
		/*
		*	Create the grid, or the chart contener. For canvas, this will be implement another function.
		*/
		_createGrid: function(isFullWidth) {
			this.gridPosition = this._calculateGrid(isFullWidth);
			//console.log("gridPosition: %j", this.gridPosition);
			var a = this.options.axes;
			if (a.xAxis && a.xAxis.show) {
				var x0 = this.gridPosition.left,
				    y0 = this.gridPosition.top + this.gridPosition.height + 0.5,
				    x1 = x0 + this.gridPosition.width,
				    y1 = y0;
				this._drawLine(x0, y0, x1, y1,null,null,null,this.bContext);
			}
			if (a.x2Axis && a.x2Axis.show) {
				var x0 = this.gridPosition.left,
				    y0 = this.gridPosition.top + 0.5,
				    x1 = x0 + this.gridPosition.width,
				    y1 = y0;
				this._drawLine(x0, y0, x1, y1,null,null,null,this.bContext);
			}
			if (a.yAxis && a.yAxis.show) {
				var x0 = this.gridPosition.left + 0.5,
				    y0 = this.gridPosition.top,
				    x1 = x0,
				    y1 = y0 + this.gridPosition.height;
				this._drawLine(x0, y0, x1, y1,null,null,null,this.bContext);
			}
			if (a.y2Axis && a.y2Axis.show) {
				var x0 = this.gridPosition.left + this.gridPosition.width + 0.5,
				    y0 = this.gridPosition.top,
				    x1 = x0,
				    y1 = y0 + this.gridPosition.height;
				this._drawLine(x0, y0, x1, y1,null,null,null,this.bContext);
			}
		},
		_calculateGrid: function(isFullWidth) {
			var gridSize = this._calculateCanvasGrid();
			//adjust for title and legend.
			var l = this.options.legend;
			if (this.titlePos) {
			    switch (this.options.title.position) {
			        case "top":
			            gridSize.height -= this.titlePos.height;
			            gridSize.top += this.titlePos.height;
			            break;
			        case "right":
			            gridSize.width -= this.titlePos.height;
			            break;
			        case "bottom":
			            gridSize.height -= this.titlePos.height;
			            break;
			        case "left":
			            gridSize.width -= this.titlePos.height;
			            gridSize.left += this.titlePos.height;
			            break;
			        default:			            
			    }				
			}
			
			if(l.showLegend && l.placement == "outside") {				
				if(l.location == "n") {
					gridSize.top += this.legendPosition.height + 2*l.margin;
				}
				
				if(l.location == "nw" || l.location == "w" || l.location == "sw" ) {
					gridSize.left += this.legendPosition.width + 2*l.margin;
				}
				if(l.location == "n" || l.location == "s") {
					gridSize.height = gridSize.height - this.legendPosition.height - 2* l.margin;
				}else {
					gridSize.width = gridSize.width - this.legendPosition.width - 2*l.margin;	
				}				
			}
			//console.log("grid height: %d", gridSize.height);
			return gridSize;
		},
		_calculateCanvasGrid:function () {
			var a = this.options.axes;						
			var left = 0,
			    top = 0,
				width = this.wrapperPosition.width,			    
				height = this.wrapperPosition.height;
			
			var lengthArr = this._getLabelLengthArr(),
				angle = this.options.labelAngle * Math.PI / 180,
				maxLength = Math.max.apply(this,lengthArr);
			
			var xPadding = this.options.xPadding,
			    yPadding = this.options.yPadding,
			    minXPadding = maxLength * Math.abs(Math.sin(angle)),
			    minYPadding = maxLength * Math.abs(Math.cos(angle)),
				maxXPadding = minXPadding > xPadding ? minXPadding : xPadding,
			    maxYPadding = minYPadding > yPadding ? minYPadding : yPadding,			    
			    firstXPadding = lengthArr[0] * Math.abs(Math.sin(angle)),
			    firstYPadding = lengthArr[0] * Math.abs(Math.cos(angle)),
			    lastXPadding = lengthArr[lengthArr.length - 1] * Math.abs(Math.sin(angle)),
			    lastYPadding = lengthArr[lengthArr.length - 1] * Math.abs(Math.cos(angle));
			maxXPadding += 15;
			maxYPadding += 15;
			
			if(this._isHorizontalChart()) {							
				if (a.yAxis.show) {
					left += maxYPadding;
					width -= maxYPadding;
					if(angle > 0 && !a.xAxis.show) {
						height -= firstXPadding;
					}
					if(angle < 0 && !a.x2Axis.show){
						top += lastXPadding;
						height -= lastXPadding;
					}
				}
				
				if (a.y2Axis.show) {
					width -= maxYPadding;
					if(angle < 0 && !a.yAxis.show) {
						height -= firstXPadding;
					}
					if(angle > 0 && !a.y2Axis.show){
						height -= lastXPadding;
						top += lastXPadding;
					}
				}			
				
				if (a.xAxis.show){
					var tmpXPadding = firstXPadding > xPadding ? firstXPadding : xPadding;
					height -= (angle>0) ?  tmpXPadding : xPadding;
				}
				
				if (a.x2Axis.show) {
					var tmpXPadding = lastXPadding > xPadding ? lastXPadding : xPadding;
					tmpXPadding = (angle > 0) ? xPadding : tmpXPadding;
					top += tmpXPadding;
					height -= tmpXPadding;
				}
			}else {	//vertical charts			
				var tmpYPadding = firstYPadding > yPadding ? firstYPadding : yPadding;
				if (a.yAxis.show) {					
					tmpYPadding = (angle > 0) ? tmpYPadding : yPadding;
					left += tmpYPadding;
					width -= tmpYPadding;
				}				
				
				if (a.y2Axis.show) {
					tmpYPadding = (angle < 0) ? tmpYPadding : yPadding;
					width -= tmpYPadding;
				}
				
				if (a.xAxis.show) {
					height -= this.options.showDataLabels ? maxXPadding : minXPadding;
					
					if (angle > 0 && !a.yAxis.show) {
						left += firstYPadding;
						width -= firstYPadding;	
					}
					if(angle<0 && !a.y2Axis.show){
						width -= lastYPadding;
					}
				}
				
				if (a.x2Axis.show) {					
					top += maxXPadding;
					height -= maxXPadding;
					if(angle<0 && !a.yAxis.show) {
						left += firstYPadding;
						width -= firstYPadding;	
					}
					if(angle>0 && !a.y2Axis.show){
						width -= lastYPadding;
					}
				}
				top += this.options.padding;
			}			
			var gridSize =  { top: top, left: left, width: width- this.options.padding, height: height- this.options.padding };
			//console.log("gridSize: %j", gridSize);
			//console.log("height: %d", height);
			return gridSize;
		},		

		_getLabelLengthArr: function () {
		    var ctx = this.bContext;
			var l =  this._isGroupChart() ? this.options.groupLabels : this.options.dataLabels;
			var arr = [];			
			ctx.font = this.options.labelFont;
			for(var i = 0; i<l.length;i++) {
				arr.push(ctx.measureText(l[i]).width);
			}				
			return arr;			
		},
		
		/* ===================== calculation for all chart data =================*/
		/*
		* Whole purpose for precalculation to give the option to render chart differently. With canvas or non canvas.
		*/
		//caculate width and height, x, y, for each bars
		calculateData: function() {
			if (!this.options.data || this.options.data.length == 0) {
				console.error("Chart data not defined");
				return;
			}
			var plugin = this.chartTypes[this.options.type];
			if(plugin && plugin.processData && typeof(plugin.processData) == 'function'){
				plugin.processData.apply(this);
			}
			else{
				console.error("chart type not definded with type: %s", this.options.type);
			}					
		},		
		
		/*
		* Helper function for drawing on canvas
		*/
		_drawLine: function(x0, y0, x1, y1, color, size, style, ctx) {
		    //console.log("drawLine: %j", arguments);
		    ctx = ctx || this.context;
			color = color || "black";
			size = size || 1;
			style = style || "solid";
			ctx.save();
			ctx.beginPath();
			ctx.strokeStyle = color;
			ctx.lineWidth = size;
			switch (style) {
			case "solid":
			    ctx.moveTo(x0, y0);
			    ctx.lineTo(x1, y1);
				break;
			case "dotted":
				this._dashedLine(x0, y0, x1, y1, [1, 3],ctx);
				break;
			case "dashed":
				this._dashedLine(x0, y0, x1, y1,ctx);
				break;
		    case "none":                
                break;
			default:
				console.error("not implemented");
			}
			ctx.stroke();
			ctx.restore();
		},		
		/*
		* draw dashed line or dotted line
		*/
		_dashedLine: function (x, y, x2, y2, da, ctx) {
		    ctx = ctx || this.context;
			if (!da) da = [10, 5];
			ctx.save();
			var dx = (x2 - x), dy = (y2 - y);
			var len = Math.sqrt(dx * dx + dy * dy);
			var rot = Math.atan2(dy, dx);
			ctx.translate(x, y);
			ctx.moveTo(0, 0);
			ctx.rotate(rot);
			var dc = da.length;
			var di = 0, draw = true;
			x = 0;
			while (len > x) {
				x += da[di++ % dc];
				if (x > len) x = len;
				draw ? ctx.lineTo(x, 0) : ctx.moveTo(x, 0);
				draw = !draw;
			}
			ctx.restore();
		},
		/*
		* Helper function for calculation chart data
		*/
		_isHorizontalChart: function() {
			var t = this.options.type;
			return t == "hBar" || t == "hGroupBar" || t == "hStackBar" || t == "hGroupStackBar";
		},
		_isGroupChart: function() {
			var t = this.options.type;
			return t == "vGroupBar" || t == "hGroupBar"
				|| t == "vStackBar" || t == "hStackBar"
				|| t == "vGroupStackBar" || t=="hGroupStackBar";
		},
		_format: function() {
			var format = arguments[0] || "";
			var match = format.match(/%s|%d|%j/g);
			if (!match) return format;

			if (match.length != arguments.length - 1) throw { name: "Argument Error", message: "Number of arguments mismatch" };
			for (var i = 1; i < arguments.length; i++) {
				var matchIndex = i - 1;
				var value = (match[matchIndex] == "%j") ? JSON.stringify(arguments[i]) : arguments[i];
				format = format.replace(match[matchIndex], value);
			}
			return format;
		},
		_calculateUnit: function (max, height) {
			/*Do initial unit calculation*/
			this.baseLine = Math.pow(10, Math.floor(this._log10(max)));
			this.maxIndex = Math.round(max / this.baseLine);
			var maxIndex = (this.maxIndex * this.baseLine);

			/*If there aren't at least 3 ticks then double the amount of ticks*/
			if (this.maxIndex < 3) {
				this.baseLine = this.baseLine / 2;
				this.maxIndex = Math.round(max / this.baseLine);
				maxIndex = (this.maxIndex * this.baseLine);
			}

			/*Check to  make sure their aren't more ticks than their are values*/
			if (maxIndex < max)
				maxIndex = max;

			//tick marks will be cramped on the chart, reduce the amount of ticks
			if ((height / this.maxIndex) <= 10)
			{
				this.baseLine = this.baseLine * 2;
				this.maxIndex = Math.round(max / this.baseLine);
				maxIndex = (this.maxIndex * this.baseLine);
			}

			//calculate unit
			this.unit = height / maxIndex;

			return this.unit;
		},
		_log10: function(val) {
			return Math.log(val) / Math.LN10;
		},
				
		//Get the height of the grid
		_getGridHeight: function() {
			return this.gridPosition.height - this.options.axes.padding;
		},
		//get the width of the grid
		_getGridWidth: function() {
			return this.gridPosition.width - this.options.axes.padding;
		},
		/*============================== Drawing Grid line ===================================*/
		drawGridLines: function() {
			if(this.options.type == "pieChart") return;
			if (this._isHorizontalChart()) {
				this._drawVGridLine();
			} else {
				this._drawHGridLine();
			}
		},
		_drawVGridLine: function() {
			//console.log("draw vertical grid lines");
			var xAxis = (this.options.axes.xAxis.show) ? this.options.axes.xAxis : this.options.axes.x2Axis;
			if (xAxis.showGrid) {
				for (var i = 1; i <= this.maxIndex; i+=xAxis.incrementValue) {
					var val = i * this.baseLine,
					    left = Math.floor(val * this.unit),
					    top = this.gridPosition.height + 2;
					
					var x0 = this.gridPosition.left + left + 0.5,
					    y0 = this.gridPosition.top,
					    x1 = x0,
					    y1 = y0 + this.gridPosition.height;
					this._drawLine(x0, y0, x1, y1, this.options.gridColor, 1, this.options.gridStyle,this.bContext);
					if (this.options.axes.xAxis.show) {
						var x = x0,
						    y = y1 + 15;
						this._addText(x, y, val,{align:"center", font: this.options.axes.xAxis.font},this.bContext);
					}
					if (this.options.axes.x2Axis.show) {
						var x = x0,
						    y = y0 - 3;
						this._addText(x, y, val, { align: "center" }, this.bContext);
					}
				}
			}
		},
		_drawHGridLine: function() {
			//console.log("draw horizontal grid lines");
			var yAxis = (this.options.axes.yAxis.show) ? this.options.axes.yAxis : this.options.axes.y2Axis;
			if (yAxis.showGrid) {
				for (var i = 1; i <= this.maxIndex; i+=yAxis.incrementValue) {
					var val = i * this.baseLine,
					    top = Math.floor(this.gridPosition.height - val * this.unit);

					var x0 = this.gridPosition.left,
					    y0 = this.gridPosition.top + top +0.5,
					    x1 = x0 + this.gridPosition.width,
					    y1 = y0;
					this._drawLine(x0, y0, x1, y1, this.options.gridColor, 1, this.options.gridStyle, this.bContext);
					if (this.options.axes.yAxis.show) {
						var x = x0 - 3,
						    y = y0 + 3;
						this._addText(x, y, val, { align: "right", font: this.options.axes.yAxis.font }, this.bContext);
					}
					if (this.options.axes.y2Axis.show) {
						var x = x1 + 3,
						    y = y0 + 3;
						this._addText(x, y, val,null,this.bContext);
					}
				}
			}

		},
		_addText: function (x, y, text, opts, ctx) {
		    ctx = ctx || this.context;
			var defaultOptions = {
				align:"left",
				vAlign:"alphabetic",
				angle:0,
				font: "normal 12px arial",
				color: "black"
			};
			if (text === "" || text === null || text === undefined) return;
			var options = $.extend({ }, defaultOptions, opts);			
			var angle = -options.angle* Math.PI / 180;
			ctx.save();
			ctx.font = options.font;
			ctx.strokeStyle = options.color;
			ctx.textAlign = options.align;
			ctx.textBaseline = options.vAlign;
			if(angle!==0) {
			    ctx.translate(x, y);
			    ctx.rotate(angle);
			    ctx.fillText(text, 0, 0);
			}else {
			    ctx.fillText(text, x, y);
			}									
			ctx.restore();
		},
		/*========================== Drawing Chart ======================================*/
		//draw each bar base on the color caculated width height/ separate this so that if we want to use canvas for richer chart we can.
		drawChart: function() {
			//console.log("this.chartData: %j", this.chartData);
			var plugin = this.chartTypes[this.options.type];
			for (var i = 0; i < this.chartData.length; i++) {
				if(plugin && plugin.render){
					plugin.render.call(this,this.chartData[i],i);
				}else{
					console.error("no render function available to render chart type");
				}											
			}
		},
		//add mouse event handler for chart to create interative. Not now.
		attachEvent: function(jGraphicObj) {
			var opts = this.options;
			if(typeof(opts.clickHandler) == 'function'){
				jGraphicObj.click(opts.clickHandler);
			}
			if(typeof(opts.mouseoverHandler) == 'function'){
				jGraphicObj.mouseover(opts.mouseoverHandler);
			}
			if(typeof(opts.mouseoutHandler) == 'function'){
				jGraphicObj.mouseout(opts.mouseoutHandler);
			}
			if (typeof (opts.mousemoveHandler) == 'function') {
				jGraphicObj.mousemove(opts.mousemoveHandler);
			}
		}
	};	
})(jQuery);