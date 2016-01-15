var study = "prad_wcdt";

function trans() {
    Meteor.call("expressionVariance", study, function(err, data) {
        console.log("expressionVariance",err, "data", data.length);
	d3_area(data, "Expression Variance", function(mark){
	    var revised = data.slice(0, mark.index);
	    Session.set("DIPSCgeneList", revised.map(function(r) { return r.gene; }));
	    Session.set("DIPSCgeneListLength", revised.length);
	});
    });
}

Meteor.startup(function() {
    Template.DIPSC.onRendered(trans);
});
