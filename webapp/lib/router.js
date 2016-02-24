
/*
Meteor.startup(function() {
  if (Meteor.isServer) {
     Expression._ensureIndex( {gene:1, studies:1});
     Expression_Isoform._ensureIndex( {gene:1, studies:1});
  }
});
*/

/*
Router.onBeforeAction(function () {
  // all properties available in the route function
  // are also available here such as this.params

  var user = Meteor.user();
  if (user && user.profile && user.profile.collaborations && user.profile.collaborations.indexOf("WCDT")) {
      this.next();
      return;
  }
  this.render('signin');

});
*/


Router.configure({
  layoutTemplate: 'MasterLayout',
  loadingTemplate: 'appLoading',
});

if (Meteor.isClient)
    window.updateUrl = function(url, id) {


	if (url.indexOf('?') > 0)
	    url += '&id=' +id;
	else {
	    if (url.length > 0 && url[url.length -1] != '/')
                url += '/?id=' +id;
            else
                url += '?id=' +id;
        }
	window.history.replaceState(null, null, url);
  };


function data() {
    var defaultQ = {
        post: {$exists: 0},
        userId: Meteor.userId()
    };
    var theChart = null;
    var id = this.params._id || this.params.query.id;

    if (this.params.query.id != null) { // needs to be !=  never !==
	theChart = Charts.findOne({_id: id});
    } else {
	theChart = Charts.find(defaultQ, {sort: {updatedAt: -1}, limit:1}).fetch()[0]
	if (theChart) {  // needs to be == never ===
	    Meteor.subscribe("TheChart", theChart._id);
	    var url = Router.current().url;
	    updateUrl(url, theChart._id);
	}
    }
    if (theChart)
	TheChartID = theChart._id;
    return theChart;
}

function waitOn() {
    return [
      Meteor.subscribe('MyCharts'),
      Meteor.subscribe('TheChart', this.params._id || this.params.query.id),
      Meteor.subscribe('FusionFeatures'),
      Meteor.subscribe('Metadata'),
      Meteor.subscribe('studies')
    ];
}

Router.map(function() {
  this.route('home', {
    template: "SampleFusion",
    path: '/fusion/',
    waitOn: waitOn,
    data: data,
  });
});

Router.map(function() {
  this.route('display', {
    template: "SampleFusion",
    onBeforeAction: function() { this.state.set("NoControls", true); this.next();},
    path: '/fusion/display/:_id',
    data: data,
    waitOn: waitOn,
  });
});

Router.map(function() {
  this.route('edit', {
    template: "SampleFusion",
    path: '/fusion/edit',
    data: data,
    waitOn: waitOn,
  });
});

Router.map(function() {
  this.route('all', {
    template: "AllCharts",
    path: '/fusion/all/',
    waitOn: function() {
       return [ Meteor.subscribe("AllCharts"), Meteor.subscribe('FusionFeatures')]
    }
  });
});


Router.map(function() {
  this.route('fusionDownload', {
    template: "Download",
    path: '/fusion/download/',
    waitOn: function() {
      return [
	  Meteor.subscribe('Metadata'),
	  Meteor.subscribe('FusionFeatures'),
	  Meteor.subscribe('studies')
      ];
    },
    onBeforeAction : function(arg) {
       Session.set("BrowseStudies", null);
       Session.set("BrowseTable", null);
       this.next();
    }
  });
});



Router.map(function() {
  this.route('fusionDownloadTable', {
    path: '/fusion/downloadTable/',
    template: null,
    onBeforeAction : function(arg) {
	var data = Session.get('ChartDataFinal');
	var name = Session.get('CurrentChart').studies.join("_") + "_" + data.length + ".txt";
	var keys = Session.get("ChartDataFinalKeys");

	saveTextAs(ConvertToTSV(data, keys), name);
        this.next();
    }
  });
});


Router.map(function() {
  this.route('fusionTables', {
    template: "TableBrowser",
    path: '/fusion/tables/',
    data: data,
    waitOn: function() {
      return [
	  Meteor.subscribe('Metadata'),
	  Meteor.subscribe('FusionFeatures'),
	  Meteor.subscribe('studies')
      ];
    },
    onBeforeAction : function(arg) {
       Session.set("BrowseStudies", null);
       Session.set("BrowseTable", null);
       this.next();
    }
  });
});

Router.map(function() {
  this.route('fusionTablesStudyTable', {
    template: "TableBrowser",
    path: '/fusion/tables/:_study/:_table/',
    data: data,
    waitOn: function() {
       return [Meteor.subscribe("Metadata"), Meteor.subscribe('FusionFeatures')]
    },
    onBeforeAction : function(arg) {
       var study =  this.params._study;
       var table = this.params._table;
       var user = Meteor.user();

       if (study === null) {
	   var last = user && user.profile && user.profile.lastCRFroute;
	   if (last) {
	       var a = last.split("/");
	       study = a[2];
	       table = a[3];
	   }
       }

       Session.set("BrowseStudies", [study]);
       Session.set("BrowseTable", table);
       this.next();
    }
  });
});

