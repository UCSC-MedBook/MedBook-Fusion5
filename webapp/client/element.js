
Template.Element.helpers({

    operations: function() {
       return ChartData_Element_Ops;
    },

    dichot: function(op) {
	var transforms = Template.parentData().theChart.transforms;
	var field = Template.parentData().field;
	if (transforms) {
	    var t = _.find(transforms, function(t){ return t.field == field; });
	    if (t) 
		return t.op == op ? "active" : "";
	}
	return op == "none" ? "active" : "";
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
       try {
	   var md = TheChart.metadata[this.field];

	   if (md.type == "String" && md.allowedValues)
	       values = TheChart.metadata[this.field].allowedValues;
	   else {
	       var excludedValues = this.field in TheChart.pivotTableConfig ? TheChart.pivotTableConfig.exclusions[this.field]  : [];
	       values = _.uniq(_.union(excludedValues, _.pluck(TheChart.chartData, this.field))).sort();
	   }
       } catch (err) {
           debugger;
       }
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
		      found = true;
	        }
		return e.op != "none";
	   });
       if (!found && op != "none") {
	    var found = false;
	    if (transforms == null) transforms = [];
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
    'click input': function(evt, tpl) {
	var value = String(this);
	var field = Template.currentData().field;
	var TheChart = Template.currentData().theChart;
	var exclusions = Template.currentData().exclusions;

	if (exclusions) {
	    if (!evt.target.checked) {
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
    	}
    },
    'click .OK' : function() {
	var exclusions = Template.currentData().exclusions;
	var TheChart   = Template.currentData().theChart;
	UpdateCurrentChart("pivotTableConfig.exclusions", exclusions);
	OverlayClose();
    }
    
});
