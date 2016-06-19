var extend = Meteor.npmRequire('node.extend');



// SampleJoin is the most important function in Fusion.
// Does the heavy lifting for Joining Samples.
// This is the central Joinalgoritm. 

function SampleJoin(userId, ChartDocument, fieldNames) {

    if (ChartDocument.studies  == null || ChartDocument.studies.length == 0)
        return;

    try {
        initTemporaryDatabase(ChartDocument,fieldNames);
        SeedDataFromClincialInfo(ChartDocument);
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

        console.log(ChartDocument.chartData);

    } catch (err) {
        console.log("SampleJoin", err, err.stack);
	debugger
    }
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
function Transform_Clinical_Info(f) {
    delete f["_id"];
    // delete f["Sample_ID"];
    // delete f["Patient_ID"];
    // delete f["On_Study_Date"];
    // delete f["Off_Study_Date"];

    /*
    var on = f["On_Study_Date"];
    var off = f["OffStudy_Date"];
    if (off == null)
        off = Date.now();

    if (off && on)
        f["Days_on_Study"] = (off - on) / 86400000;

    delete f["On_Study_Date"];
    delete f["Off_Study_Date"];
    */


    // Make sure that 
    Object.keys(this).map(function(k) {
        if  (f[k] == null) {
            f[k] = this[k];
        }
    });


    /*
    if  (f["Abiraterone"] == null)
        f["Abiraterone"] = "unknown";

    if  (f["Enzalutamide"] == null)
        f["Enzalutamide"] = "unknown";

    if  (f["biopsy_site"] == null)
        f["biopsy_site"] = "unknown";

    if  (f["site"] == null)
        f["site"] = "unknown";

    if  (f["Days_on_Study"] == null)
        f["Days_on_Study"] = "unknown";


    if  (f["biopsy_site"] == null)
        f["biopsy_site"] = "unknown";

    if  (f["age"] == null)
        f["age"] = "unknown";

    if (f["Reason_for_Stopping_Treatment"] == null)
        f["Reason_for_Stopping_Treatment"] = "unknown";
    */

    delete f["Death on study"];


    var r = f.Reason_for_Stopping_Treatment;
    if (r == null) r =  "n/a";
    else if (r.indexOf("unknown") >= 0) r =  "n/a";
    else if (r.indexOf("Adverse") >= 0) r =  "AE";
    else if (r.indexOf("Complet") >= 0) r =  "Complete";
    else if (r.indexOf("complet") >= 0) r =  "Complete";
    else if (r.indexOf("Death") >= 0) r =  "Death";
    else if (r.indexOf("Progress") >= 0) r =  "Progression";
    else if (r.indexOf("progress") >= 0) r =  "Progression";
    else if (r.indexOf("withdraw") >= 0) r =  "Withdraw";
    else if (r.indexOf("Discretion") >= 0) r =  "Discretion";
    f.Reason_for_Stopping_Treatment = r;
    
    var t = f["treatment_for_mcrpc_prior_to_biopsy"];
    if (t) {
        var abi = t.indexOf("Abiraterone") >= 0 ;
        var enz = t.indexOf("Enzalutamide") >= 0 ;
        if (abi && !enz) t = "Abi";
        else if (!abi && enz) t = "Enz";
        else if (abi && enz) t = "Abi-Enz";
        else if (!abi && !enz) t = "Chemo";
        else t =  "unknown";
    } else 
        t =  "unknown";

    f["treatment_prior_to_biopsy"] = t;
    delete f["treatment_for_mcrpc_prior_to_biopsy"];

    f["timepoint"] = "baseline";
    if ( f.Sample_ID.match(/^DTB-\d\d\dPro/)) // DTB Hack
        f["timepoint"] = "progression";


    Object.keys(f).map(function(k) {
        if (f[k] == null)
           f[k] = "N/A";
    });


    return f;
};

function GeneJoin(userId, ChartDocument, fieldNames) {
     var big = Expression.find(
                 {"Study_ID" : "prad_tcga"}, 
                 {
                    fields: {
                         "gene":1,
                         "variance.rsem_quan_log2":1,
                         "mean.rsem_quan_log2":1
                    },
                    limit: 1000,
                    sort: {"variance.rsem_quan_log2":-1}
                }
             ).fetch().map(
                 function(e) { 
                     return { 
                        Gene: e.gene,
                        Variance: e.variance.rsem_quan_log2,
                        Mean: e.mean.rsem_quan_log2
                      }
                   });

     Charts.direct.update({ _id : ChartDocument._id }, 
          {$set: 
              {
                dataFieldNames: ['Expression', 'Variance', 'Mutation'],
                selectedFieldNames: ['Expression', 'Variance', 'Mutation'],
                chartData: big
               }});
}

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


// Step 1. Use Clinical_Info as primary key
// IN: samplelist, studies 
// OUT: chartData, samplelist, metadata
function SeedDataFromClincialInfo(ChartDocument) {
    /*
    if (ChartDocument.samplelist != null && unchanged(ChartDocument, ["samplelist", "studies"]))
        return;
    */
    change(ChartDocument, [ "samplelist", "metadata"]);
    
    var inStudies = {$in:ChartDocument.studies}; 
    ChartDocument.studyCache = {};

    ChartDocument.chartData = [];
    ChartDocument.metadata  = {};

    Collections.studies.find({id: inStudies}).forEach(function(study) {
        console.log("adding study", study.id);

        // TBD: make sure the user has access to this study.
        //
        ChartDocument.studyCache[study.id] = study;

        var q =  {Study_ID: study.id};
        if ( ChartDocument.samplelist != null && ChartDocument.samplelist.length > 0) {
            q.Sample_ID =  {$in: ChartDocument.samplelist};
        }

        // case 1,the user specified a form to start with in the user interface (TBD)
        if (ChartDocument.start_crf)
            q.CRF = ChartDocument.start_crf;

        // case 2,there is a well known form specified in the study (TBD)
        else if (study.start_crf) 
            q.CRF = study.start_crf;

        // case 3, we use a CRF whose name has Clinical_Info in it. 
        else {
            // But we don't know what it is, so find it.
            var ci = Collections.CRFs.findOne({ CRF: /.*Clinical_Info/, Study_ID: study.id});
            if (ci)
                q.CRF = ci.CRF;
            }


        // HACK 
        // HACK 
        // HACK 
        if (q.CRF == null) {
            // use any CRF table
            var ci = Collections.CRFs.findOne({ Study_ID: study.id});
            if (ci)
                q.CRF = q.ci.CRF;
            else {
                // SHOULD WE return;  // SKIP THIS STUDY
            }
        }

        if (q.CRF && study.gene_expression_index) {
            Collections.CRFs.find(q).forEach( function(cd) {  

                if (cd.Sample_ID in study.gene_expression_index) {  // FINALLY LOAD IT!
                    delete cd["_id"];
                    delete cd["CRF"];

                    ChartDocument.chartData.push(cd);
                }
            })

            var metadata = Collections.Metadata.findOne({ name: q.CRF}).schema;  
            if (typeof(metadata) == "string")
               metadata = JSON.parse(metadata);

            Object.keys(metadata).map(function(f) {
                ChartDocument.metadata[f] = metadata[f];
                ChartDocument.metadata[f].collection = "CRFs";
                ChartDocument.metadata[f].crf = q.CRF;
            });
        } else {
            // MAKE INITIAL CHART DATA RECORDS HERE
            var sample_ids = [];

            if (study.gene_expression_index)
                sample_ids = Object.keys(study.gene_expression_index);
            else
                sample_ids = study.Sample_IDs;

            sample_ids.map(function (sample_id) {
                ChartDocument.chartData.push({Sample_ID: sample_id, Study_ID: study.id});
            });
            ChartDocument.metadata["Sample_ID"] = {collection: "studies", type: "String"};
            ChartDocument.metadata["Study_ID"] = {collection: "studies", type: "String"};
        }
        console.log("ChartDocument.chartData.length", ChartDocument.chartData.length);
    });

    ChartDocument.chartData.sort( function (a,b) { return a.Sample_ID.localeCompare(b.Sample_ID)});
    ChartDocument.samplelist = ChartDocument.chartData.map(function(ci) { 
        ChartDocument.chartDataMap[ ci.Sample_ID ] = ci;
        return ci.Sample_ID;
    }).sort();
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
            if (domain.study_label_name)
                query[domain.study_label_name] = {$in: ChartDocument.studies};

            if (domain.regex_genenames)
                query[domain.gene_label_name]  = {$in: ChartDocument.genelist.map(function(d) { return new RegExp("^" + d + "_.*", "i");})}
            else
                query[domain.gene_label_name]  = {$in: ChartDocument.genelist};

            var cursor = DomainCollections[domain.collection].find(query);
            // console.log("find", domain.collection, query, cursor.count(), domain);
	    
	    if (domain.format_type == 4) {
	        var studyCache = {};

		cursor.forEach(function(geneData) {
		    if (!(geneData.study_label in studyCache)) 
		        studyCache[geneData.study_label] = Collections.studies.findOne({id: geneData.study_label})

		    var study = studyCache[geneData.study_label];
		    var field_label = geneData.gene_label + ' ' + domain.labelItem;
		    ChartDocument.samplelist.map(function(sample_label) {
			if (!(sample_label in ChartDocument.chartDataMap))
                            ChartDocument.chartDataMap[sample_label] = {};
			ChartDocument.chartDataMap[sample_label][field_label] = geneData.rsem_quan_log2[study.gene_expression_index[sample_label]];
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

                if (domain.format_type == 3) {  // signature scores
                    if (sampleID in ChartDocument.chartDataMap) {
                        var obj = geneData;
                        var fields = domain.field.split('.');
                        fields.map(function(field){ obj = obj[field]; });

                        // console.log("found", label, geneName, sampleID, obj, fields, geneData);
			if (!(sampleID in ChartDocument.chartDataMap))
                            ChartDocument.chartDataMap[sampleID] = {};
                        ChartDocument.chartDataMap[sampleID][label] = obj;
			if (ChartDocument.metadata[label] == null)
			    ChartDocument.metadata[label] = { 
				collection: domain.collection,
				crf: null, 
				label: label,
				type: domain.field_type
			    };
                    }

                } else if (domain.format_type == 2) {  // sample names are stored as attributes
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
                } else if (domain.format_type == 1) {  // sample names are stored as labels
                    var label = ('transcript' in geneData) 
                        ? geneName + ' ' + geneData.transcript + ' ' + domain.labelItem
                        : geneName + ' ' + domain.labelItem
                    label = label.replace(/\./g,"_");
                    var samplelist =  ChartDocument.samplelist  && ChartDocument.samplelist.length > 0 ?
			_.intersection( ChartDocument.samplelist, Object.keys(geneData.samples) )
			: Object.keys(geneData.samples);


                    samplelist.map(function (sampleID) {
                        var fields = domain.field.split('.');

                        var obj = geneData.samples[sampleID];
                        fields.map(function(field){ obj = obj[field]; });

                        var f = parseFloat(obj);
                        if (!isNaN(f)) {
                            if (!(sampleID in ChartDocument.chartDataMap))
                                ChartDocument.chartDataMap[sampleID] = {};
                            ChartDocument.chartDataMap[sampleID][label] = f;

                            if (ChartDocument.metadata[label] == null) {
                                var m = {
                                    collection: domain.collection,
                                    crf: null, 
                                    label: label,
                                    type: domain.field_type
                                };
                                if (domain.field_type == "String" && typeof(obj) == "string") {
                                   if (m.allowedValues == null) m.allowedValues = [];
                                    m.allowedValues = _.union( m.allowedValues, obj);
                                }

                                ChartDocument.metadata[label] = m;
                            }
                        }
                    });
                } // else if geneData.gene
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

    var mapPatient_ID_to_Sample_ID = {};
    ChartDocument.chartData.map(function(cd) {
	 if (!(cd.Patient_ID in mapPatient_ID_to_Sample_ID))
	     mapPatient_ID_to_Sample_ID[cd.Patient_ID] = [ cd.Sample_ID ]
	 else
	     mapPatient_ID_to_Sample_ID[cd.Patient_ID].push(cd.Sample_ID);
    });
    if (ChartDocument.additionalQueries)
        ChartDocument.additionalQueries.map(function(query) {
             var query = JSON.parse(unescape(query));
	     // console.log("ChartDocument.additionalQueries", query);

             var crfName = query.c;
             var fieldName = query.f;
             var joinOn = query.j;
             var study = query.s;


	     if (study == null) study = "prad_wcdt";

	     var label = study + ":" + crfName + ":" + fieldName;
	     var m = Collections.Metadata.findOne({ name: crfName,  study: study});
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
	     fl.Sample_ID = 1;
	     fl.Patient_ID = 1;

	     // the following query needs study_id and perhaps sample_list
             Collections.CRFs.find({CRF:crfName}, {fields: fl }).forEach(function(doc) {


		 // should use joinOn instead here. But just use the simple heuristic of trying Sample_ID first, then Patient_ID
                 if (doc.Sample_ID && doc.Sample_ID in ChartDocument.chartDataMap) {
                     ChartDocument.chartDataMap[doc.Sample_ID][label] = doc[fieldName];
		     // console.log("joined Sample_ID", doc);
                 } else {
                     if (doc.Patient_ID in mapPatient_ID_to_Sample_ID) {
                         mapPatient_ID_to_Sample_ID[doc.Patient_ID].map(function(sample_ID) {
                             ChartDocument.chartDataMap[sample_ID][label] = doc[fieldName];
                         });
			  // console.log("joined through Patient_ID", doc);
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
    ChartDocument.chartData = ChartDocument.chartData.map(Transform_Clinical_Info, keyUnion);

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
  
        // console.log("Join", ChartDocument.Join)
        if (ChartDocument.Join == null ||  ChartDocument.Join == "Sample_ID")
            SampleJoin(userId, ChartDocument, fieldNames);
        else if (ChartDocument.Join == "Gene")
            GeneJoin(userId, ChartDocument, fieldNames);
    });// chart.after.update

    Charts.find({html: {$exists:0}}).forEach(function(doc) {
	// console.log("render", doc._id);
        ensureMinimalChart(doc);
	doc.html = renderJSdom(doc);
	Charts.direct.update({ _id : doc._id }, {$set: doc});
    });
});