Router.map(function() {
  this.route('DIPSC', {
    template: "DIPSC",
    path: '/fusion/DIPSC/',
    data: data,
    waitOn: function() {
       return [
	   Meteor.subscribe("Metadata"),
	   Meteor.subscribe('FusionFeatures'),
	   Meteor.subscribe('studies')
     ];
    }
  });
});



Router.map(function() {
  this.route('import', {
    template: "DataImport",
    path: '/fusion/import',
    waitOn: waitOn,
  });
});

function parseCookies (request) {
    var list = {},
        rc = request.headers.cookie;

    rc && rc.split(';').forEach(function( cookie ) {
        var parts = cookie.split('=');
        list[parts.shift().trim()] = decodeURI(parts.join('='));
    });

    return list;
}

function genomicDataMutations(coll, samplesAllowed, studiesFiltered, response)  {

  /*
  var yyy =  db.mutations.aggregate( [ 
        { $group:
	    {
		_id: "$gene_label",
		samples: { $push:  "$sample_label" },
		size: {$sum:1},
	    }
	}, 
	{ $sort: { size:-1 } }

    ]);
  */


  var cursor = coll.find(
      {
	  study_label: {$in: studiesFiltered},
	  sample_label: {$in: samplesAllowed},
      },
      {sort:{gene_label:1, sample_label:1, study_label:1}});

  var gene_label = null;
  var bucket = {};
  function flush(symbol) {
      response.write(symbol);
      samplesAllowed.map(function(sample) {
	  response.write("\t");
	  if (sample in bucket)
	      response.write("1");
	  else
	      response.write("0");
      });
      response.write("\n");
      bucket = {};
  }

  cursor.forEach(function(doc) {
      if (gene_label != null && gene_label != doc.gene_label)
	  flush(gene_label);
      gene_label = doc.gene_label;
      bucket[doc.sample_label] = 1;
  });
  flush(gene_label);
}


function genomicDataSamples2(coll, samplesAllowed, studiesFiltered, response)  {
     var cursor = coll.find(
	  {
	      study_label:  {$in: studiesFiltered},
	      sample_label: {$in: samplesAllowed},
	  },
	  {sort:{gene_label:1, sample_label:1, study_label:1}});



      var bucket = {};
      function flush(symbol) {
	  response.write(symbol);
	  samplesAllowed.map(function(sample) {
	      response.write("\t");
	      if (sample in bucket)
		  response.write(String(bucket[sample]));
	  });
	  response.write("\n");
	  bucket = {};
      }

      var gene_label = null;
      cursor.forEach(function(doc) {
	  if (gene_label != null && gene_label != doc.gene_label) {
	      flush(gene_label);
	  }
	  gene_label = doc.gene_label;
	  bucket[doc.sample_label] = doc.values.quantile_counts_log;
      });
      flush(gene_label);
}

function genomicDataSamples1(coll, samplesAllowed, studiesFiltered, response)  {
  coll.find(
	  {Study_ID: {$in: studiesFiltered}},
	  {sort:{gene:1, studies:1}}).forEach(function(doc) {

      var line = doc.gene;
      if ('transcript' in doc) // for isoforms
         line  += ' '+ doc.transcript;
      var any_got_rsem = false;
      samplesAllowed.map(function(sample_label) {
          line += "\t";
          var value_container = doc.samples[sample_label];
          if (value_container && "rsem_quan_log2" in value_container) {
              any_got_rsem = true;
              line += String(value_container.rsem_quan_log2);
          }
      });
      line += "\n";
      if (any_got_rsem)
          response.write(line);
  });
}

function clinical(coll, samplesAllowed, studiesFiltered, response)  {
  coll.find(
	  {Study_ID: {$in: studiesFiltered}},
	  {sort:{gene:1, studies:1}}).forEach(function(doc) {
	      var line = doc.gene;
	      if ('transcript' in doc) // for isoforms
		 line  += ' '+ doc.transcript;
	      var any_got_rsem = false;
	      samplesAllowed.map(function(sample_label) {
		  line += "\t";
		  var value_container = doc.samples[sample_label];
		  if (value_container && "rsem_quan_log2" in value_container) {
		      any_got_rsem = true;
		      line += String(value_container.rsem_quan_log2);
		  }
	      });
	      line += "\n";
	      if (any_got_rsem)
		  response.write(line);
	  });
}

if (Meteor.isServer) {
    Meteor.startup(function() {
	GeneLikeDataDomainsPrototype.map(function(domain) {
	    if (domain.index) {
	        console.log("Ensuring index ", domain.collection);
		DomainCollections[domain.collection]._ensureIndex(domain.index);
	    }
	})
    });
};


function loginMLT(request, params) {
  // First Security Check, is the user logged in?
  var cookies = parseCookies(request);
  var mlt = cookies.meteor_login_token;
  if (mlt == null) {
      mlt = params.query.mlt
      console.log("params mlt", mlt);
  } else
      console.log("cookies mlt", mlt);
  var user = null;
  if (mlt) {
      var hash_mlt =  Accounts._hashLoginToken(mlt);
      user =  Meteor.users.findOne({"services.resume.loginTokens.hashedToken": hash_mlt});
  }
  if (user === null) throw new Error("user must be logged in. Cookies=" + JSON.stringify(cookies));
  return user;
}


