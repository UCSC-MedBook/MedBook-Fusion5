var extend = Meteor.npmRequire('node.extend');

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
    console.log("transform", transform);
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
			 console.log( dataValue, transform, cluster );
		     } else 
			console.log("isNan false", dataValue, typeof(dataValue));
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

// Do the heavy lifting for Joining Samples.
function SampleJoin(userId, ChartDocument, fieldNames) {
    // Step 0 alidate params
    var b = new Date();
    if (ChartDocument.studies == null || ChartDocument.length == 0) {
      return { dataFieldNames: [], chartData: []};
    }

    // var ChartDocument = Charts.findOne(_id == null ? { userId : Meteor.userId() } : { _id:_id});
    var q = ChartDocument.samplelist == null || ChartDocument.samplelist.length == 0 ? {} : {Sample_ID: {$in: ChartDocument.samplelist}};

    // Step 1. Use Clinical_Info as primary key
    q.Study_ID = {$in:ChartDocument.studies}; 
    q.CRF = "Clinical_Info";

    var chartData = Collections.CRFs.find(q).fetch();

    // Currently Clinical_Info metadata is a singleton. But when that changes, so must this:
    var metadata = Collections.Metadata.findOne({ name: "Clinical_Info"}).schema;  
   if (typeof(metadata) == "string")
       metadata = JSON.parse(metadata);
    Object.keys(metadata).map(function(f) {
	metadata[f].collection = "CRF";
	metadata[f].crf = "Clinical_Info";
    });

    chartData.map(function(cd) {  
       delete cd["CRF"];
    })


    // Step 2. Build Map and other bookkeeping 
    var chartDataMap = {};
    chartData.map(function (cd) { 
        delete cd["_id"];
        chartDataMap[cd.Sample_ID] = cd;
    });
    chartData.sort( function (a,b) { return a.Sample_ID.localeCompare(b.Sample_ID)});
    ChartDocument.samplelist = chartData.map(function(ci) { return ci.Sample_ID })


    // Step 3. 
    // Join all the Gene like information into the samples into the ChartDataMap table

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
            console.log("find", domain.collection, query, cursor.count());
	    
	    if (domain.type == 4) {
	        var studyCache = {};

		cursor.forEach(function(geneData) {
		    if (!(geneData.study_label in studyCache)) 
		        studyCache[geneData.study_label] = Collections.studies.findOne({id: geneData.study_label})

		    var study = studyCache[geneData.study_label];
		    var field_label = geneData.gene_label + ' ' + domain.labelItem;
		    ChartDocument.samplelist.map(function(sample_label) {
			chartDataMap[sample_label][field_label] = geneData.rsem_quan_log2[study.gene_expression_index[sample_label]];
		    });
		    console.log("type 4", geneData.gene_label);
		})

	    } else cursor.forEach(function(geneData) {

                var sampleID = geneData[domain.sample_label_name];
                var geneName = geneData[domain.gene_label_name];
                var label = geneName + ' ' + domain.labelItem;

                if (domain.type == 3) {  // signature scores
                    if (sampleID in chartDataMap) {
                        var obj = geneData;
                        var fields = domain.field.split('.');
                        fields.map(function(field){ obj = obj[field]; });

                        // console.log("found", label, geneName, sampleID, obj, fields, geneData);
                        chartDataMap[sampleID][label] = obj;
			if (metadata[label] == null)
			    metadata[label] = { 
				collection: domain.collection,
				crf: null, 
				label: label,
				type: "Number"
			    };
                    }

                } else if (domain.type == 2) {  // sample names are stored as attributes
                    if (sampleID in chartDataMap) {
                        var obj = geneData;
                        var fields = domain.field.split('.');
                        fields.map(function(field){ obj = obj[field]; });

                        // console.log("found", label, geneName, sampleID, obj);
                        chartDataMap[sampleID][label] = obj;
			if (metadata[label] == null)
			    metadata[label] = { 
				collection: domain.collection,
				crf: null, 
				label: label,
				max: 200,
				type: "Number"
			    };
                    }
                } else if (domain.type == 1) {  // sample names are stored as labels
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
                            if (sampleID in chartDataMap) {
                                chartDataMap[sampleID][label] = f;

				if (metadata[label] == null)
				    metadata[label] = { 
					collection: domain.collection,
					crf: null, 
					label: label,
					type: "Number"
				    };
                            }
                        }
                    });
                } // else if geneData.gene
            }); //cursor.forEach

            //  Samples without mutations need to have a wt
            if (domain.label == "Mutations") {
                var labels  = ChartDocument.genelist.map(function(geneName) { return geneName + ' ' + domain.labelItem});;
                ChartDocument.samplelist.map(function (sampleID) {
                    var datum = chartDataMap[sampleID];
                    labels.map(function(label) {
                        if (!(label in datum))
                            datum[label] = "wt";
                    });
                });
            }
          }); // .map 
    } // if ChartDocument.geneLikeDataDomain 

    var mapPatient_ID_to_Sample_ID = {};
    chartData.map(function(cd) {
	 if (!(cd.Patient_ID in mapPatient_ID_to_Sample_ID))
	     mapPatient_ID_to_Sample_ID[cd.Patient_ID] = [ cd.Sample_ID ]
	 else
	     mapPatient_ID_to_Sample_ID[cd.Patient_ID].push(cd.Sample_ID);
    });


    // Step 4. Merge in the CRFs
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
	     metadata[label] = msf;

             var fl = {};
             fl[fieldName] = 1;
	     fl.Sample_ID = 1;
	     fl.Patient_ID = 1;
             Collections.CRFs.find({CRF:crfName}, {fields: fl }).forEach(function(doc) {


		 // should use joinOn instead here. But just use the simple heuristic of trying Sample_ID first, then Patient_ID
                 if (doc.Sample_ID && doc.Sample_ID in chartDataMap) {
                     chartDataMap[doc.Sample_ID][label] = doc[fieldName];
		     // console.log("joined Sample_ID", doc);
                 } else {
                     if (doc.Patient_ID in mapPatient_ID_to_Sample_ID) {
                         mapPatient_ID_to_Sample_ID[doc.Patient_ID].map(function(sample_ID) {
                             chartDataMap[sample_ID][label] = doc[fieldName];
                         });
			 // console.log("joined through Patient_ID", doc);
		     } 
			 // else console.log("addQ", crfName, fieldName, doc);
                } // else
             }); // forEach

        }); //  ChartDocument.additionalQueries.map


    // Step 5. Transform any data.
    var keyUnion = {};  
    chartData.map(function(datum) { 
        Object.keys(datum).map(function(k) { keyUnion[k] = "N/A"; });
    });

    var dataFieldNames =  Object.keys(keyUnion);
    var cols = [];
    var rows = [];
    if (ChartDocument.pivotTableConfig  &&  ChartDocument.pivotTableConfig.cols)
	cols = _.without(ChartDocument.pivotTableConfig.cols, null);
    if (ChartDocument.pivotTableConfig  &&  ChartDocument.pivotTableConfig.rows)
	rows = _.without(ChartDocument.pivotTableConfig.rows, null);

    cols = _.intersection(cols, dataFieldNames);
    rows = _.intersection(rows, dataFieldNames);

    var selectedFieldNames = _.union(rows, cols);

    // normalize records
    chartData = chartData.map(Transform_Clinical_Info, keyUnion);

    var transforms = ChartDocument.transforms;
    if (transforms && transforms.length > 0) {
         var remodel = buildRemodelPlan(chartData, transforms, rows, cols);
	 console.log("remodel", remodel);

	 if (remodel.doIt) {
	     chartData = _.values(remodel.plan);
	     console.log("chartData", chartData);
	 } else {
	     chartData = dichotomizeOrBin(chartData, transforms, rows, remodel);
	 }
    } // if transforms

    // Step 6. Remove the excluded samples and (eventually) any other spot criteria.
    var exclusions = ChartDocument.pivotTableConfig.exclusions;
    if (exclusions == null) exclusions = [];
    var excludedKeys = _.intersection(Object.keys(exclusions), selectedFieldNames); // only those names that are engaged.
    if (excludedKeys.length > 0)
	chartData =  chartData.filter(function(elem) {
	    for (var i = 0; i < excludedKeys.length; i++) {
	       var key = excludedKeys[i];
	       if (key in elem && exclusions[key].indexOf(String(elem[key])) >= 0)
		   return false;
	       return true;
	    }
	});
    chartData = chartData.sort(function(a,b) { 
        var something = 0;
        for (var i = 0; i < selectedFieldNames.length; i++) {
	   var key = selectedFieldNames[i];
	   if (key in a && key in b) {
	       return naturalSort(a[key], b[key]);
	   /*
	       if (a[key] < b[key])
		   return -1;
	       if (a[key] > b[key])
		   return 1;
	   */
	   } else {
	       if (key in a)
		   something = 1;
	       else if (key in b)
		   something = -1;
	       else 
		   something = 0;
	   }
       }
       return something;
    });

    // Step Final. We are done. Store the result back in the database and let the client take it from here.
    // console.log("renderChartData", chartData.length);

    ChartDocument.chartData = chartData;
    ChartDocument.dataFieldNames = dataFieldNames;
    ChartDocument.selectedFieldNames = selectedFieldNames;
    ChartDocument.metadata = metadata;

    var html = renderJSdom(ChartDocument);

    var ret = Charts.direct.update({ _id : ChartDocument._id }, 
          {$set: 
              {
                dataFieldNames: ChartDocument.dataFieldNames,
                selectedFieldNames: ChartDocument.selectedFieldNames,
                elapsed: ChartDocument.elapsed,
		metadata: ChartDocument.metadata,
                chartData: ChartDocument.chartData,
		html: html,
		"pivotTableConfig.rows": rows, 
		"pivotTableConfig.cols": cols, 
               }});



    // console.log("done", ret);
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
	console.log("render", doc._id);
        ensureMinimalChart(doc);
	doc.html = renderJSdom(doc);
	Charts.direct.update({ _id : doc._id }, {$set: doc});
    });
});
