
var jsdom = Meteor.npmRequire("node-jsdom");
var serializeDocument = jsdom.serializeDocument;

// var d3 = Meteor.npmRequire("d3");
var htmlStub = '<html><head></head><body><div id="dataviz-container"></div><script src="js/d3.v3.min.js"></script></body></html>';


ChartTypeMap = {
  "Box Plot" : D3BoxPlot,
  "Scatter Chart" : D3ScatterChart,
  "R Bar Chart" : R_Bar_Chart,
  "C3 Bar Chart" : C3_Bar_Chart,
  "Google Bar Chart" : "GoogleChart",
}

Meteor.startup(function() {
  // use FusionFeatures colleciton to communicate from server to client. Someday, we will make it so that users can add new ChartTypes on the fly.
  Collections.FusionFeatures.upsert({name: "ChartTypes"}, {$set: {value: Object.keys(ChartTypeMap).sort()}});
});

renderJSdom = function(ChartDocument) {
    var chartType = ChartDocument.pivotTableConfig.rendererName;
    var qqq = ChartTypeMap[chartType];
    if (typeof(qqq) == 'function') {
	var start = new Date();
	    jsdom.env(htmlStub,  {
		done : function(errors, window) {
		    jquery_bind(window);
		    var plot = qqq(window, ChartDocument, null, []);
		    var html = plot ? serializeDocument(plot) : "<bold>Bug in Charts " + chartType + " " + ChartDocument._id +"</bold>";
		    Fiber(function(){
		        Charts.direct.update({_id: ChartDocument._id}, {$set: {html: html}});
		    }).run();
		}
	    }) // end jsdom.env
	var stop = new Date();
	console.log(ChartDocument._id, "stop - start", stop-start);
    } else {
	Charts.direct.update({_id: ChartDocument._id}, {$set: {html: qqq}});
    }
}
