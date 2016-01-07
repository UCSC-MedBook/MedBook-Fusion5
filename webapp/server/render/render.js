var jsdom, serializeDocument;

Meteor.startup(function() {
    jsdom = Meteor.npmRequire("node-jsdom");
    serializeDocument = jsdom.serializeDocument;
});
// var d3 = Meteor.npmRequire("d3");
var htmlStub = '<html><head></head><body><div id="dataviz-container"></div><script src="js/d3.v3.min.js"></script></body></html>';


ChartTypeMap = {
  "Bar Chart" : "GoogleChart",        // client side render
  "Box Plot" : D3BoxPlot,             // server side render
  "Scatter Chart" : "makeD3Scatter",  // client side render
  "Table" : "makeHandsontable"        // client side render
}

// use FusionFeatures collection to communicate from server to client
SyncChartTypesWithFusionFeaturesDB = function() {
  Collections.FusionFeatures.upsert({name: "ChartTypes"}, {$set: {value:  Object.keys(ChartTypeMap).sort()}});
}

Meteor.startup(SyncChartTypesWithFusionFeaturesDB);

renderJSdom = function(ChartDocument) {
    var chartType = ChartDocument.pivotTableConfig.rendererName;
    var qqq = ChartTypeMap[chartType];
    if (typeof(qqq) == 'function') {
	var start = new Date();
	    jsdom.env(htmlStub,  {
		done : function(errors, window) {
		    jquery_bind(window);
		    var html = qqq(window, ChartDocument, null, []);
		    html = html ? 
		    	(typeof(html) == "string" 
			    ? html
			    : serializeDocument(html))
			: "<bold>Bug in Charts " + chartType + " " + ChartDocument._id +"</bold>";
		    Fiber(function(){
		        Charts.direct.update({_id: ChartDocument._id}, {$set: {html: html}});
		    }).run();
		}
	    }) // end jsdom.env
	var stop = new Date();
	console.log(ChartDocument._id, "stop - start", stop-start);
	return "";
    } else {
	return qqq;
    }
}
