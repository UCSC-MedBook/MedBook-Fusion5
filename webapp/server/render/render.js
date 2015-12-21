
var jsdom = Meteor.npmRequire("node-jsdom");
var serializeDocument = jsdom.serializeDocument;

// var d3 = Meteor.npmRequire("d3");
var htmlStub = '<html><head></head><body><div id="dataviz-container"></div><script src="js/d3.v3.min.js"></script></body></html>';

renderJSdom = function(ChartDocument) {
    var start = new Date();
    jsdom.env(htmlStub, ["http://code.jquery.com/jquery.js"], {
	    features : { QuerySelector : true },
	    done : function(errors, window) {
	    // this callback function pre-renders the dataviz inside the html document, then export result into a static file
		var plot = D3BoxPlot(window, ChartDocument, null, []);

		var res = serializeDocument(plot);
	} // end jsDom done callback
    }) // end jsdom.env
    var stop = new Date();
    console.log("stop - start", stop-start);
}
