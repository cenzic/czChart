/**
* Copyright © Cenzic, Inc. 2004-2013
* Author: Quoc Quach
* Email: quoc_cooc@yahoo.com
* Released under the MIT license
* Date: 10/29/2013
*/

(function($) {
	//handle for jquery plugin
	$.fn.czChart = function(opts) {		
		if($(this).length!=1) return null;
		var chart = new $.czChart(this,opts);
		chart.render();
		chart.toImage();
		return chart;
	};
	$.czChart = function(jObj, opts){
		this.jObj = jObj;
		var options = $.extend(true, { }, $.czChart.defaultOptions, opts);
		this.options = options;			
		this.configureChart(opts);
	};
	$.czChart.defaultOptions = {
		scale:2,
		data: [],//value of chart to create.[[1,2,3],[2,3,4],[3,4,5]] for group bars
		title: {
			label: "Chart Title",
			position: "bottom",//"top or bottom",
			fontSize: 16,
			padding: 10
		},
		type: 'vBar',
		shadow: 5,
		//color of each bar or "red" for single color. group bars required colors is array, it will be rostate if length less than data length
		colors: ["red", "green", "blue","aqua","coral","brown","cornflowerblue","darkblue","darkorange","cyan","darkred","gold","indigo","lightblue","magenta","navy","orange","orchid","purple"],
		dataLabels: [], //lable for each bar,
		groupLabels: [],//"first", "second", "third"
		labelAngle:0,
		labelFont: "normal 12px arial",
		showDataLabels: true,
		showGroupLabels: true,//set this to show group label instead of individual label.
		showDataValues: true,
		maxValue:0,		
		barSpacing: 10,//10px between each bar, if not defined then it half bar width.
		groupSpacing: 20,//space between each group.
		xPadding: 30,//space for x axis labels.
		yPadding: 30,//space for y axis labels.						
		padding: 10,// padding for chart to edge of the wrapper
		addEffect:true,
		showStroke:true,
		gridStyle:"solid",
		gridColor:"#ccc",					
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
		}
	};
	/**
	 * register plugins for different types of chart.
	 */
	$.czChart.extend = function(plugin){
		//verify all property are defined.
		if(!plugin.types || !$.isArray(plugin.types) || 
			(plugin.init && typeof(plugin.init) != 'function') ||
			(plugin.processData && typeof(plugin.processData) != 'function') ||
			(plugin.render && typeof(plugin.render) != 'function') ||
			!plugin.defaultOptions || !plugin.prototype){
			console.error("czChart extend error. Plugin signature incorrect");
			return;
		}
		
		for(var i=0; i< plugin.types.length; i++){
			var type = plugin.types[i];
			$.czChart.prototype.chartTypes[type] = plugin;
			var opts = {};
			opts[type]=plugin.defaultOptions;
			$.extend(true,$.czChart.defaultOptions, opts);
		};
		
		if(plugin.init)	$.czChart.prototype.initHandlers.push(plugin.init);
				
		$.extend($.czChart.prototype, plugin.prototype);		
	};
	
	/**
	 * share functions or properties of all chart.
	 */
	$.czChart.prototype = {		
		/**
		 * initialization process for all extended
		 */
		initHandlers:[],
		
		/**
		 * Hash of type => plugin
		 */
		chartTypes:{},
		
		/**
		* entry point to draw charts
		*/
		render: function() {						
			this.createLayout();
			this.calculateData();
			this.drawGridLines();
			this.drawChart();
			this.attachEvent();
		},		
		/*
		* Convert the current canvas to image.
		*/
		toImage:function () {			
			if(typeof(HTMLCanvasElement) == "undefined") return;
			var image = document.createElement("img");
			var c = this.canvas.get(0);
			image.src = c.toDataURL();
			image.width = c.width/this.options.scale;
			image.height = c.height/this.options.scale;
			this.canvas.replaceWith(image);
		},
		/*
		* Get the position of the chart on the page.
		*/
		configureChart: function(opts) {
			//For IE8-- always set scale to 1 since there is no raterize function for excanvas library
			if(typeof(HTMLCanvasElement) == "undefined") this.options.scale = 1;
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
				if(max===0) this.options.maxValue = 1;
			}
			
			//invoke all initializing process for plugin.
			for(var i=0; i< this.initHandlers.length; i++){
				this.initHandlers[i].apply(this);
			}
		},
		/*
		*	create html elements for chart layout. We can render differently for canvas here.		
		*/
		createLayout: function() {
			var canvas = $(this._format('<canvas width="%d" height="%d"/>', this.wrapperPosition.width, this.wrapperPosition.height));
			var c = canvas.get(0);
			var s = this.options.scale;
			c.width *= s;
			c.height *= s;
			this.canvas = canvas;
			this.jObj.append(canvas);
			var el = canvas.get(0);

			//special initialize for canvas context with excanvas library
			if(typeof(HTMLCanvasElement) != "undefined") {
				this.context = el.getContext("2d");
			}else {					
				G_vmlCanvasManager.initElement(el);
				this.context = el.getContext('2d');	
			}				
			this.context.scale(s,s);

			//adding chart title if it defined.
			if (this.options.title.label) {
				this._addTitle();
				this._addGridAndLegend();
			} else {
				this._addGridAndLegend();
			}
		},
		
		_addTitle: function() {
			this.hasTitle = true;
			var t = this.options.title,
			    font = "bold "+ t.fontSize+"px Arial",
				y = (t.position == 'top') ? t.fontSize + t.padding : this.wrapperPosition.height - t.padding -13,
			    x = this.wrapperPosition.width / 2,
				vAlign = t.position == 'top' ? "bottom" : "top";
			this._addText(x, y, this.options.title.label, {align:"center",font:font,vAlign:vAlign});
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
			console.log("_createLegend");
			var l = this.options.legend;
			if(l.legendLabels.length==0) l.legendLabels = this.options.dataLabels;
			this._createCanvasLegend();
		},
		// need to now where to create the legend and create the space for it.
		_createCanvasLegend:function () {
			this._calculateLegendSize();
			this._renderCanvasLegend();
		},
		_renderCanvasLegend:function () {
			var l = this.options.legend,
				lPos = this.legendPosition;
			console.log("legendPosition: %j", lPos);
			this.context.save();
			this.context.strokeStyle = "black";
			this.context.lineWidth = 1;
			this.context.textAlign = "left";
			this.context.textBaseline = "top";
			if(l.scale!=1) {
				var font = "normal "+ Math.round(12 * l.scale) + "px arial";
				console.log("font: %s", font);
				this.context.font = font;				
			}else {
				this.context.font = l.font;
			}			
			if(l.border) {				
				this.context.strokeRect(lPos.left, lPos.top, lPos.width, lPos.height);
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
					console.log("x1: %d, x2: %d, y: %d, color: %s", x1, x2, y,this.options.colors[count%this.options.colors.length]);
					this.context.beginPath();
					this.context.fillStyle = this.options.colors[count%this.options.colors.length];
					this.context.rect(x1, y, l.scale*l.colorBoxSize, l.scale*l.colorBoxSize);
					this.context.stroke();
					this.context.fill();
					this.context.beginPath();
					this.context.fillStyle = "black";
					this.context.fillText(l.legendLabels[count], x2, y);	
				}
				y += l.scale * (l.textPadding + 12);
			}			
			this.context.restore();
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
			console.log("_calculateLegenSize");
			this.legend = {
				size: { rows: 0, cols: 0 },
				text: [],//2 D array of legend.
				columnWidth: []//array of max column width
			};
			var l = this.options.legend,
				wrapper = this.wrapperPosition,
			    width = this._calculateLegendWidth(),
			    height = this._calculateLegendHeight(),			    
			    x = 0, y = 0,
				tTop = 0, tBottom = 0,
				titleHeight = 0;
			
			if (this.hasTitle) {
				titleHeight = this.options.title.fontSize + 2 * this.options.title.padding;
				if (this.options.title.position == 'top') {
					tTop = titleHeight;
				}else {
					tBottom = titleHeight;
				}
			}
			
			if(l.autoScale) {
				var wScale = 1, hScale = 1;
				if (width >= wrapper.width) {
					var tmpWidth = (wrapper.width - 2 * l.margin);
					wScale =  tmpWidth / width;
					width = tmpWidth;
				}
				if(height >= wrapper.height) {
					var tmpHeight = (wrapper.height - 2 * l.margin);
					hScale = tmpHeight / height;
					height = tmpHeight;
				}
				this.options.legend.scale = (wScale < hScale) ? wScale : hScale;
				console.log("this.options.legend.scale: %d", this.options.legend.scale);	
			}			
			switch (l.location) {
				case "n":
					x = (wrapper.width - width)/2;
					y = l.margin + tTop;
					break;
				case "ne":
					x = wrapper.width - width - l.margin;
					y = l.margin + tTop;						
					break;
				case "e":
					x = wrapper.width - width - l.margin;
					y = (wrapper.height - height) / 2;
					break;
				case "se":
					x = wrapper.width - width - l.margin;
					y = wrapper.height - height - l.margin - tBottom;
					break;
				case "s":
					x = (wrapper.width - width)/2;
					y = wrapper.height - height - l.margin - tBottom;
					break;
				case "sw":
					x = l.margin;
					y = wrapper.height - height - l.margin - tBottom;
					break;
				case "w":
					x = l.margin;
					y = (wrapper.height - height) / 2;
					break;
				case "nw":
					x = l.margin;
					y = l.margin + tTop;
					break;				
			default:
				console.error("legend location not available");
			}
			this.legendPosition = { left: x, top: y, width: width, height: height };
		},
		_calculateLegendWidth:function () {
			console.log("_calculateLegendWidth");
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
		_getLegendTextLength:function () {
			var l = this.options.legend;
			var arr = [];
			this.context.font = l.font;				
			for(var i = 0; i<l.legendLabels.length;i++) {
				arr.push(this.context.measureText(l.legendLabels[i]).width);
			}	
			return arr;
		},
		_calculateLegendHeight:function () {
			console.log("_calculateLegendHeight");
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
				this._drawLine(x0, y0, x1, y1);
			}
			if (a.x2Axis && a.x2Axis.show) {
				var x0 = this.gridPosition.left,
				    y0 = this.gridPosition.top + 0.5,
				    x1 = x0 + this.gridPosition.width,
				    y1 = y0;
				this._drawLine(x0, y0, x1, y1);
			}
			if (a.yAxis && a.yAxis.show) {
				var x0 = this.gridPosition.left + 0.5,
				    y0 = this.gridPosition.top,
				    x1 = x0,
				    y1 = y0 + this.gridPosition.height;
				this._drawLine(x0, y0, x1, y1);
			}
			if (a.y2Axis && a.y2Axis.show) {
				var x0 = this.gridPosition.left + this.gridPosition.width + 0.5,
				    y0 = this.gridPosition.top,
				    x1 = x0,
				    y1 = y0 + this.gridPosition.height;
				this._drawLine(x0, y0, x1, y1);
			}
		},
		_calculateGrid: function(isFullWidth) {
			var gridSize = this._calculateCanvasGrid();
			//adjust for title and legend.
			var l = this.options.legend;
			if (this.hasTitle) {
				console.log("get it");
				var titleHeight = this.options.title.fontSize + 2 * this.options.title.padding;
				gridSize.height = gridSize.height - titleHeight;
				if (this.options.title.position == 'top') gridSize.top += titleHeight;
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
			console.log("grid height: %d", gridSize.height);
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
				
				if (a.xAxis.show){					
					height -= maxXPadding;
					if(angle>0 && !a.yAxis.show) {
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
			console.log("gridSize: %j", gridSize);
			console.log("height: %d", height);
			return gridSize;
		},		

		_getLabelLengthArr:function () {
			var l =  this._isGroupChart() ? this.options.groupLabels : this.options.dataLabels;
			var arr = [];			
			this.context.font = this.options.labelFont;
			for(var i = 0; i<l.length;i++) {
				arr.push(this.context.measureText(l[i]).width);
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
		_drawLine: function(x0, y0, x1, y1, color, size, style) {
			//console.log("drawLine: %j", arguments);
			color = color || "black";
			size = size || 1;
			style = style || "solid";
			this.context.save();
			this.context.beginPath();
			this.context.strokeStyle = color;
			this.context.lineWidth = size;
			switch (style) {
			case "solid":
				this.context.moveTo(x0, y0);
				this.context.lineTo(x1, y1);
				break;
			case "dotted":
				this._dashedLine(x0, y0, x1, y1, [1, 3]);
				break;
			case "dashed":
				this._dashedLine(x0, y0, x1, y1);
				break;
			default:
				console.error("not implemented");
			}
			this.context.stroke();
			this.context.restore();
		},		
		/*
		* draw dashed line or dotted line
		*/
		_dashedLine: function(x, y, x2, y2, da) {
			if (!da) da = [10, 5];
			this.context.save();
			var dx = (x2 - x), dy = (y2 - y);
			var len = Math.sqrt(dx * dx + dy * dy);
			var rot = Math.atan2(dy, dx);
			this.context.translate(x, y);
			this.context.moveTo(0, 0);
			this.context.rotate(rot);			
			var dc = da.length;
			var di = 0, draw = true;
			x = 0;
			while (len > x) {
				x += da[di++ % dc];
				if (x > len) x = len;
				draw ? this.context.lineTo(x, 0) : this.context.moveTo(x, 0);
				draw = !draw;
			}
			this.context.restore();
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
		_calculateUnit: function(max, height) {			
			this.baseLine = Math.pow(10, Math.floor(this._log10(max)));
			this.maxIndex = Math.round(max / this.baseLine);
			var maxIndex = (this.maxIndex * this.baseLine);
			if(maxIndex < max) maxIndex = max;
			this.unit = height / maxIndex;
			return this.unit;
		},
		_log10: function(val) {
			return Math.log(val) / Math.LN10;
		},
		//calculate the bar width and spacing between bars.
		_calculateBarWidth: function(count, gridWidth, group) {
			group = group || 1;
			//console.log("_calculateBarWidth: %j",arguments);
			var s = this.options.barSpacing;
			var gs = this.options.groupSpacing;
			return (gridWidth - count*s - (group-1) * gs) / count;			
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
					this._drawLine(x0, y0, x1, y1, this.options.gridColor, 1, this.options.gridStyle);
					if (this.options.axes.xAxis.show) {
						var x = x0,
						    y = y1 + 15;
						this._addText(x, y, val,{align:"center", font: this.options.axes.xAxis.font});
					}
					if (this.options.axes.x2Axis.show) {
						var x = x0,
						    y = y0 - 3;
						this._addText(x, y, val, {align:"center"});
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
					this._drawLine(x0, y0, x1, y1, this.options.gridColor, 1, this.options.gridStyle);
					if (this.options.axes.yAxis.show) {
						var x = x0 - 3,
						    y = y0 + 3;
						this._addText(x, y, val, {align:"right", font: this.options.axes.yAxis.font});
					}
					if (this.options.axes.y2Axis.show) {
						var x = x1 + 3,
						    y = y0 + 3;
						this._addText(x, y, val);
					}
				}
			}

		},
		_addText: function(x, y, text,opts) {
			var defaultOptions = {
				align:"left",
				vAlign:"alphabetic",
				angle:0,
				font: "normal 12px arial",
				color: "black"
			};
			if (text === "" || text === null || text === undefined) return;
			var options = $.extend({ }, defaultOptions, opts);			
			angle = -options.angle* Math.PI / 180;
			this.context.save();
			this.context.font = options.font;
			this.context.strokeStyle = options.color;
			this.context.textAlign = options.align;
			this.context.textBaseline = options.vAlign;
			if(angle!==0) {
				this.context.translate(x, y);
				this.context.rotate(angle);
				this.context.fillText(text, 0, 0);
			}else {
				this.context.fillText(text, x, y);	
			}									
			this.context.restore();
		},
		/*========================== Drawing Chart ======================================*/
		//draw each bar base on the color caculated width height/ separate this so that if we want to use canvas for richer chart we can.
		drawChart: function() {
			//console.log("this.chartData: %j", this.chartData);
			var plugin = this.chartTypes[this.options.type];
			for (var i = 0; i < this.chartData.length; i++) {
				if(plugin && plugin.render){
					plugin.render.call(this,this.chartData[i]);
				}else{
					console.error("no render function available to render chart type");
				}											
			}
		},
		//add mouse event handler for chart to create interative. Not now.
		attachEvent: function() {
			//console.log("attachEvent not implement yet");
		}
	};	
})(jQuery);