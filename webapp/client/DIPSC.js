var study = "prad_wcdt";

function trans() {
    Meteor.call("expressionVariance", study, function(err, data) {
        console.log("expressionVariance",err, "data", data.length);
	d3_area(data, "Expression Variance", 
	    function(mark){
		var revised = data.slice(0, mark.index);
		var geneList = revised.map(function(r) { return r.gene; });
		Session.set("DIPSCgeneList", geneList );
		Session.set("DIPSCgeneListLength", geneList.length);
		Meteor.call("prepareDIPSC", "prad_wcdt", geneList);
	    });
    });
}

Meteor.startup(function() {
    Template.DIPSC.onRendered(trans);
});