exportData = function() {
  console.log("request", this.request.headers);

  var isLocal = this.request.headers ['x-forwarded-for'] ==  '127.0.0.1';
  var collaborations  = [];

  if (!isLocal) {
      user = loginMLT(this.request, this.params);
      if (user == null)
          return;
      if (user.collaborations)
	  collaborations = user.colluser.collaborations;
  }

  // Kind parameter
  var kind = 'genomic';
  var local = null;


  if (this.params && this.params.query && this.params.query.kind) {
      kind = this.params.query.kind;
  }
  if (this.params && this.params.query && this.params.query.local) {
      local = this.params.query.local;
  }


  // Datatype parameter
  var table = 'Expression';
  if (this.params && this.params.query && this.params.query.table) {
      table = this.params.query.table;
  }

  // Filename parameter
  var attachmentFilename = 'filename.txt';
  if (this.params && this.params.query && this.params.query.filename)
      attachmentFilename = this.params.query.filename;


  // Studies requsted parameter, default to prad_wcdt for now
  var studiesRequested;
  if (this.params && this.params.query && this.params.query.study)
      studiesRequested = [this.params.query.study];
  else if (this.params && this.params.query && this.params.query.studies)
      studiesRequested = this.params.query.studies;
  else
      studiesRequested = ["prad_wcdt"];


  // Filter studies to only thosea allowed by collaborations
  var studiesFiltered = [];
  var samplesAllowed = [];
  var query = { id: {$in: studiesRequested} };
  if (!isLocal) 
      query.collaborations = {$in: ["public"].concat(collaborations)};

  Collections.studies.find( query, {fields: {id:1, Sample_IDs: 1}}).forEach( function(doc) {
      studiesFiltered.push(doc.id);
      samplesAllowed = _.union(samplesAllowed, doc.Sample_IDs);
  });

  if (isLocal)
     studiesFiltered = studiesRequested;

  // Last Security check
  if (studiesFiltered.length === 0 || samplesAllowed.length === 0)
      throw new Error("must specify studies that your collaborations are allowed to use");


  var response = this.response;
  var outstream;

  if (local != null) {
      outstream = fs.createWriteStream(local, {encoding: "utf8"});

  } else {
      response.writeHead(200, {
	// 'Content-Type': 'text/tab-separated-values',
	'Content-Disposition': 'attachment; filename="' + attachmentFilename +'"',
	'Cache-Control': 'no-cache, no-store, must-revalidate',
	'Pragma': 'no-cache',
	'Expires': '0',
      });
      outstream = response;
  }

  samplesAllowed = samplesAllowed.sort();


  if (kind == "genomic") {
      outstream.write("Gene");
      samplesAllowed.map(function(sample_label) {
	  outstream.write("\t");
	  outstream.write(sample_label);
      });
      outstream.write("\n");
      var coll =  DomainCollections[table];
      if (table == "Mutations")
	  genomicDataMutations(coll, samplesAllowed, studiesFiltered, outstream);
      else if (true)
	  genomicDataSamples2(coll, samplesAllowed, studiesFiltered, outstream);
      else
	  genomicDataSamples1(coll, samplesAllowed, studiesFiltered, outstream);

  } else if (kind == "clinical") {
      var meta = Collections.Metadata.findOne({name: table});

      var data = Collections.CRFs.find(
	  {
	      CRF: table,
	      Study_ID: {$in: studiesFiltered}
	  },
	  {sort: {Sample_ID:1}}).fetch();

      data.map(function(row,i) {
	  Object.keys(row).map(function(key) {
	      if (Array.isArray(row[key]))
		  row[key] = row[key].join(";");
	  });
      });
      outstream.write(ConvertToTSV(data, meta.fieldOrder));
  }

  outstream.end();
  if (isLocal)
     response.end();
};

Router.map(function() {
  this.route('export', {
    where: 'server',
    action: exportData,
  });
});

exportChart = function() {
  // First Security Check, is the user logged in?
  var user = loginMLT(this.request, this.params);

  // Filename parameter
  var attachmentFilename = 'filename.txt';
  if (this.params && this.params.query && this.params.query.filename)
      attachmentFilename = this.params.query.filename;

  var response = this.response;
  response.writeHead(200, {
    // 'Content-Type': 'text/tab-separated-values',
    'Content-Disposition': 'attachment; filename="' + attachmentFilename +'"',
  });

  var chart = Charts.findOne({_id: this.params.query.id });
  if (chart) {
      var ptc = chart.pivotTableConfig;
      var keys = ["Patient_ID", "Sample_ID"].concat(ptc.cols, ptc.rows);
      response.write(keys.join("\t")+"\n");

      chart.chartData.map(function(doc) {
	  var values = keys.map(function (k) { return String(doc[k]); });
          response.write(values.join("\t")+"\n");
      });
  }
  response.end();
};

Router.map(function() {
  this.route('exportChart', {
    where: 'server',
    action: exportChart,
  });
});

