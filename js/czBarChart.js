/**
* Copyright © Cenzic, Inc. 2004-2013
* Author: Quoc Quach
* Email: quoc_cooc@yahoo.com
* Released under the MIT license
* Date: 10/29/2013
*/
(function($){
	if($.czChart == undefined){
		console.error("czBarChart depended on czChart");
		return;
	}	
	var barChart = {
		/**
		 * type of chart will be render when user call. Array of all types that the plugin able to handle.
		 */
		types: ['vBar','vBar', 'hBar', 'vGroupBar', 'hGroupBar', 'vStackBar', 'hStackBar', 'vGroupStackBar', 'hGroupStackBar'],
		/**
		 * set default options for a new chart type Chart.
		 */
		defaultOptions:{},
		/**
		 * called during initializing process with the czChartObject context.
		 */
		init: function(){},
		/**
		 * Calculate data before rendering
		 */
		processData: function(){
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
			}	
		},
		/**
		 * render pie chart on the canvas
		 */
		render: function(b){
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
		/**
		 * share function among all chart object. Corresponse to the prototype of a function (class).
		 * to use the properties of the object.
		 */
		prototype: {
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
				grd.addColorStop(0, "black");
				grd.addColorStop(1, color);
				this.context.globalAlpha = 0.25;
				this.context.fillStyle = grd;
				this.context.fill();
			}
		}
	};
	$.czChart.extend(barChart);
	
})(jQuery);