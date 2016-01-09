Template.Element.helpers({
    checked: function() {
	var value = String(this);
	var field = Template.parentData().field;
	var TheChart = Template.parentData().theChart;
	var exclusions = Template.parentData().exclusions;

	if ( field in exclusions ) {
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
	   type = md.type;
	   if (md.type == "String" && md.allowedValues)
	       values = TheChart.metadata[field].allowedValues;
	   else
	       values = _.uniq(_.pluck(TheChart.chartData, this.field)).sort();
       } catch (err) {
           debugger;
       }
       return values;
    }
});

Template.Element.events({
   'change .transform' : function(evt, tmpl) {
       var TheChart = Template.currentData().theChart;
       var transforms = TheChart.transforms;
       var value = evt.target.value;

       transforms.map(function(e, i) {
            if ( e.op == $(evt.target).data("op") && e.field == $(evt.target).data("field"))
               e.value = value;
        });
       // BUG the sort changes this into an object which can't be stored in Mongo
       // transforms = transforms.sort(function(a,b) { return a.precedence - b.precedence; })
       var val = Charts.update(TheChart._id, {$set: { "transforms":  transforms}});
   },
    'click input': function(evt, tpl) {
	var value = String(this);
	var field = Template.currentData().field;
	var TheChart = Template.currentData().theChart;
	var exclusions = Template.currentData().exclusions;

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
    },
    'click .OK' : function() {
	var exclusions = Template.currentData().exclusions;
	var TheChart   = Template.currentData().theChart;
	UpdateCurrentChart("pivotTableConfig.exclusions", exclusions);
	OverlayClose();
    }
    
});
