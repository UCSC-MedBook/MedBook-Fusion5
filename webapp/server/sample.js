var extend = Meteor.npmRequire('node.extend');


// SampleJoin is the most important function in Fusion.
// Does the heavy lifting for Joining Samples.
// This is the central Joinalgoritm. 

function SampleJoin(userId, ChartDocument, fieldNames) {

    if (ChartDocument.data_sets  == null || ChartDocument.data_sets.length == 0) {
	Charts.direct.update({ _id : ChartDocument._id }, 
	      {$set: 
		  {
		    dataFieldNames: [],
		    pivotTableConfig: {rows:[], cols:[], rendererName: "Table"},
		    selectedFieldNames: [],
		    metadata: {},
                    elapsed: ChartDocument.elapsed,
                    samplelist: [],
		    html: "<b> Please select one or more data_sets.</b>",
		   }});
        return;
    }

    try {
        initTemporaryDatabase(ChartDocument,fieldNames);
        // SeedDataFromClincialInfo(ChartDocument);
        SeedDataFromStartTables(ChartDocument)
        JoinAllGeneLikeInformation(ChartDocument);
        MergeCRFs(ChartDocument);
        ProcessGeneSignatureFormula(ChartDocument);
        TransformLabelsAndData(ChartDocument);
        Remove_Excluded_Samples_and_Sort(ChartDocument);

	var html = renderJSdom(ChartDocument);
	Charts.direct.update({ _id : ChartDocument._id }, 
	      {$set: 
		  {
		    dataFieldNames: ChartDocument.dataFieldNames,
		    pivotTableConfig: ChartDocument.pivotTableConfig,
		    selectedFieldNames: ChartDocument.selectedFieldNames,
		    metadata: ChartDocument.metadata,
		    chartData: ChartDocument.chartData,
                    elapsed: ChartDocument.elapsed,
                    samplelist: ChartDocument.samplelist,
		    html: html,
		   }});

        // console.log(ChartDocument.chartData);

    } catch (err) {
        console.log("SampleJoin", err, err.stack);
    }
} 

function loadTableIntoDocument(ChartDocument, q) {
    var original_study_name  = Collections.data_sets.findOne({_id: q.data_set}).name;

    var table = Collections.Metadata.findOne(q);
    if (table.fieldOrder == null || table.fieldOrder.length == 0)
        return
    var primaryKey = table.fieldOrder[0]
    var fullKey = q.data_set + "/" + q.name + "/" + primaryKey;


    var metadata = table.schema;
    if (typeof(metadata) == "string")
       metadata = JSON.parse(metadata);


    table.fieldOrder.map(function(f) {
        ChartDocument.metadata[f] = metadata[f];
        ChartDocument.metadata[f].collection = "CRFs";
        ChartDocument.metadata[f].crf = q.name;
        ChartDocument.metadata[f].data_set = q.data_set;
    });

    var tableQuery = {
        data_set_id: q.data_set,
        CRF: q.name
    };
    if (ChartDocument.samplelistFilter && ChartDocument.samplelistFilter.length > 0) {
        tableQuery[ChartDocument.Join] = {$in: ChartDocument.samplelistFilter};
    }

    // Fetch and possibly merge CRF documents
    Collections.CRFs.find(tableQuery).forEach(function(doc) {
        delete doc["_id"];

        var join_value = doc[primaryKey];
        if (join_value == null)
            return;

        if (!("study_name" in doc)) {
            doc.study_name = original_study_name
            ChartDocument.metadata.study_name = { type: "String" };
        }

        var primary_key_value = doc.study_name + "/" + join_value;
        if (primary_key_value in ChartDocument.chartDataMap) {
            extend(ChartDocument.chartDataMap[ primary_key_value ], doc);
        } else {
            doc._primaryKey = primary_key_value;
            ChartDocument.metadata._primaryKey = { type: "String" };
            ChartDocument.chartData.push(doc);
            ChartDocument.chartDataMap[ primary_key_value ] = doc;
            ChartDocument.samplelist.push(primary_key_value);
        }
    });
}


