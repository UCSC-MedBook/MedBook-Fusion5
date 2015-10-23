Meteor.methods( {
   newTable : function(target_name, target_collaborations, source_fields, source_chart_id) {
        console.log(" newTable", target_name, target_collaborations, source_fields, source_chart_id);

        if (this.userId == null)
	   throw new Error("User must login");
	var user = Meteor.users.findOne({_id: this.userId});
	if (user == null)
	   throw new Error("User is unknown");

	var source_chart = Charts.findOne({_id: source_chart_id});

	if (source_chart == null)
	   throw new Error("Chart does not exist");

	if (source_chart.collaborations && source_chart.collaborations.length > 0 
	   && _.intersection(source_chart.collaborations, user.profile.collaborations).length == 0) 
	   throw new Error("User is not in database");
	   
	fields =  [];
	schema =  {};
	var fieldOrder = source_fields ?  source_fields : source_chart.pivotTableConfig.rows.concat( source_chart.pivotTableConfig.cols); 
	fieldOrder.unshift("Sample_ID");
	fieldOrder.unshift("Patient_ID");

	fieldOrder.map(function(f) {
	    if (!(f in source_chart.metadata))
	       return;

	    var entry = source_chart.metadata[f];

	    schema[f] = _.clone(entry);
	    entry = _.clone(entry);
	    entry.Field_Name = f;
	    fields.push(entry);
	});

	metadata = {
		"Form_Name" : "Blood_Labs_V2",
		"Fields" : fields,
	},


	var targetTableType = {
	    "_id" : target_name,
	    "name" : target_name,
	    "n" : fieldOrder.length,
	    "incompleteCount" : 0,
	    "schema" : schema,
	    "metadata" : metadata,
	    "fieldOrder" : fieldOrder,
	    "study" :  "user:" + user.username,
	}
      Collections.Metadata.upsert({name: target_name}, targetTableType)
      source_chart.chartData.map(function(doc) {
          doc.Study_ID = "user:" + user.username,
	  doc.CRF = target_name,
	  Collections.CRFs.insert(doc);
      })
   }
});

