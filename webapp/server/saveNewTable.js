function pruneTable(source_data) {
	if (source_data.length < 2 || source_data[0].length < 2)
	    throw new Meteor.Error("Data table too small");

	// prune off end null rows 
	while ( source_data.length > 0 && source_data[source_data.length -1] != null && source_data[source_data.length -1].length == 0 || source_data[source_data.length -1][0] == null)
	     source_data.pop();
	if (source_data.length  < 2 || source_data[0].length < 2)
	    throw new Meteor.Error("Data table too small");

	//  prune off null ends of column header (first row)
	var columns = source_data[0];
	while (columns.length > 1 && columns[columns.length -1] == null)
	    columns.pop();
	if (columns.length  < 2)
	    throw new Meteor.Error("Data table too small");

	//  make all rows match (might throw away data)
	for (var i = 1; i < source_data.length; i++)
	    source_data[i].splice(columns.length);

	return columns;
}

function convertData(target_field, datum) {

    if (datum == null)
        return null;
    datum = datum.trim();
    if (datum == "")
        return null;

    if (target_field.type == "String") {
        datum = String(datum);
	if (target_field.allowedValues == null)
	    target_field.allowedValues = [datum];
	else
	    target_field.allowedValues = _.union(target_field.allowedValues, [datum]);
    } if (target_field.type == "Number") {
        datum = Number(datum);
    }
    target_field.allowedValues = target_field.allowedValues.sort();
    return datum;
}


Meteor.methods( {
   newTableFromSpreadsheet : function(target_name, studyForNewTable, fields, source_data) {
        console.log(" newTableFromSpreadsheet", target_name, studyForNewTable, source_data);

	var columns = pruneTable(source_data);
	fields.splice(columns.length); // prune and then validate columns
	columns.map(function(colName, i) { if (colName != fields[i].Field_Name) throw new Meteor.Error("Malformed table") });

        if (this.userId == null) throw new Meteor.Error("User must login");
	if (target_name == null || target_name.length == 0) throw new Meteor.Error("Need a table name");

	var user = Meteor.users.findOne({_id: this.userId});
	if (user == null)
	   throw new Meteor.Error("User is unknown");

	if (studyForNewTable != "user:" + user.username) {
	    var study = Collection.studies.find({id: studyForNewTable}, {fields: {collaborations:1, id:1}});
	    if (study == null) throw new Meteor.Error("Study not found");

	    if (_.intersection(study.collaborations, user.profile.collaborations).length == 0) 
	        throw new Meteor.Error("User may not write to this study: " + studyForNewTable);
	}

	var  metadata  = {
		"Form_Name" : target_name,
		"Fields" : fields,
	},

	schema = {};

	fields.map(function(field) {
	    var clone = _.clone(field);
	    delete clone["Field_Name"];
	    schema[field.Field_Name] = clone;
	});

	var targetTableType = {
	    "_id" : target_name,
	    "name" : target_name,
	    "n" : fields.length,
	    "incompleteCount" : 0,
	    "schema" : schema,
	    "metadata" : metadata,
	    "fieldOrder" : columns,
	    "study" : studyForNewTable,
	};
	Collections.Metadata.upsert({name: target_name}, targetTableType);

	var n = 0;
	for (var j = 1; j < source_data.length; j++) {
	    var source_doc = source_data[j];
	    var target_doc = { Study_ID: studyForNewTable, CRF: target_name};
	    for (var i = 0; i < fields.length; i++) {
		var target_field = fields[i];
		target_doc[target_field.Field_Name] = convertData(target_field, source_doc[i]);
	    }
	    Collections.CRFs.insert(target_doc);
	    n++;
	}
	return "Successfully inserted " + String(n) + " of " + String(source_data.length - 1) + " records";
   },

   newTable : function(target_name, studyForNewTable, source_data, source_chart_id) {
        console.log(" newTable", target_name, studyForNewTable, source_data, source_chart_id);

        if (this.userId == null)
	   throw new Meteor.Error("User must login");
	var user = Meteor.users.findOne({_id: this.userId});
	if (user == null)
	   throw new Meteor.Error("User is unknown");

	var source_chart = Charts.findOne({_id: source_chart_id});

	if (source_chart == null)
	   throw new Meteor.Error("Chart does not exist");

	fields =  [];
	schema =  {};
	var fieldOrder = source_data ?  source_data : source_chart.pivotTableConfig.rows.concat( source_chart.pivotTableConfig.cols); 
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
	};

	if (studyForNewTable != "user:" + user.username) {
	    var study = Collection.studies.find({id: studyForNewTable}, {fields: {collaborations:1, id:1}});
	    if (study == null)
	       throw new Meteor.Error("Study not found");

	    if (_.intersection(study.collaborations, user.profile.collaborations).length == 0) 
	        throw new Meteor.Error("User may not write to this study");
	}

	var targetTableType = {
	    "_id" : target_name,
	    "name" : target_name,
	    "n" : fieldOrder.length,
	    "incompleteCount" : 0,
	    "schema" : schema,
	    "metadata" : metadata,
	    "fieldOrder" : fieldOrder,
	    "study" : studyForNewTable,
	};
	Collections.Metadata.upsert({name: target_name}, targetTableType);
	source_chart.chartData.map(function(doc) {
	    doc.Study_ID = studyForNewTable,
	    doc.CRF = target_name,
	    Collections.CRFs.insert(doc);
	})
   } // newTable
});

