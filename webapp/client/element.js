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
    }
});

Template.Element.events({
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
