/**
* Copyright © Cenzic, Inc. 2004-2013
* Author: Quoc Quach
* Email: quoc_cooc@yahoo.com
* Released under the MIT license
* Date: 10/29/2013
*/
(function($){
	if($.czChart == undefined){
		console.error("czInterfaceChart depended on czChart");
		return;
	}	
	var interfaceChart = {
		/**
		 * type of chart will be render when user call. Array of all types that the plugin able to handle.
		 */
		types: ["newTypeChart"],
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
		processData: function(){},
		/**
		 * render pie chart on the canvas
		 */
		render: function(p){},
		/**
		 * share function among all chart object. Corresponse to the prototype of a function (class).
		 * to use the properties of the object.
		 */
		prototype: {}
	};
	$.czChart.extend(interfaceChart);
	
})(jQuery);