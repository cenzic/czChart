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
		var chart = new czChart(this,opts);
		chart.render();
		chart.toImage();
		return chart;
	};
	var czChart = function(jObj, opts){
		this.jObj = jObj;
		var options = $.extend(true, { }, czChart.defaultOptions, opts);
		this.options = options;			
		this.configureChart(opts);
	};
	czChart.defaultOptions = {
		scale:2,
		useCanvas: true,//set to true to detect if canvas available and use it automatically.false to use html elements to create chart.
		data: [],//value of chart to create.[[1,2,3],[2,3,4],[3,4,5]] for group bars
		title: {
			label: "Chart Title",
			position: "bottom",//"top or bottom",
			fontSize: 16,
			padding: 10
		},
		type: 'vBar',//vBar, hBar, vGroupBar, hGroupBar, vStackBar, hStackBar, vGroupStackBar, hGroupStackBar, pieChart
		shadow: 5,
		//color of each bar or "red" for single color. group bars required colors is array, it will be rostate if length less than data length
		colors: ["red", "green", "blue"],
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
		pieChart:{
			startAngle: 90,
			//clockwise:true,//clockwise couter clockwise
			lineWidth:3,
			lineColor:"#333",
			radius: 0,
			//value and label show outside close to the pie.
			valuePosition:"outside",//if show inside, the value will be inside and legend will be added. 
			minAngleForValue:10,//if angle < 10 degree, the value will be place outside the pie.
		},
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
	//real business logic
	czChart.prototype = {					
		/*
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
			if(!this.canvas || typeof(HTMLCanvasElement) == "undefined") return;
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
			//console.log("get here");
			//this.useCanvas = typeof(HTMLCanvasElement) != "undefined" && this.options.useCanvas;
			if(typeof(HTMLCanvasElement) == "undefined") this.options.scale = 1;
			this.useCanvas = this.options.useCanvas;
			//set default legend direction
			if(opts.legend && (opts.legend.location == 'n' || opts.legend.location == 's') && !opts.direction){
				this.options.legend.direction = 'horizontal';
			}
			//console.log("useCanvas: %s",this.useCanvas);
			var offset = this.jObj.offset(),
			    top = offset.top,
			    left = offset.left,
			    width = this.jObj.width(),
			    height = this.jObj.height();
			this.wrapperPosition = { top: top, left: left, width: width, height: height };			
			//configure pieChart
			if(this.options.type=="pieChart"){
				var a = this.options.axes;
				a.xAxis.show = false;
				a.x2Axis.show = false;
				a.yAxis.show = false;
				a.y2Axis.show = false;
				this.options.legend.showLegend = this.options.pieChart.valuePosition == "inside";				
			}
			//configure legen scale:
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
		},
		/*
		*	create html elements for chart layout. We can render differently for canvas here.		
		*/
		createLayout: function() {
			if (this.useCanvas) {
				var canvas = $(this._format('<canvas width="%d" height="%d"/>', this.wrapperPosition.width, this.wrapperPosition.height));
				var c = canvas.get(0);
				var s = this.options.scale;
				c.width *= s;
				c.height *= s;
				this.canvas = canvas;
				this.jObj.append(canvas);
				var el = canvas.get(0);
				if(typeof(HTMLCanvasElement) != "undefined") {
					this.context = el.getContext("2d");
				}else {					
					G_vmlCanvasManager.initElement(el);
					this.context = el.getContext('2d');	
				}				
				this.context.scale(s,s);
			}
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
			if (this.useCanvas) {
				var t = this.options.title,
				    font = "bold "+ t.fontSize+"px Arial",
					y = (t.position == 'top') ? t.fontSize + t.padding : this.wrapperPosition.height - t.padding -13,
				    x = this.wrapperPosition.width / 2,
					vAlign = t.position == 'top' ? "bottom" : "top";
				this._addText(x, y, this.options.title.label, {align:"center",font:font,vAlign:vAlign});
			} else {
				this.jTitle = $(this._format("<div class=\"czchart_title\" style='position:absolute;'>%s</div>", this.options.title.label));				
				this.jObj.append(this.jTitle);
				this.jTitle.css("left", this.wrapperPosition.left);
				this.jTitle.css("width", this.wrapperPosition.width);
				var top = (this.options.title.position == 'top') ?
					this.wrapperPosition.top :
					this.wrapperPosition.top + this.wrapperPosition.height - this.jTitle.outerHeight();
				this.jTitle.css("top", top);
			}
		},
		_addGridAndLegend: function() {
			var l = this.options.legend;
			if (this.useCanvas) {				
				if (l.showLegend) {
					this._createLegend();
					this._createGrid(l.placement == "inside");
				}else {
					this._createGrid(true);
				}				
				return;
			}
			//handle for none canvas chart.
			this.jGrid = $("<div class='czchart_grid' style='position:absolute;'></div>");
			this.jObj.append(this.jGrid);
			if (l.showLegend) {
				this.jLegend = $("<div class='czchart_legend' style='position:absolute;'></div>");
				this.jObj.append(this.jLegend);
				this._createLegend();
				this._createGrid(l.placement == "inside");				
			} else {
				this._createGrid(true);
			}
		},
		_createLegend: function() {
			console.log("_createLegend");
			var l = this.options.legend;
			if(l.legendLabels.length==0) l.legendLabels = this.options.dataLabels;
			if(this.useCanvas) {
				this._createCanvasLegend();
			}else {
				this._createDomLegend();
			}
		},
		_createDomLegend:function () {
			var l = this.options.legend;			
			console.log("_createDomLegend: length: %d",l.legendLabels.length);			
			var ul = $("<ul style='position:relative; margin:0;'>");	
			if(l.border) ul.css("border","black 1px solid");
			ul.css("padding",this._format("%dpx %dpx %dpx 0px",l.padding,l.padding,l.padding));
			for(var i = 0; i<l.legendLabels.length;i++) {
				if(i!=0 && i.maxColumns != 0 && i%l.maxColumns == 0) {
					ul.append("<br/>");
				}
				var li = $("<li style='list-style:none '/>");				
				if(l.direction=="horizontal") li.css("display", "inline-block");
				//li.css("padding", this._format("0px %dpx", l.textPadding));
				li.css("margin-left", l.padding);
				var box = $("<span class='legend-box' style='border: black 1px solid; display: inline-block;'/>");
				box.css("width", l.colorBoxSize);
				box.css("height", l.colorBoxSize);
				box.css("background-color", this.options.colors[i%this.options.colors.length]);
				box.css("margin", this._format("0px %dpx", l.boxPadding));
				li.append(box);
				var text = $("<span class='legendText'/>");				
				text.html(l.legendLabels[i]);
				text.css("font", l.font);				
				li.append(text);
				ul.append(li);
				
			}
			this.jLegend.append(ul);
			this._calculateLegendSize();
			var self = this;
			if(this.options.legend.scale!=1) { //scalling legend to fix the page.
				var size = l.colorBoxSize * l.scale;
				this.jLegend.find("li").css("margin-left", l.padding*l.scale);
				this.jLegend.find("span.legend-box").each(function() {								
					$(this).css("width", size);
					$(this).css("height", size);
					$(this).css("magine", self._format("0px %dpx", l.boxPadding * l.scale));
				});
				var newFont = "normal " + 12 * l.scale + "px arial";
				this.jLegend.find("span.legendText").css("font", newFont);
			}
			this.jLegend.css('top', this.legendPosition.top);
			this.jLegend.css('left', this.legendPosition.left);			
			console.log("legendPosition: %j", this.legendPosition);
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
				titleHeight = (this.useCanvas) ? this.options.title.fontSize + 2 * this.options.title.padding : this.jTitle.outerHeight();				
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
			if(!this.useCanvas) {
				x += this.wrapperPosition.left;
				y += this.wrapperPosition.top;
			}			
			this.legendPosition = { left: x, top: y, width: width, height: height };
		},
		_calculateLegendWidth:function () {
			console.log("_calculateLegendWidth");
			var l = this.options.legend;
			//this is for Dom legend
			if(this.jLegend) {
				console.log("this.jLegend.width: %d", this.jLegend.width());
				return this.jLegend.width() + l.padding;
			}
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
			if(this.useCanvas) {
				this.context.font = l.font;				
				for(var i = 0; i<l.legendLabels.length;i++) {
					arr.push(this.context.measureText(l.legendLabels[i]).width);
				}	
			}else {
				this.jLegend.find("span.legendText").each(function(index,item) {
					arr.push($(item).width());
				});				
			}
			return arr;
		},
		_calculateLegendHeight:function () {
			console.log("_calculateLegendHeight");
			var l = this.options.legend;
			//calculate for html legend
			if(this.jLegend) {
				var height = this.jLegend.height() + 2 * l.padding;
				console.log("_calculateLegendHeight | height: %d", this.jLegend.height());
				return height;
			}
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
			if (this.useCanvas) {
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
			} else {
				this.jGrid.css("width", this.gridPosition.width);
				this.jGrid.css("height", this.gridPosition.height);
				this.jGrid.css("top", this.gridPosition.top);
				this.jGrid.css("left", this.gridPosition.left);
				if (a.xAxis && a.xAxis.show) this.jGrid.css("border-bottom", "black 1px solid");
				if (a.x2Axis && a.x2Axis.show) this.jGrid.css("border-top", "black 1px solid");
				if (a.yAxis && a.yAxis.show) this.jGrid.css("border-left", "black 1px solid");
				if (a.y2Axis && a.y2Axis.show) this.jGrid.css("border-right", "black 1px solid");
			}
		},
		_calculateGrid: function(isFullWidth) {
			var gridSize = (this.useCanvas) ? this._calculateCanvasGrid() : this._calculateDomGrid();
			//adjust for title and legend.
			var l = this.options.legend;
			if (this.hasTitle) {
				console.log("get it");
				var titleHeight = (this.useCanvas) ? this.options.title.fontSize + 2 * this.options.title.padding : this.jTitle.outerHeight();				
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
			    top = this.useCanvas ? 0 : this.wrapperPosition.top,
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
		_calculateDomGrid:function () {
			//calculate left and width;
			var left = this.wrapperPosition.left;			
			var a = this.options.axes;			
			var xPadding = this.options.xPadding;
			var yPadding = this.options.yPadding;			
			var width = this.wrapperPosition.width;						
			if(this._isHorizontalChart()) {
				var l =  this._isGroupChart() ? this.options.groupLabels : this.options.dataLabels;
				var tmpDiv = $('<div style="position:absolute; min-width:10px;"></div>');				
				for(var i = 0; i< l.length; i++) {
					tmpDiv.append($('<div class="czchart_data_label" style="position:relative">' + l[i] + '</div>'));
				}
				$(document.body).append(tmpDiv);
				var maxLength = tmpDiv.width();
				tmpDiv.remove();
				yPadding += maxLength;
			}
			
			if (a.yAxis.show) {				
				left += yPadding;
				width -= yPadding;
			}
			if (a.y2Axis.show) {
				width -= yPadding;
			}					
			
			// calculate top and height
			var top = this.wrapperPosition.top;			
			var height = this.wrapperPosition.height;
			if (a.xAxis.show){
				height -= xPadding;
			}
			if (a.x2Axis.show) {
				top += xPadding;
				height -= xPadding;
			}
			if(!this._isHorizontalChart()) {
				top += this.options.padding;
			}
			return { top: top, left: left, width: width - this.options.padding, height: height - this.options.padding};
		},
		//this should be used by canvas only.
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
			switch (this.options.type) {
			case "vBar":
				this._calculateVBar();
				break;
			case "hBar":
				this._calculateHBar();
				break;
			case "vGroupBar":
				this._calculateVGroup();
				break;
			case "hGroupBar":
				this._calculateHGroup();
				break;
			case "vStackBar":
				this._calculateVStack();
				break;
			case "hStackBar":
				this._calculateHStack();
				break;
			case "vGroupStackBar":
				this._calculateVGroupStack();
				break;
			case "hGroupStackBar":
				this._calculateHGroupStack();
				break;
			case "pieChart":
				this._calculatePieChart();
				break;	
			default:
				console.error("chart type not definded");
			}
		},		
		/*
		*	Calculate vertical bar chart data
		*/
		_calculateVBar: function() {
			var gridWidth = this._getGridWidth();
			var barWidth = this._calculateBarWidth(this.options.data.length, gridWidth);
			var d = this.options.data;
			var gridHeight = this._getGridHeight();
			var max = this.options.maxValue || Math.max.apply(this, d);
			var unit = this._calculateUnit(max, gridHeight);
			this.chartData = [];
			for (var i = 0; i < d.length; i++) {
				var left = this.options.barSpacing * (i + 1) + i * barWidth,
				    height = d[i] * unit,
				    top = this.gridPosition.height - height - 1, //subtract border;												    
				    width = barWidth;
				this.chartData.push({
					value: d[i],
					label: this.options.dataLabels[i],
					top: top,
					left: left,
					width: width,
					height: height,
					color: this.options.colors[i % this.options.colors.length]
				});
			}
		},
		/*
		* Calculate horizontal bar chart
		*/
		_calculateHBar: function() {
			var gridHeight = this._getGridHeight();
			var barWidth = this._calculateBarWidth(this.options.data.length, gridHeight);
			var d = this.options.data;
			var gridWidth = this._getGridWidth();
			var max = this.options.maxValue || Math.max.apply(this, d);
			var unit = this._calculateUnit(max, gridWidth);
			this.chartData = [];
			for (var i = 0; i < d.length; i++) {
				var left = 0, //to offset the border.
				    height = barWidth,
				    top = this.gridPosition.height - (i + 1) * (this.options.barSpacing + barWidth), //subtract border;
				    width = d[i] * unit;
				this.chartData.push({
					value: d[i],
					label: this.options.dataLabels[i],
					top: top,
					left: left,
					width: width,
					height: height,
					color: this.options.colors[i % this.options.colors.length]
				});
			}
		},
		
		/*
		* Calculate vertical group bar chart
		*/
		_calculateVGroup: function() {
			//console.log("_calculateVGroup");
			var d = this.options.data;
			var total = d.length * d[0].length;
			var barWidth = this._calculateBarWidth(total, this._getGridWidth(), d.length);
			var gridHeight = this._getGridHeight();
			var max = this._maxGroupChart();
			var unit = this._calculateUnit(max, gridHeight);
			this.chartData = [];
			var half = Math.floor(d[0].length / 2);
			for (var i = 0; i < d.length; i++) {
				for (var j = 0; j < d[i].length; j++) {
					var count = i * d[0].length + j + 1,
					    s = this.options.barSpacing,
					    gs = this.options.groupSpacing,
					    left = count*s + i*gs + (count-1)*barWidth,
					    height = d[i][j] * unit,
					    top = this.gridPosition.height - height - 1, //subtract border;												    
					    width = barWidth,
					    groupLabel = j == half ? this.options.groupLabels[i] : "";
					this.chartData.push({
						value: d[i][j],
						groupLabel: groupLabel,
						label: this.options.dataLabels[j],
						top: top,
						left: left,
						width: width,
						height: height,
						color: this.options.colors[j % this.options.colors.length]
					});
				}
			}
		},
		/*
		* Calculate horizontal group bar chart.
		*/
		_calculateHGroup: function() {
			//console.log("_calculateHGroup");
			var d = this.options.data;
			var total = d.length * d[0].length;
			var barWidth = this._calculateBarWidth(total, this._getGridHeight(), d.length);
			var gridWidth = this._getGridWidth();
			var max = this._maxGroupChart();
			var unit = this._calculateUnit(max, gridWidth);
			this.chartData = [];
			var half = Math.floor(d[0].length / 2);
			for (var i = 0; i < d.length; i++) {
				for (var j = 0; j < d[0].length; j++) {
					var count = i * d[0].length + j + 1,
					    left = 0, // consider magin//, //+i for extra spacing between each group
					    height = barWidth, //,
					    s = this.options.barSpacing,
					    gs = this.options.groupSpacing,
					    top = this.gridPosition.height - (count*s + i*gs + count*barWidth), //subtract border;						
					    width = d[i][j] * unit,
					    groupLabel = j == half ? this.options.groupLabels[i] : "";
					this.chartData.push({
						value: d[i][j],
						groupLabel: groupLabel,
						label: this.options.dataLabels[j],
						top: top,
						left: left,
						width: width,
						height: height,
						color: this.options.colors[j % this.options.colors.length]
					});
				}
			}
		},
		/*
		* maxGroupChart
		*/
		_maxGroupChart:function () {
			var d = this.options.data;
			var max = 0;
			if(this.options.maxValue) {
				max = this.options.maxValue;
			}else {
				for (var i = 0; i < d.length; i++) {
					var m = Math.max.apply(this, d[i]);
					if (m > max) max = m;
				}					
			}
			return max;
		},
		/*
		* Calculate vertical stacking bar chart.
		*/
		_calculateVStack: function() {
			//console.log("_calculateVStack");
			var d = this.options.data;
			var total = d.length;
			var barWidth = this._calculateBarWidth(total, this._getGridWidth());
			var gridHeight = this._getGridHeight();
			var max = this._maxStackChart();		
			var unit = this._calculateUnit(max, gridHeight);
			this.chartData = [];
			for (var i = 0; i < d.length; i++) {
				var left = this.options.barSpacing * (i + 1) + i * barWidth,
				    width = barWidth,
				    lastHeight = 0,
				    sum = 0;
				for (var j = 0; j < d[i].length; j++) {
					sum += d[i][j];
					var height = d[i][j] * unit,
					    top = this.gridPosition.height - height - lastHeight - 1, //subtract border;
					    groupLabel = j == 0 ? this.options.groupLabels[i] : "",
					    sumVal = j == d[i].length - 1 ? sum : "";					
					this.chartData.push({
						value: d[i][j],
						sum: sumVal,
						groupLabel: groupLabel,
						label: this.options.dataLabels[i],
						top: top,
						left: left,
						width: width,
						height: height,
						color: this.options.colors[j % this.options.colors.length]
					});
					lastHeight += height;
				}

			}
		},
		/*
		*	Calculate horizontal stacking bar chart.
		*/
		_calculateHStack: function() {
			//console.log("_calculateVStack");
			var d = this.options.data;
			var total = d.length;
			var barWidth = this._calculateBarWidth(total, this._getGridHeight());			
			var max = this._maxStackChart();
			var unit = this._calculateUnit(max, this._getGridWidth());
			this.chartData = [];
			for (var i = 0; i < d.length; i++) {
				var top = this.gridPosition.height - (i + 1) * (this.options.barSpacing + barWidth), //subtract border;
				    height = barWidth,
				    lastWidth = 0,
				    sum = 0;
				for (var j = 0; j < d[i].length; j++) {
					sum += d[i][j];
					var left = lastWidth,
					    width = d[i][j] * unit,
					    groupLabel = j == 0 ? this.options.groupLabels[i] : "",
					    sumVal = j == d[i].length - 1 ? sum : "";					
					this.chartData.push({
						value: d[i][j],
						sum: sumVal,
						groupLabel: groupLabel,
						label: this.options.dataLabels[i],
						top: top,
						left: left,
						width: width,
						height: height,
						color: this.options.colors[j % this.options.colors.length]
					});
					lastWidth += width;
				}

			}
		},
		/*
		* Calculate vertical stacking bar chart.
		*/
		_calculateVGroupStack: function() {
			//console.log("_calculateVGroupStack");
			var d = this.options.data;
			var totalBarCount = d.length*d[0].length;
			var groupCount = d.length;
			var barWidth = this._calculateBarWidth(totalBarCount, this._getGridWidth(), groupCount);
			var gridHeight = this._getGridHeight();
			var max = this._maxGroupStackChart();		
			var unit = this._calculateUnit(max, gridHeight);
			this.chartData = [];
			for (var i = 0; i < d.length; i++) {//group				
				for (var j = 0; j < d[0].length; j++) {
					var s = this.options.barSpacing,
					    gs = this.options.groupSpacing,
					    barCount = d[0].length*i+j+1,
						left = s*barCount + i*gs + (barCount-1)*barWidth,
						width = barWidth,
						lastHeight = 0,
						sum = 0;
					for(var k = 0; k< d[0][0].length; k++){
						sum += d[i][j][k];
						var height = d[i][j][k] * unit,
						    top = this.gridPosition.height - height - lastHeight -1, //subtract border;
						    groupLabel = (j == Math.floor(d[0].length/2) && k==0) ? this.options.groupLabels[i] : "",
						    sumVal = k == d[i][j].length - 1 ? sum : "";					
						this.chartData.push({
							value: d[i][j][k],
							sum: sumVal,
							groupLabel: groupLabel,
							label: this.options.dataLabels[k],
							top: top,
							left: left,
							width: width,
							height: height,
							color: this.options.colors[k % this.options.colors.length]
						});
						lastHeight += height;	
					}					
				}

			}
		},
		/*
		*	Calculate horizontal stacking bar chart.
		*/
		_calculateHGroupStack: function() {
			//console.log("_calculateHGroupStack");
			var d = this.options.data;
			var totalBarCount = d.length*d[0].length;
			var groupCount = d.length;			
			var barWidth = this._calculateBarWidth(totalBarCount, this._getGridHeight(), groupCount);			
			var max = this._maxGroupStackChart();
			var unit = this._calculateUnit(max, this._getGridWidth());
			this.chartData = [];
			for (var i = 0; i < d.length; i++) {//group				
				for (var j = 0; j < d[0].length; j++) {
					var s = this.options.barSpacing,
					    gs = this.options.groupSpacing,
					    barCount = d[0].length * i + j + 1,
					    top = this.gridPosition.height - (barCount * s + i * gs + (barCount) * barWidth),
					    height = barWidth,
					    lastWidth = 0,
					    sum = 0;
					for (var k = 0; k < d[0][0].length; k++) {
						sum += d[i][j][k];
						var left = lastWidth,
						    width = d[i][j][k] * unit,
						    groupLabel = (j == Math.floor(d[0].length/2) && k==0) ? this.options.groupLabels[i] : "",
						    sumVal = k == d[i][j].length - 1 ? sum : "";
						this.chartData.push({
							value: d[i][j][k],
							sum: sumVal,
							groupLabel: groupLabel,
							label: this.options.dataLabels[k],
							top: top,
							left: left,
							width: width,
							height: height,
							color: this.options.colors[k % this.options.colors.length]
						});
						lastWidth += width;
					}
				}
			}
		},
		/*
		*	Calculate vertical bar chart data
		*/
		_calculatePieChart: function() {
			var gridWidth = this.gridPosition.width;			
			var gridHeight = this.gridPosition.height;
			var diameter = gridWidth > gridHeight ? gridHeight : gridWidth;
			var piePadding = 20;
			var radius = this.options.pieChart.radius ? this.options.pieChart.radius : diameter/2 - piePadding;
			var x = this.gridPosition.left + gridWidth/2;
			var y = this.gridPosition.top + gridHeight/2;
			var center = {x:x, y:y}; 
			var d = this.options.data;
			var sum = 0;
			for(var i=0;i<d.length;i++){
				sum += d[i];
			}
			this.chartData = [];	
			var endAngle = -this.options.pieChart.startAngle*Math.PI/180;
			for (var i = 0; i < d.length; i++) {
				var startAngle = endAngle,
					angle = d[i]*2*Math.PI/sum,
					endAngle = startAngle + angle;				
				this.chartData.push({
					value: d[i],
					label: this.options.dataLabels[i],
					center: center,
					radius: radius,
					startAngle: startAngle,
					endAngle: endAngle,
					color: this.options.colors[i % this.options.colors.length]
				});
			}
		},
		/*
		* maxStackChart
		*/
		_maxStackChart:function () {
			var d = this.options.data;
			var max = 0;
			if(this.options.maxValue) {
				max = this.options.maxValue;
			}else {
				for (var i = 0; i < d.length; i++) {
					var sum = 0;
					for (var j = 0; j < d[i].length; j++) {
						sum += d[i][j];
					}
					//console.log("sum: %d", sum);
					if (sum > max) max = sum;
				}			
			}
			return max;
		},
		/*
		* maxGroupStackChart
		*/
		_maxGroupStackChart:function () {
			//console.log("_maxGroupStackChart");
			var d = this.options.data;
			var max = 0;
			if(this.options.maxValue) {
				max = this.options.maxValue;
			}else {
				for (var i = 0; i < d.length; i++) {
					var sum=0;
					for (var j = 0; j < d[0].length; j++) {
						sum = 0;
						for(var k=0;k<d[0][0].length;k++){							
							sum += d[i][j][k];	
						}
						if (sum > max) max = sum;	
					}
					//console.log("sum: %d", sum);					
				}			
			}
			//console.log("max: %d", max);
			return max;			
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
					if (this.useCanvas) {
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
					} else {
						this.jGrid.append(this._format('<div class="czchart_v_grid_line" style="position: absolute; top: 0px; left: %dpx; width: 0px; height: %dpx;"></div>',
							left, this.gridPosition.height));

						if (this.options.axes.xAxis.show) {
							var index = $(this._format('<div class="czchart_grid_value"  style="position:absolute;" >%s</div>', val));
							this.jGrid.append(index);
							index.css("top", top);
							index.css("left", left - index.outerWidth() / 2);
						}
						if (this.options.axes.x2Axis.show) {
							var index = $(this._format('<div class="czchart_grid_value" style="position:absolute;" >%s</div>', val));
							this.jGrid.append(index);
							index.css("top", -index.outerHeight() - 3);
							index.css("left", left - index.outerWidth() / 2);
						}
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
					if (this.useCanvas) {
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
					} else {
						this.jGrid.append(this._format('<div class="czchart_h_grid_line" style="position: absolute; top: %dpx; left: 0px; width: %dpx; height: 0px;"></div>',
							top, this.gridPosition.width));
						if (this.options.axes.yAxis.show) {
							var index = $(this._format('<div class="czchart_grid_value"  style="position:absolute;">%s</div>', val));
							this.jGrid.append(index);
							index.css("top", top - index.outerHeight() / 2);
							index.css("left", -index.outerWidth() - 3);
						}
						if (this.options.axes.y2Axis.show) {
							var index = $(this._format('<div class="czchart_grid_value" style="position:absolute;">%s</div>', val));
							this.jGrid.append(index);
							index.css("top", top - index.outerHeight() / 2);
							index.css("left", this.gridPosition.width + 3);
						}
					}
				}
			}

		},
		
		/*========================== Drawing Chart ======================================*/
		//draw each bar base on the color caculated width height/ separate this so that if we want to use canvas for richer chart we can.
		drawChart: function() {
			//console.log("this.chartData: %j", this.chartData);
			for (var i = 0; i < this.chartData.length; i++) {
				if (this.useCanvas) {
					if(this.options.type=="pieChart"){
						this._renderPieChart(this.chartData[i]);
					}else{
						this._renderBarChart(this.chartData[i]);	
					}					
				} else {
					this._renderDomChart(this.chartData[i]);
				}
			}
		},
		_renderDomChart: function(b) {
			if(this.options.type=="pieChart"){
				console.error("pie chart not available without canvas");
				return;
			}
			this.jGrid.append(this._format('<div class="czchart_bar" style="position: abolute; width: %dpx; height: %dpx; top: %dpx; left: %dpx; background-color: %s"></div>',
				b.width, b.height, b.top, b.left, b.color));
			//try to move calculation logic to calculate function.
			if (this._isHorizontalChart()) {
				if (this.options.showDataValues) {
					var value = this.options.type == "hStackBar" ? b.sum : b.value;
					var val = $(this._format('<div class="czchart_data_value"  style="position:absolute;">%s</div>', value));
					this.jGrid.append(val);
					val.css("top", b.top + (b.height - val.outerHeight()) / 2);
					val.css("left", b.left + b.width + val.outerWidth());
				}
				if (this.options.showDataLabels) {
					var labelVal = (this._isGroupChart() && this.options.showGroupLabels) ? b.groupLabel : b.label;
					if (!labelVal) return;
					var label = $(this._format('<div class="czchart_data_label" style="position:absolute;">%s</div>', labelVal));
					this.jGrid.append(label);
					label.css("left", b.left - label.outerWidth() - 3);
					label.css("top", b.top + (b.height - label.outerHeight()) / 2);
				}
			} else {
				if (this.options.showDataValues) {
					var value = this.options.type == "vStackBar" ? b.sum : b.value;
					var val = $(this._format('<div class="czchart_data_value" style="position:absolute;">%s</div>', value));
					this.jGrid.append(val);
					val.css("top", b.top - val.outerHeight() - 3);
					val.css("left", b.left + (b.width - val.outerWidth()) / 2);
				}
				if (this.options.showDataLabels) {
					var labelVal = (this._isGroupChart() && this.options.showGroupLabels) ? b.groupLabel : b.label;
					if (!labelVal) return;
					var label = $(this._format('<div class="czchart_data_label" style="position:absolute;">%s</div>', labelVal));
					this.jGrid.append(label);
					label.css("left", b.left + (b.width - label.outerWidth()) / 2);
					label.css("top", b.top + b.height + 3);
				}
			}
		},		
		_renderPieChart:function(p){
			console.log("_renderPieChart: %j",p);
			var pChart = this.options.pieChart;
			this._drawPie(p.center.x,p.center.y,p.radius,p.startAngle,p.endAngle,p.color);
			var angle = (p.endAngle + p.startAngle)/2;
			if(pChart.valuePosition == "outside"){				
				var text = p.value + " - " + p.label;
				this._showPieValueOutSide(p.center.x,p.center.y,p.radius,angle,text);
			}else{//value inside and show legend.
				var diffAngle = Math.abs(p.startAngle - p.endAngle);
				if(diffAngle < Math.PI*pChart.minAngleForValue/180){
					this._showPieValueOutSide(p.center.x,p.center.y,p.radius,angle,p.value);
				}else{
					this._showPieValueInside(p.center.x,p.center.y,p.radius,angle,p.value);	
				}
								
			}			
		},
		_showPieValueInside:function(x,y,radius,angle,text){
			this.context.save();			
			this.context.beginPath();
			this.context.translate(x,y);
			this.context.rotate(angle);
			this.context.translate(radius*2/3,0);						
			var align = (angle>=-Math.PI/2 && angle <= Math.PI/2) ? "left" :"right";
			this.context.textAlign = align;
			this.context.textBaseline = "middle";
			//var padding = (angle>=-Math.PI/2 && angle <= Math.PI/2) ? 3 : -3;
			this.context.rotate(-angle);
			this.context.fillText(text,0,0);
			this.context.restore();
		},
		_showPieValueOutSide:function(x,y,radius,angle,text){
			console.log("_showPieValue: %j",arguments);
			var spacing = 1.1*radius;
			this.context.save();			
			this.context.beginPath();
			this.context.translate(x,y);
			this.context.rotate(angle);
			this.context.moveTo(radius*2/3,0);
			this.context.lineTo(spacing,0);
			this.context.translate(spacing,0);
			this.context.rotate(-angle);
			var hLine = (angle>=-Math.PI/2 && angle <= Math.PI/2) ? 30 : -30;
			this.context.lineTo(hLine,0);
			this.context.strokeStyle = "black",
			this.lineWidth = 1;
			this.context.stroke();
			// adding label.
			this.context.beginPath();			
			var align = (angle>=-Math.PI/2 && angle <= Math.PI/2) ? "left" :"right";
			this.context.textAlign = align;
			this.context.textBaseline = "middle";
			var padding = (angle>=-Math.PI/2 && angle <= Math.PI/2) ? 3 : -3;
			this.context.fillText(text,hLine + padding,0);
			this.context.restore();
		},
		_drawPie:function(x,y,radius,start,end,color){
			console.log("_drawPie: %j",arguments);
			var pChart = this.options.pieChart;
			var w = pChart.lineWidth;			
			this.context.save();			
			this.context.beginPath();
			this._drawSegmentLine(x,y,radius-w,start);
			this.context.arc(x,y,radius-w,start,end);
			this.context.closePath();
			this.context.fillStyle = color;
			this.context.lineJoin = "bevel";
			this.context.fill();
			this._applyPieGradient(x,y,radius,start,end,color);
			this.context.restore();
			//adding lines			
			this.context.save();
			this.context.beginPath();
			this.context.strokeStyle = pChart.lineColor;
			this._drawSegmentLine(x,y,radius,start);
			this.context.moveTo(x,y);
			this._drawSegmentLine(x,y,radius,end);
			this.context.lineWidth = w;			
			this.context.stroke();			
			this.context.restore();
		},
		_drawSegmentLine:function(x,y,r,angle){
			this.context.save();			
			this.context.translate(x,y);
			this.context.rotate(angle);
			this.context.moveTo(0,0);
			this.context.lineTo(r,0);
			this.context.restore();
		},
		_applyPieGradient: function(x, y, radius,start,end,color) {
			this.context.beginPath();
			var grd = this.context.createRadialGradient(x, y, .9*radius, x, y, radius*1.1);
			grd.addColorStop(0, color);
			grd.addColorStop(1, "white");
			this._drawSegmentLine(x,y,radius,start);
			this.context.arc(x,y,radius,start,end);
			this.context.closePath();			
			this.context.globalAlpha = 0.5;
			this.context.fillStyle = grd;
			this.context.fill();
		},
		_renderBarChart:function(b){
			var x0 = this.gridPosition.left + b.left + 1,
			    y0 = this.gridPosition.top + b.top;
			this._drawBar(x0, y0, b.width, b.height, b.color);
			if (this._isHorizontalChart()) {
				this.context.textBaseline = "middle";
				if (this.options.showDataValues) {
					var t = this.options.type,
						value = (t == "hStackBar" || t=="hGroupStackBar") ? b.sum : b.value;
					var effectAdjust = (this.options.addEffect) ? this._getShadowWidth(b.height)/2 : 0,
						x = x0 + b.width + 3,
					    y = y0 + b.height / 2 + effectAdjust;
					this._addText(x, y, value, {font:this.options.labelFont});
				}
				if (this.options.showDataLabels) {
					var x = x0 - 3,
					    y = y0 + b.height / 2,
					    angle = this.options.labelAngle,
						align = this.options.axes.yAxis.show ? "right" : "left",
						label = (this._isGroupChart() && this.options.showGroupLabels) ? b.groupLabel : b.label;					
					this._addText(x, y, label,{align:align,angle:angle, font: this.options.labelFont});
				}
			} else {
				if (this.options.showDataValues) {
					var t = this.options.type,
						value = (t == "vStackBar" || t == "vGroupStackBar") ? b.sum : b.value;
					var effectAdjust = (this.options.addEffect) ? this._getShadowWidth(b.width)/2 : 0,
						x = x0 + b.width / 2 - effectAdjust,
					    y = y0 - 3;
					this._addText(x, y, value, {align:"center", font:this.options.labelFont});
				}
				if (this.options.showDataLabels) {
					var x = x0 + b.width / 2,
					    y = y0 + b.height+5,
						angle = this.options.labelAngle,
						align = angle === 0 ? "center" : angle > 0 ? "right" : "left",
						label = (this._isGroupChart() && this.options.showGroupLabels) ? b.groupLabel : b.label;					
					this._addText(x, y, label, {align:align,angle:angle,vAlign:"top", font:this.options.labelFont});
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
		_drawBar: function(x, y, width, height, color) {
			//console.log("drawBar %j", arguments);		
			if(!width || !height) return;
			this.context.save();
			this.context.beginPath();						
			this.context.fillStyle = color;	
			this.context.strokeStyle = "black";			
			this.context.lineWidth = 1;
			
			//adjust size for no stroke.
			if(!this.options.showStroke) {
				if (this._isHorizontalChart()) {
					x -= 1;					
				}else {
					y += 1;
				}												
			}
			if(this.options.addEffect) {		
				if (this._isHorizontalChart()) {										
					var shadowWidth = this._getShadowWidth(height);
					this.context.shadowOffsetY = shadowWidth;
					this.context.rect(x, y, width, height - shadowWidth);
				} else {										
					var shadowWidth = this._getShadowWidth(width);
					this.context.shadowOffsetX = shadowWidth;
					this.context.rect(x, y, width - shadowWidth, height);
				}
				this.context.shadowBlur = shadowWidth;
				this.context.shadowColor = "grey";							
				this.context.fill();											
				this._applyGradient(x, y, width, height, color, shadowWidth);
			}else {									
				this.context.rect(x, y, width, height);
				this.context.fill();								
			}			
			if(this.options.showStroke) {					
				this.context.stroke();
			}
			this.context.restore();
		},
		_getShadowWidth:function(width) {
			var tmp = Math.floor((width - this.options.shadow) / 2);
			var shadowWidth = this.options.shadow < tmp ? this.options.shadow : tmp;
			return shadowWidth;
		},
		_applyGradient: function(x, y, width, height, color, shadowWidth) {
			//console.log("_applyGradient: %j",arguments);
			this.context.beginPath();
			if (this._isHorizontalChart()) {
				this.context.rect(x, y, width, height - shadowWidth);
				var grd = this.context.createLinearGradient(x, y - 10, x, y + height + 10);
				grd.addColorStop(0.4, "#fff");
			} else {
				this.context.rect(x, y, width - shadowWidth, height);
				var grd = this.context.createLinearGradient(x - 10, y, x + width + 10, y);
				grd.addColorStop(0.4, "#fff");
			}
			grd.addColorStop(0, color);
			grd.addColorStop(1, color);
			this.context.globalAlpha = 0.4;
			this.context.fillStyle = grd;
			this.context.fill();
		},
		//add mouse event handler for chart to create interative. Not now.
		attachEvent: function() {
			//console.log("attachEvent not implement yet");
		}
	};	
})(jQuery);