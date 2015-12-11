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
    delete f["On_Study_Date"];
    delete f["Off_Study_Date"];

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
    // console.log("big",big.length);

     Charts.direct.update({ _id : ChartDocument._id }, 
          {$set: 
              {
                dataFieldNames: ['Expression', 'Variance', 'Mutation'],
                selectedFieldNames: ['Expression', 'Variance', 'Mutation'],
                chartData: big
               }});
}

// Do the heavy lifting for Joining Samples.
function SampleJoin(userId, ChartDocument, fieldNames) {
    // Step 0 alidate params
    var b = new Date();
    if (ChartDocument.studies == null || ChartDocument.length == 0) {
      // console.log("No studies selected");
      return { dataFieldNames: [], chartData: []};
    }

    // var ChartDocument = Charts.findOne(_id == null ? { userId : Meteor.userId() } : { _id:_id});
    var q = ChartDocument.samplelist == null || ChartDocument.samplelist.length == 0 ? {} : {Sample_ID: {$in: ChartDocument.samplelist}};

    // Step 1. Use Clinical_Info as primary key
    q.Study_ID = {$in:ChartDocument.studies}; 
    q.CRF = "Clinical_Info";

    var chartData = Collections.CRFs.find(q).fetch();
    // console.log("chartData CRFs length", q, chartData.length);

    // Currently Clinical_Info metadata is a singleton. But when that changes, so must this:
    var metadata = Collections.Metadata.findOne({ name: "Clinical_Info"}).schema;  
    Object.keys(metadata).map(function(f) {
	metadata[f].collection = "CRF";
	metadata[f].crf = "Clinical_Info";
    });

    chartData.map(function(cd) {  
       delete cd["CRF"];
    })
    // console.log(q, "chartData length", chartData.length);


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
    var gl  = ChartDocument.genelist;
    var gld = ChartDocument.geneLikeDataDomain;

    if (gld && gl && gld.length > 0 && gl.length > 0)  {

        gld
          .filter(function(domain) {return domain.state})
          .map(function(domain) {
            var query = {Study_ID:{$in: ChartDocument.studies}};
            var qf = domain.label == "Mutations" ? "Hugo_Symbol" : "gene";
            query[qf] = {$in: gl};

            var cursor = DomainCollections[domain.collection].find(query);
            console.log("GeneLikeDomain", ChartDocument._id, domain.label, domain.collection, query, cursor.count());
	    
            cursor.forEach(function(geneData) {
                // Mutations are organized differently than Expression
                if (geneData.Hugo_Symbol) { 
                    var geneName = geneData.Hugo_Symbol;
                    var label = geneName + ' ' + domain.labelItem;

                    var sampleID = geneData.sample;

                    if (sampleID in chartDataMap) {
                        chartDataMap[sampleID][label] = geneData.Variant_Type;

			if (metadata[label] == null)
			    metadata[label] = { 
				collection: domain.collection,
				crf: null, 
				label: label,
				max: 200,
				type: "String"
			    };
                    }
                } else if (geneData.gene) {

                    var geneName = geneData.gene;
                    var label = ('transcript' in geneData) 
                        ? geneName + ' ' + geneData.transcript + ' ' + domain.labelItem
                        : geneName + ' ' + domain.labelItem
                    label = label.replace(/\./g,"_");
                    var samplelist =  ChartDocument.samplelist  && ChartDocument.samplelist.length > 0 ?
			_.intersection( ChartDocument.samplelist, Object.keys(geneData.samples) )
			: Object.keys(geneData.samples);


                    samplelist.map(function (sampleID) {
                        var f = parseFloat(geneData.samples[sampleID][domain.field]);
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
                var labels  = gl.map(function(geneName) { return geneName + ' ' + domain.labelItem});;
                ChartDocument.samplelist.map(function (sampleID) {
                    var datum = chartDataMap[sampleID];
                    labels.map(function(label) {
                        if (!(label in datum))
                            datum[label] = "wt";
                    });
                });
            }
          }); // .map 
    } // if gld 

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

    var selectedFieldNames = 
    ChartDocument.pivotTableConfig ?
      _.without(_.union( ChartDocument.pivotTableConfig.cols, ChartDocument.pivotTableConfig.rows ),null)     : [];


    chartData = chartData.map(Transform_Clinical_Info, keyUnion);

    var transforms = ChartDocument.transforms;
    if (transforms)
         chartData.map(function transformer(datum) {
             transforms.map(function(transform) {
                 if (transform.field in datum) {
                    if (transform.op == "bin") {
                         var dataValue = parseFloat(datum[transform.field]);
                         var binValue = parseFloat(transform.value);
                         if (!isNaN(dataValue) && !isNaN(binValue)) {
                            var flooredValue = Math.floor(dataValue / binValue);
                            datum[transform.field] = flooredValue * binValue;
                         }
                     } else if (transform.op == "rename") {
                        // console.log("rename", transform.value,"<-", transform.field);
                        datum[transform.value] = datum[transform.field];
                        delete datum[transform.field];
                     }
                 } 
             });
        });

    // Step 6. We are done. Store the result back in the database and let the client take it from here.
      // console.log("renderChartData", chartData.length);
      var ret = Charts.direct.update({ _id : ChartDocument._id }, 
          {$set: 
              {
                dataFieldNames: dataFieldNames,
                selectedFieldNames: selectedFieldNames,
		metadata: metadata,
                chartData: chartData
               }});

   // Possible Step 7. Render the visualization on the server (possible with D3, not clear how to do with Google Vis).
      // console.log("done", ret);
} 


Meteor.startup(function() {
    Charts.after.update( function(userId, ChartDocument, fieldNames) {
        console.log("Join", ChartDocument.Join)
        if (ChartDocument.Join == null ||  ChartDocument.Join == "Sample_ID")
            SampleJoin(userId, ChartDocument, fieldNames);
        else if (ChartDocument.Join == "Gene")
            GeneJoin(userId, ChartDocument, fieldNames);
    });// chart.after.update
});