// Step 1. Use Clinical_Info as primary key
// IN: samplelist, data_sets 
// OUT: chartData, samplelist, metadata
function SeedDataFromStartTables(ChartDocument) {
    /*
    if (ChartDocument.samplelist != null && unchanged(ChartDocument, ["samplelist", "data_sets"]))
        return;
    */
    change(ChartDocument, [ "samplelist", "metadata"]);
    
    // init
    var inDataSets = {$in:ChartDocument.data_sets}; 
    ChartDocument.data_setCache = {};
    ChartDocument.chartData = [];
    ChartDocument.samplelist = [];
    ChartDocument.metadata  = {};

    if (ChartDocument.Join == null)
        ChartDocument.Join = "sample_label";

    var data_sets = [];

    // cache data_sets
    Collections.data_sets.find({_id: inDataSets}).forEach(function(data_set) {
        // console.log("adding data_set", data_set._id);

        // TBD: make sure the user has access to this data_set.
        //
        ChartDocument.data_setCache[data_set._id] = data_set;
        data_sets.push(data_set);
    });

    // load seed start tables from database
    ChartDocument.startTables.map(function(q) {
        loadTableIntoDocument(ChartDocument, q);
    });

    // polish in memory data structure set up
    ChartDocument.chartData.sort( function (a,b) { 
        return a._primaryKey.localeCompare(b._primaryKey)
    });
    ChartDocument.samplelist.sort();
}

// These are temporary in memory datastructures which speed up the computation, but are not saved to the database.
function initTemporaryDatabase(ChartDocument,fieldNames) {
    ChartDocument.fieldNames = fieldNames; 
    ChartDocument.chartDataMap = {};
}

Meteor.startup( 
    function CleanupLostCharts() {
        var posts = new Meteor.Collection("posts");
        posts.find({url: {$regex:/fusion/}}, {chart:1, url:1}).forEach(function(post) {
            var url = post.url.split("/")
            if (url && url.length > 3) { 
                var _id = url.pop();
                var chart = Charts.findOne({_id: _id}, {});
                if (chart)
                    Charts.update({_id: chart._id}, { $set: { post: true }});
            }
        });

        var multipleDefaultPosts = Charts.aggregate([
              { $match: { post: {$exists: 0}}},

              { $group: { 
                  _id: "$userId",
                  uniqueIds: { $addToSet: "$_id" },
                  count: { $sum: 1 } 
              }}, 

              { $match: { 
                  count: { $gt: 1 } 
              }}
        ]);
        // console.log("multipleDefaultPosts", multipleDefaultPosts);
}
);


// The "this" object has to be the default dictonary of all possible keys.
function Normalize(f, i, keys) {
    delete f["_id"];

    keys.map(function(k) {
        if (f[k] == null)
           f[k] = "N/A";
    });


    return f;
};


