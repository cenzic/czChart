/**
* Copyright © Quoc Quach 2013-2014
* Author: Quoc Quach
* Email: quoc_cooc@yahoo.com
* Released under the MIT license
* Date: 10/29/2013
*/
(function($){
	if($.jChart == undefined){
		console.error("jPieChart depended on jChart");
		return;
	}
	
	var pieChart = {
		/**
		 * type of chart will be render when user call.
		 */
		types: ["pieChart"],
		/**
		 * set default options for pieChart.
		 */
		defaultOptions:{
			pieChart:{
				startAngle: 90,
				//clockwise:true,//clockwise couter clockwise
				lineWidth:3,
				lineColor:"#333",
				radius: 0,
				//value and label show outside close to the pie.
				valuePosition:"outside",//if show inside, the value will be inside and legend will be added. 
				minAngleForValue:10,//if angle < 10 degree, the value will be place outside the pie.	
				gap: 0, //gap degree between two pies
				background: "black",
				shadow: 5
			}
		},
		/**
		 * called during initializing process with the jChartObject context.
		 */
		init: function(){
			if(this.options.type=="pieChart"){
				var a = this.options.axes;
				a.xAxis.show = false;
				a.x2Axis.show = false;
				a.yAxis.show = false;
				a.y2Axis.show = false;
				this.options.legend.showLegend = this.options.pieChart.valuePosition == "inside";				
			}
		},		
		/**
		 * Calculate data before rendering
		 */
		processData: function(){			
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
			//console.log("this.options.pieChart: %d", JSON.stringify(this.options.pieChart));
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
		/**
		 * render pie chart on the canvas
		 */
		render: function(p,i){			
			if(this.background == undefined) {
				this.background = true;
				this._renderBackground(p.center.x,p.center.y,p.radius);
			}
			if(this.options.interactive){
				this._renderInteractivePie(p.center.x,p.center.y,p.radius,p.startAngle,p.endAngle,p.color, i, p);
			}else{
				this._renderStaticPie(p.center.x,p.center.y,p.radius,p.startAngle,p.endAngle,p.color);
			}	
			this._showLable(p);
		},		
		/**
		 * share function among all chart object. Corresponse to the prototype of a function (class).
		 * to use the properties of the object.
		 */
		prototype: {
			_showLable:function(p){
				var pChart = this.options.pieChart;
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
				//console.log("_showPieValue: %j",arguments);
				var spacing = 1.1*radius;
				this.context.save();			
				this.context.beginPath();
				this.context.translate(x,y);
				this.context.rotate(angle);
				this.context.moveTo(radius*2/3,0);
				this.context.lineTo(radius,0);
				if(this.showed==undefined){
					this.context.lineTo(spacing,0);
					this.context.translate(spacing,0);
					this.context.rotate(-angle);
					var hLine = (angle>=-Math.PI/2 && angle <= Math.PI/2) ? 30 : -30;
					this.context.lineTo(hLine,0);					
				}
				this.context.strokeStyle = "black",
				this.lineWidth = 1;
				this.context.stroke();
				if(this.showed==undefined){
					// adding label.
					this.context.beginPath();			
					var align = (angle>=-Math.PI/2 && angle <= Math.PI/2) ? "left" :"right";
					this.context.textAlign = align;
					this.context.textBaseline = "middle";
					var padding = (angle>=-Math.PI/2 && angle <= Math.PI/2) ? 3 : -3;
					this.context.fillText(text,hLine + padding,0);	
					this.showed = true;
				}											
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
			_renderInteractivePie: function(x, y, radius, start, end, color, i, p){
				var opts = this.options.pieChart;				
				var pie = this.iCanvas.pie(x, y, radius, start*180/Math.PI + opts.gap/2, end*180/Math.PI- opts.gap/2, {fillStyle: color, gradientLayer: true});
				pie.index = i;
				var self = this;
				pie.change(function(){
					self._showLable(p);
				});
				if (this.interactiveObjects == undefined) this.interactiveObjects = [];
				this.interactiveObjects[i] = pie;
				this.attachEvent(pie);
			},
			_renderStaticPie: function(x, y, radius, start, end, color){
				console.log("_drawPie: %j",arguments);								
				var pChart = this.options.pieChart;
				var gap = pChart.gap*Math.PI/360; 
				start += gap;
				end -= gap;
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
				/*
				this.context.save();
				this.context.beginPath();
				this.context.strokeStyle = pChart.lineColor;
				this._drawSegmentLine(x,y,radius,start);
				this.context.moveTo(x,y);
				this._drawSegmentLine(x,y,radius,end);
				this.context.lineWidth = w;			
				this.context.stroke();			
				this.context.restore();				
				*/
			},
			_renderBackground: function(x,y,radius){
				var opts = this.options.pieChart;
				this.context.save();			
				this.context.beginPath();
				this.context.arc(x,y,radius,0,2*Math.PI);
				this.context.fillStyle = opts.background;
				this.context.shadowColor = "black";
				this.context.shadowBlur = opts.shadow;			
				this.context.shadowOffsetX = opts.shadow;
				this.context.shadowOffsetY = opts.shadow;
				this.context.fill();
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
			}
		}
	};		
	
	$.jChart.extend(pieChart);
	
})(jQuery);