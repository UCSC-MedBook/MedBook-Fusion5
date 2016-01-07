
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
  this.route('GeneFusion', {
    template: "GeneFusion",
    path: '/fusion/gene/',
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
  var Hugo_Symbol = null;

  var cursor = coll.find(
      {
	  Study_ID: {$in: studiesFiltered},
	  sample: {$in: samplesAllowed},
	  "MA_FImpact": {$in: ["medium", "high"]},
      },
      {sort:{Hugo_Symbol:1, sample:1}});


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
      if (Hugo_Symbol != doc.Hugo_Symbol) {
	  Hugo_Symbol = doc.Hugo_Symbol;
	  flush(Hugo_Symbol);
      }
      bucket[doc.sample] = 1;
  });
  flush(Hugo_Symbol);
}


function genomicDataSamples(coll, samplesAllowed, studiesFiltered, response)  {
  coll.find({Study_ID: {$in: studiesFiltered}}, {sort:{gene:1, studies:1}}).forEach(function(doc) {
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
  coll.find({Study_ID: {$in: studiesFiltered}}, {sort:{gene:1, studies:1}}).forEach(function(doc) {
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


exportData = function() {
  // First Security Check, is the user logged in?
  var cookies = parseCookies(this.request);
  var mlt = cookies.meteor_login_token;
  var user = Meteor.users.findOne({username: "ted"}); // hack for debugging
  if (mlt) {
      var hash_mlt =  Accounts._hashLoginToken(mlt);
      user = Meteor.users.findOne({"services.resume.loginTokens.hashedToken": hash_mlt});
  }
  if (user === null)
      throw new Error("user must be logged in. Cookies=" + JSON.stringify(cookies));

  // Kind parameter
  var kind = 'genomic';
  if (this.params && this.params.query && this.params.query.kind) {
      kind = this.params.query.kind;
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
  Collections.studies.find( {
        id: {$in: studiesRequested},
        collaborations: {$in: ["public"].concat(user.profile.collaborations)}
      },
      {fields: {id:1, Sample_IDs: 1}}
  ).forEach( function(doc) {
      studiesFiltered.push(doc.id);
      samplesAllowed = _.union(samplesAllowed, doc.Sample_IDs);
  });

  // Last Security check
  if (studiesFiltered.length === 0 || samplesAllowed.length === 0)
      throw new Error("must specify studies that your collaborations are allowed to use");


  var response = this.response;
  response.writeHead(200, {
    // 'Content-Type': 'text/tab-separated-values',
    'Content-Disposition': 'attachment; filename="' + attachmentFilename +'"',
  });

  samplesAllowed = samplesAllowed.sort();

  if (kind == "genomic") {
      response.write("Gene");
      samplesAllowed.map(function(sample_label) {
	  response.write("\t");
	  response.write(sample_label);
      });
      response.write("\n");
      var coll =  DomainCollections[table];
      if (table == "Mutations")
	  genomicDataMutations(coll, samplesAllowed, studiesFiltered, response);
      else
	  genomicDataSamples(coll, samplesAllowed, studiesFiltered, response);

  } else if (kind == "clinical") {
      var meta = Collections.Metadata.findOne({name: table});
      var data = Collections.CRFs.find({CRF: table, Study_ID: {$in: studiesFiltered}}, {sort: {Sample_ID:1}}).fetch();
      data.map(function(row,i) {
	  Object.keys(row).map(function(key) {
	      if (Array.isArray(row[key]))
		  row[key] = row[key].join(";");
	  });
      });
      response.write(ConvertToTSV(data, meta.fieldOrder));
  }

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
  var cookies = parseCookies(this.request);
  var mlt = cookies["meteor_login_token"];
  var user = null;
  if (mlt) {
      var hash_mlt =  Accounts._hashLoginToken(mlt);
      user = Meteor.users.findOne({"services.resume.loginTokens.hashedToken": hash_mlt});
  }
  if (user == null)
      // throw new Error("user must be logged in. Cookies=" + JSON.stringify(cookies));
      console.log("user should be logged in. Cookies=" + JSON.stringify(cookies));

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

