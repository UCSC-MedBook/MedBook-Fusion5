var study = "prad_wcdt";

function trans() {
    Meteor.call("expressionVariance", study, function(err, data) {
        console.log("expressionVariance",err, "data", data.length);
	d3_area(data, "Expression Variance", 
	    function(mark){
	        var n = mark != null && mark.index != null ?
		      mark.index : data.length * 0.25;
		var revised = data.slice(0, n);
		var geneList = revised.map(function(r) { return r.gene_label; });
		Session.set("DIPSCgeneList", geneList );
		Session.set("DIPSCgeneListLength", geneList.length);
		Meteor.call("prepareDIPSC", "prad_wcdt", geneList);
	    });
    });
}

Meteor.startup(function() {
    Template.DIPSC.onRendered(trans);
});
