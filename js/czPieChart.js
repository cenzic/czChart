/**
* Copyright © Cenzic, Inc. 2004-2013
* Author: Quoc Quach
* Email: quoc_cooc@yahoo.com
* Released under the MIT license
* Date: 10/29/2013
*/
(function($){
	if($.czChart == undefined){
		console.error("czPieChart depended on czChart");
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
				minAngleForValue:10//if angle < 10 degree, the value will be place outside the pie.	
			}
		},
		/**
		 * called during initializing process with the czChartObject context.
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
			console.log("this.options.pieChart: %d", JSON.stringify(this.options.pieChart));
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
		render: function(p){
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
		/**
		 * share function among all chart object. Corresponse to the prototype of a function (class).
		 * to use the properties of the object.
		 */
		prototype: {
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
			_drawSegmentLine:function(x,y,r,angle){
				this.context.save();			
				this.context.translate(x,y);
				this.context.rotate(angle);
				this.context.moveTo(0,0);
				this.context.lineTo(r,0);
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
		}
	};		
	
	$.czChart.extend(pieChart);
	
})(jQuery);