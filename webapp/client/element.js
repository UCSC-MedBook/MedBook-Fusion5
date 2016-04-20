
function dichotOp() {
    var theChart = Template.currentData().theChart;
    if (theChart == null) theChart = Template.parentData().theChart;
    if (theChart == null) return false;

    var field = Template.currentData().field;
    if (field == null) field = Template.parentData().field;
    if (field == null) return false;

    var transforms = theChart.transforms;
    if (transforms) {
	var t = _.find(transforms, function(t){ return t.field == field; });
	if (t)
	    return t.op;
    }
    return "none"
}; 

Template.Element.rendered = function() {
   Session.set("dichot", dichotOp());
}

Template.Element.helpers({

    operations: function() {
       return ChartData_Element_Ops;
    },

    dichotActive: function(op) {
       Session.set("dichot", dichotOp());
       return dichotOp() == op ? "active" : "";
    },

    checked: function() {
	var value = String(this);
	var field = Template.parentData().field;
	var TheChart = Template.parentData().theChart;
	var exclusions = Template.parentData().exclusions;

	if ( exclusions && field in exclusions ) {
	    var values = exclusions[field];
	    return !_.contains(values, value);
	} 
	return true;
    },
    values: function() {
       var TheChart = Charts.findOne({_id: TheChartID}); // even though we have this.theChart, we want the dependency tracker to update when TheChart changes. So we need to get TheChart ourselves from the database.
       var values = ["N/A"];
       var md = TheChart.metadata[this.field];

       if (md.type == "String" && md.allowedValues)
	   values = TheChart.metadata[this.field].allowedValues;
       else {
	   var excludedValues = this.field in TheChart.pivotTableConfig ? TheChart.pivotTableConfig.exclusions[this.field]  : [];
	   values = _.uniq(_.union(excludedValues, _.pluck(TheChart.chartData, this.field))).map(function(n) {
	      try {
		 return Number(n);
	      } catch (err) {
		 return n;
	      }
	   }).sort(function(a,b) {return a- b});
       }
       if (!_.contains(values,"N/A"))
	   values.push("N/A");
       return values;
    }
});

Template.Element.events({
   'change .dichotomization' : function(evt, tmpl) {
       var TheChart = Template.currentData().theChart;
       var transforms = TheChart.transforms;
       var op = evt.target.value;
       var field = Template.currentData().field

       var found = false;
       if (transforms)
	   transforms = transforms.filter(function(e, i) {
		if ( e.field == field) {
		      e.op = op;
		      Session.set("dichot", op);
		      found = true;
	        }
		return e.op != "none";
	   });
       if (!found && op != "none") {
	    var found = false;
	    if (transforms == null) transforms = [];
	    Session.set("dichot", op);
	    transforms.push( {
		op: op,
		field: field,
		value: null
	    });
	}
       var val = Charts.update(TheChart._id, {$set: { "transforms":  transforms}});
   },
   'change .transform' : function(evt, tmpl) {
       var TheChart = Template.currentData().theChart;
       var transforms = TheChart.transforms;
       var value = evt.target.value;

       var found = false;
       if (transforms)
	   transforms.map(function(e, i) {
		if ( e.op == $(evt.target).data("op") && e.field == $(evt.target).data("field")) {
		   e.value = value;
		   found = true;
	       }
	   });
       if (!found)
	    var found = false;
	    if (transforms == null) transforms = [];
	    transforms.push( {
		op: $(evt.target).data("op"),
		field: $(evt.target).data("field"),
		value: value
	    });
       var val = Charts.update(TheChart._id, {$set: { "transforms":  transforms}});
    },

    'click .OK' : function(evt, tpl) {
	var value = String(this);
	var TheChart = Template.currentData().theChart;
	var exclusions = Template.currentData().exclusions;
	if (exclusions == null || exclusions.length == 0)
	   exclusions = {};

	$(".exclusions").each(function(i, e) {
	    var field = $(e).data("field");
	    var value = $(e).data("value");

	    if (!e.checked) {
		if ( !(field in exclusions))
		    exclusions[field] = [];
		if (!(_.contains(exclusions[field], value)))
		    exclusions[field].push(value);
	    } else {
		if (field in exclusions) {
		    var index = exclusions[field].indexOf(value);
		    exclusions[field].splice(index, 1);
		    if (exclusions[field].length == 0)
			delete exclusions[field];
		}
	    }
    	})
	debugger;
	UpdateCurrentChart("pivotTableConfig.exclusions", exclusions);
	OverlayClose();
    }
    
});
