
var jsdom = Meteor.npmRequire("node-jsdom");
var serializeDocument = jsdom.serializeDocument;

// var d3 = Meteor.npmRequire("d3");
var htmlStub = '<html><head></head><body><div id="dataviz-container"></div><script src="js/d3.v3.min.js"></script></body></html>';


ChartTypeMap = {
  "Box Plot" : D3BoxPlot,
  "Scatter Chart" : D3ScatterChart,
  "Bar Chart" : C3BarChart,
   
}


renderJSdom = function(ChartDocument) {
    var start = new Date();
    jsdom.env(htmlStub,  {
	done : function(errors, window) {
	    jquery_bind(window);
	    var plot = null ;

	    var chartType = ChartDocument.pivotTableConfig.rendererName;
	    if (chartType in ChartTypeMap) 
		plot = (ChartTypeMap[chartType])(window, ChartDocument, null, []);

	    var html = plot ? serializeDocument(plot) : "<bold>Bug in Charts " + chartType + " " + ChartDocument._id +"</bold>";

	    Fiber(function(){
	      Charts.update({_id: ChartDocument._id}, {$set: {html: html}});
	    }).run();
	}
    }) // end jsdom.env
    var stop = new Date();
    console.log(ChartDocument._id, "stop - start", stop-start);
}
