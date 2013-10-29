/**
* Copyright © Quoc Quach 2013-2014
* Author: Quoc Quach
* Email: quoc_cooc@yahoo.com
* Released under the MIT license
* Date: 10/29/2013
*/
(function($){
  if($.jChart == undefined){
    console.error("jIChart depended on jChart");
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
     * called during initializing process with the jChartObject context.
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
  $.jChart.extend(interfaceChart);

})(jQuery);