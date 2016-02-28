var jsdom, serializeDocument;

Meteor.startup(function() {
    jsdom = Meteor.npmRequire("node-jsdom");
    serializeDocument = jsdom.serializeDocument;
});
// var d3 = Meteor.npmRequire("d3");
var htmlStub = '<html><head></head><body><div id="dataviz-container"></div><script src="js/d3.v3.min.js"></script></body></html>';

/*
Type 1: client side render, just return the string
Type 2: call the function and return the value
Type 3: call the function with asynchronously using jsdom 
*/

ChartTypeMap = {
  "Landscape" :      { type: 3, func: D3Landscape},
  "Bar Chart" :      { type: 1, client: "GoogleChart"},
  "Elapsed" :        { type: 2, func: makeD3Elapsed},
  "Box Plot" :       { type: 3, func: D3BoxPlot },
  "Scatter Chart" :  { type: 1, client: "makeD3Scatter"},
  "Table" :          { type: 1, client: "makeHandsontable"},
}

// use FusionFeatures collection to communicate from server to client
SyncChartTypesWithFusionFeaturesDB = function() {
  Collections.FusionFeatures.upsert({name: "ChartTypes"}, {$set: {value:  Object.keys(ChartTypeMap).sort()}});
}


Meteor.startup(SyncChartTypesWithFusionFeaturesDB);

renderJSdom = function(ChartDocument) {
    var chartType = ChartDocument.pivotTableConfig.rendererName;
    console.log("chartType", chartType);

    if (chartType == null) 
	chartType = "Table";

    var ct = ChartTypeMap[chartType];
    switch (ct.type) {

    case 1: return ct.client;

    case 2: return ct.func(null, ChartDocument, null, []);

    case 3: jsdom.env(htmlStub,  {
		done : function(errors, window) {
		    Fiber(function(){
			jquery_bind(window);
			var html = ct.func(window, ChartDocument, null, []);
			html = html ? 
			    (typeof(html) == "string" 
				? html
				: serializeDocument(html))
			    : "<bold>Bug in Charts " + chartType + " " + ChartDocument._id +"</bold>";
			    // console.log("updating html", html);
		        Charts.update({_id: ChartDocument._id}, {$set: {html: html}});
		    }).run();
		}
	    }) // end jsdom.env
	    return "";
    }
}