function buildRemodelPlan(chartData, transforms, rows, cols) {
 var remodel = { doIt: false, plan: {} };

 transforms
 .filter(function(transform) {return _.contains(rows, transform.field) || _.contains(cols, transform.field) })
 .map(function(transform) {
    // console.log("transform", transform);
    switch (transform.op) {

    case "dichot-mean":
    case "dichot-median":
    case "cluster-median":
    case "cluster-mean": {
	    remodel.doIt = true;

	    var clusters = {};
	    chartData.map(function(elem) {
		var context = _.pick(elem, rows);
		var key = JSON.stringify(context).replace(/[,{}"']/g, "");
		if (!(key in clusters)) clusters[key] = { 
		    key: key,
		    context: context,
		    count: 0,
		    total: 0.0,
		    min: Number.MAX_VALUE,
		    max: Number.MIN_VALUE,
		    mean: 0,
		    median: 0,
		};

		value = elem[transform.field];
		if (!isNaN(value)) {
		    clusters[key].total = value + clusters[key].count ;
		    clusters[key].count = 1 + clusters[key].count ;
		    if (clusters[key].min > value)
			clusters[key].min = value;
		    if (clusters[key].max < value)
			clusters[key].max = value;
		}
	    });

	    Object.keys(clusters).map(function(clusterKey) {
		 var cluster = clusters[clusterKey];

		 try {
		     cluster.median = (cluster.max + cluster.min) / 2;
		     cluster.mean = cluster.total / cluster.count;
		 } catch (err) {
		 }

		if (!(clusterKey in remodel.plan)) remodel.plan[clusterKey] = _.clone(cluster.context);
		switch (transform.op) {
		case "cluster-mean":
		    remodel.plan[clusterKey][transform.field] = cluster.mean;
		    break;
		case "cluster-median":
		    remodel.plan[clusterKey][transform.field] = cluster.median;
		    break;
		}
	    });
	}
	break;
    }
 });
 return remodel
}

function dichotomizeOrBin(chartData, transforms, rows, remodel) {
     chartData.map(function transformer(datum) {
	 transforms.map(function(transform) {
	     if (transform.field in datum) {
		switch (transform.op) {
		case "dichot-median":
		case "dichot-mean": {
		     var dataValue = parseFloat(datum[transform.field]);
		     if (!isNaN(dataValue)) {
			 var context = _.pick(datum, rows);
			 var key = JSON.stringify(context).replace(/[,{}"']/g, "");
			 var cluster = remodel.plan[key];
			 if (transform.op == "dichot-median")
			     datum[transform.field] = cluster.median > dataValue ? 1 : -1;
			 else
			     datum[transform.field] = cluster.mean > dataValue ? 1 : -1;
			 // console.log( dataValue, transform, cluster );
		     } // else  console.log("isNan false", dataValue, typeof(dataValue));
		};
		break;

		case "bin": {
		     var dataValue = parseFloat(datum[transform.field]);
		     var binValue = parseFloat(transform.value);
		     if (!isNaN(dataValue) && !isNaN(binValue)) {
			var flooredValue = Math.floor(dataValue / binValue);
			datum[transform.field] = flooredValue * binValue;
		     }
		 }
		 break;
		 case "rename": {
		    // console.log("rename", transform.value,"<-", transform.field);
		    datum[transform.value] = datum[transform.field];
		    delete datum[transform.field];
		 }
		 break;
	     } // switch 
	   } // if
	 });
    });
    return chartData;
}

unchanged = function(ChartDocument, fields) {
    return _.intersection(ChartDocument.fieldNames, fields) == 0;
}

change = function(ChartDocument, fields) {
    ChartDocument.fieldNames = _.union(ChartDocument.fieldNames, fields);
}


// Step 2. Join all the Gene like information into the samples into the ChartDataMap table
// IN:  geneLikeDataDomain, genelist, samplelist
// OUT: chartData, metadata
function JoinAllGeneLikeInformation(ChartDocument) {
    /*
    if (unchanged(ChartDocument, ["geneLikeDataDomain","genelist","samplelist"]))
        return;
        */
    change(ChartDocument, ["chartData", "metadata"]);

    if (ChartDocument.geneLikeDataDomain && ChartDocument.genelist && ChartDocument.geneLikeDataDomain.length > 0 && ChartDocument.genelist.length > 0)  {
        ChartDocument.geneLikeDataDomain
          .filter(function(domain) {return domain.state})
          .map(function(domain) {

            var query = {};
            if (domain.data_set_label_name)
                query[domain.data_set_label_name] = {$in: ChartDocument.data_sets};

            if (domain.regex_genenames)
                query[domain.gene_label_name]  = {$in: ChartDocument.genelist.map(function(d) { return new RegExp("^" + d + "_.*", "i");})}
            else
                query[domain.gene_label_name]  = {$in: ChartDocument.genelist};

            var cursor = DomainCollections[domain.collection].find(query);
            // console.log("find", domain.collection, query, cursor.count(), domain);
	    
	    if (domain.format_type == 4) {
	        var data_setCache = {};

		cursor.forEach(function(geneData) {
		    if (!(geneData.data_set_id in data_setCache)) 
		        data_setCache[geneData.data_set_id] = Collections.data_sets.findOne({_id: geneData.data_set_id})

		    var data_set = data_setCache[geneData.data_set_id];
		    var field_label = geneData.gene_label + ' ' + domain.labelItem;
		    ChartDocument.samplelist.map(function(sample_label) {
                        var parts = sample_label.split('/');
                        var data_set_name = parts[0];
                        var key = parts[1];

                        if (data_set_name == data_set.name && key in data_set.gene_expression_index) {
                            var i = data_set.gene_expression_index[key];

                            if (ChartDocument.chartDataMap[sample_label][field_label] != null)
                                console.log("OVERWRITE", sample_label, field_label, key, data_set._id, ChartDocument.chartDataMap[sample_label][field_label], geneData.rsem_quan_log2[i]);

                            ChartDocument.chartDataMap[sample_label][field_label] = geneData.rsem_quan_log2[i];
                        }
		    });
		    if (ChartDocument.metadata[field_label] == null)
			ChartDocument.metadata[field_label] = { 
			    collection: domain.collection,
			    crf: null, 
			    label: field_label,
			    type: domain.field_type
			};
		    // console.log("format_type 4", geneData.gene_label);
		})

	    } else cursor.forEach(function(geneData) {

                var sampleID = geneData[domain.sample_label_name];
                var geneName = geneData[domain.gene_label_name];
                var label = geneName + ' ' + domain.labelItem;

                if (domain.format_type == 2) {  // sample names are stored as attributes
                    if (sampleID in ChartDocument.chartDataMap) {
                        var obj = geneData;
                        var fields = domain.field.split('.');
                        fields.map(function(field){ obj = obj[field]; });

                        // console.log("found", label, geneName, sampleID, obj);
			if (!(sampleID in ChartDocument.chartDataMap))
                            ChartDocument.chartDataMap[sampleID] = {};
                        ChartDocument.chartDataMap[sampleID][label] = obj;
			if (ChartDocument.metadata[label] == null)
			    ChartDocument.metadata[label] = { 
				collection: domain.collection,
				crf: null, 
				label: label,
				max: 200,
				type: domain.field_type
			    };
                    }
                }
            }); //cursor.forEach

            //  Samples without mutations need to have a wt
            if (domain.label == "Mutations") {
                var labels  = ChartDocument.genelist.map(function(geneName) { return geneName + ' ' + domain.labelItem});;
                ChartDocument.samplelist.map(function (sampleID) {
                    if (!(sampleID in ChartDocument.chartDataMap))
                        ChartDocument.chartDataMap[sampleID] = {};
                    var datum = ChartDocument.chartDataMap[sampleID];
                    labels.map(function(label) {
                        if (!(label in datum))
                            datum[label] = "wt";
                        if (ChartDocument.metadata[label] == null) // true when there is only wildtype
                            ChartDocument.metadata[label] = { 
                                collection: domain.collection,
                                crf: null, 
                                label: label,
                                type: domain.field_type,
                                allowedValues: ["wt"]
                            };
                        else
                            ChartDocument.metadata[label].allowedValues = _.union(ChartDocument.metadata[label].allowedValues, "wt");
                    });
                });
            }
          }); // .map 
    } // if ChartDocument.geneLikeDataDomain 

} // function JoinAllGeneLikeInformation

// Step 3. Merge in the additional queries that fetch CRFs
// IN:  additionalQueries
// OUT: chartData
function MergeCRFs(ChartDocument) {
    if (ChartDocument.additionalQueries == null || ChartDocument.additionalQueries.length == 0 ||  
            unchanged(ChartDocument, ["additionalQueries", "pivotTableConfig", "samplelist"]))
        return;
    change(ChartDocument, ["chartData"]);

    var mappatient_label_to_JoinKey = {};
    /*
    ChartDocument.chartData.map(function(cd) {
	 if (!(cd.patient_label in mappatient_label_to_JoinKey))
	     mappatient_label_to_JoinKey[cd.patient_label] = [ cd._primaryKey ]
	 else
	     mappatient_label_to_JoinKey[cd.patient_label].push(cd._primaryKey);
    });
    */
    if (ChartDocument.additionalQueries)
        ChartDocument.additionalQueries.map(function(query) {
             var query = JSON.parse(unescape(query));
	     // console.log("ChartDocument.additionalQueries", query);

             var crfName = query.c;
             var fieldName = query.f;
             var joinOn = query.j;
             var data_set = query.s;


	     if (data_set == null) data_set = "prad_wcdt";

	     var label = data_set + ":" + crfName + ":" + fieldName;
	     var m = Collections.Metadata.findOne({ name: crfName,  data_set: data_set});
	     if (m == null) {
		console.log("Missing additional query", label, m);
	     	return;
	     }
	     var ms = m.schema;  
	     if (typeof(ms) == "string")
	       ms = JSON.parse(ms);
	     var msf = ms[fieldName];

	     if (msf == null) {
	         console.log("ERROR", query, ms);
		 return;
	     }
	     msf.collection = "CRF";
	     msf.crf = crfName;
	     // console.log("META QUERY", label, msf);
	     ChartDocument.metadata[label] = msf;

             var fl = {};
             fl[fieldName] = 1;
	     fl[ChartDocument.Join] = 1;
	     fl["_primaryKey"] = 1;
	     fl.patient_label = 1;

	     // the following query needs data_set_id and perhaps sample_list
             Collections.CRFs.find({CRF:crfName}, {fields: fl }).forEach(function(doc) {

                 if (doc._primaryKey && doc._primaryKey in ChartDocument.chartDataMap) {
                     ChartDocument.chartDataMap[doc._primaryKey][label] = doc[fieldName];
                 } else {
                     if (doc.patient_label in mappatient_label_to_JoinKey) {
                         mappatient_label_to_JoinKey[doc.patient_label].map(function(primaryKey) {
                             ChartDocument.chartDataMap[primaryKey][label] = doc[fieldName];
                         });
			  // console.log("joined through patient_label", doc);
		     } 
			  // else console.log("addQ", crfName, fieldName, doc);
                } // else
             }); // forEach

        }); //  ChartDocument.additionalQueries.map
}





// Step 5. Transform any data.
// IN: pivotTableConfig, transforms
// OUT: chartData, dataFieldNames
function TransformLabelsAndData(ChartDocument) {
    /*
    if (unchanged(ChartDocument, ["chartData", "pivotTableConfig","transforms"]))
        return;
    change(ChartDocument, ["chartData","dataFieldNames"]);
    */

    var keyUnion = {};  
    ChartDocument.chartData.map(function(datum) { 
	Object.keys(datum).map(function(k) { keyUnion[k] = "N/A"; });
    });
    if (ChartDocument.pivotTableConfig == null) ChartDocument.pivotTableConfig  = {};
    if (ChartDocument.pivotTableConfig.rows == null) ChartDocument.pivotTableConfig.rows = [];
    if (ChartDocument.pivotTableConfig.cols == null) ChartDocument.pivotTableConfig.cols = [];

    ChartDocument.dataFieldNames =  Object.keys(keyUnion);
    ChartDocument.pivotTableConfig.cols = _.intersection(ChartDocument.pivotTableConfig.cols, ChartDocument.dataFieldNames );
    ChartDocument.pivotTableConfig.rows = _.intersection(ChartDocument.pivotTableConfig.rows, ChartDocument.dataFieldNames );


    // normalize records
    ChartDocument.chartData = ChartDocument.chartData.map(Normalize, Object.keys(keyUnion));

    var transforms = ChartDocument.transforms;
    if (transforms && transforms.length > 0) {
	 var remodel = buildRemodelPlan(ChartDocument.chartData, transforms, ChartDocument.pivotTableConfig.rows, ChartDocument.pivotTableConfig.cols);
	 // console.log("remodel", remodel);

	 if (remodel.doIt) {
	     ChartDocument.chartData = _.values(remodel.plan);
	     // console.log("ChartDocument.chartData", ChartDocument.chartData);
	 } else {
	     ChartDocument.chartData = dichotomizeOrBin(ChartDocument.chartData, transforms, ChartDocument.pivotTableConfig.rows, remodel);
	 }
    } // if transforms
}

    

// Step 6. Remove the excluded samples and (eventually) any other spot criteria.
// IN: pivotTableConfig.exclusions 
// OUT: chartData,selectedFieldNames
function Remove_Excluded_Samples_and_Sort(ChartDocument) {
    if (unchanged(ChartDocument, ["chartData", "pivotTableConfig"]))
        return;
    change(ChartDocument, ["chartData","selectedFieldNames"]);

    var exclusions = ChartDocument.pivotTableConfig.exclusions;
    if (exclusions == null) exclusions = [];
    var selectedFieldNames = _.union(ChartDocument.pivotTableConfig.rows, ChartDocument.pivotTableConfig.cols);

    ChartDocument.selectedFieldNames = selectedFieldNames;
    var excludedKeys = _.intersection(Object.keys(exclusions), selectedFieldNames); // only those names that are engaged.
    if (excludedKeys.length > 0)
	ChartDocument.chartData =  ChartDocument.chartData.filter(function(elem) {
	    for (var i = 0; i < excludedKeys.length; i++) {
	       var key = excludedKeys[i];
	       if (key in elem && exclusions[key].indexOf(String(elem[key])) >= 0)
		   return false;
	       return true;
	    }
	});

    ChartDocument.chartData = ChartDocument.chartData.map(function(elem) {
	for (var i = 0; i < selectedFieldNames.length; i++) {
	    var field = selectedFieldNames[i];
	    if (!(field in elem)) {
		elem[field] = "N/A";
	    }
	}
	return elem;
    }).sort(function(a,b) {  // sort by field order
	var something = 0;
	for (var i = 0; i < selectedFieldNames.length; i++) {
	   var field = selectedFieldNames[i];

	   // If this field is a list of allowedValues in the schema, then use that order
	   var meta = ChartDocument && ChartDocument.metadata && ChartDocument.metadata[field];
	   var order = null;
	   var order_n = 0;

	   if (meta && meta.allowedValues) { 
	       order = {};
	       meta.allowedValues.map(function(value, i) { order[value] = order_n = i });
	       order_n++;
	   }

	   if (field in a && field in b) {
	       if (a[field] == "N/A" && b[field] == "N/A")
		   continue;
	       else if (a[field] != "N/A" && b[field] == "N/A")
		   return -1;
	       else if (a[field] == "N/A" && b[field] != "N/A")
		   return 1;

	       var a_value = a[field];
	       var b_value = b[field];

	       if (order) {
		   a_value = a_value in order ? order[a_value] : order_n;
		   b_value = b_value in order ? order[b_value] : order_n;
	       }
	       if (a_value < b_value)
                   return -1;
	       if (a_value > b_value)
                   return 1;

/*

	       var x =  naturalSort(a_value, b_value);
	       
	       if (x != 0)
		   return x;
*/
	   } else {
	       if (field in a)
		   something = 1;
	       else if (field in b)
		   something = -1;
	       else 
		   something = 0;
	   }
       }
       return something;
    });
}



Meteor.startup(function() {
    Charts.after.update( function(userId, ChartDocument, fieldNames) {
	if (_.difference(fieldNames,["html","updatedAt"]).length == 0)
	     return; // prevent infinite loops

        ensureMinimalChart(ChartDocument);
        SampleJoin(userId, ChartDocument, fieldNames);
    });// chart.after.update

    /*
    Charts.find({html: {$exists:0}}).forEach(function(doc) {
	// console.log("render", doc._id);
        ensureMinimalChart(doc);
	doc.html = renderJSdom(doc);
	Charts.direct.update({ _id : doc._id }, {$set: doc});
    });
    */
});
