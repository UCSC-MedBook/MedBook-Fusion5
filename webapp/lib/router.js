

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

/*
Router.map(function() {
  this.route('home', {
    template: "SampleFusion",
    path: '/fusion/',
    waitOn: waitOn,
    data: data,
  });
});
*/

Router.map(function() {
  this.route('display', {
    onBeforeAction: function() {  
        var url = "/fusion/?id=" + this.params._id;
        Router.go(url);
    },
    path: '/fusion/display/:_id',
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
  this.route('home', {
    template: "topLevel",
    path: '/fusion/',

    data: data,

    waitOn: function() {
      return [
          Meteor.subscribe('MyCharts'),
          Meteor.subscribe('TheChart', this.params._id || this.params.query.id),
          Meteor.subscribe('FusionFeatures'),
          Meteor.subscribe('Metadata'),
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
  this.route('import', {
    template: "DataImport",
    path: '/fusion/import',
    waitOn: waitOn,

    onBeforeAction : function(arg) {
       Session.set("activeTabs", "Import");
       this.next();
    }
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

function genomicDataMutations(coll, samplesAllowed, study, response)  {
  var cursor = coll.find( { study_label: study.id }, {sort:{gene_label:1, sample_label:1, study_label:1}});
  cursor.forEach(function(doc) { response.write(JSON.stringify(doc)); });
}


function genomicDataMutationsRectangle(coll, samplesAllowed, study, stream)  {
  var cursor = coll.find( { study_label: study.id }, {sort:{gene_label:1, sample_label:1, study_label:1}});
  var gene_label = null;
  var bucket = {};
  function flush(symbol) {
      stream.write(symbol);
      samplesAllowed.map(function(sample) {
	  stream.write("\t");
	  if (sample in bucket)
	      stream.write("1");
	  else
	      stream.write("0");
      });
      stream.write("\n");
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

function genomicDataSamples3(coll, study, response)  {
      var sort_order = study.Sample_IDs.sort().map(function( sample_id) {
	  return study.gene_expression_index[sample_id];
      })
      var tick = Date.now();

      var cursor = Expression3.find({ study_label:  study.id }, {sort:{gene_label:1, sample_label:1, study_label:1}});
      var count = cursor.count();
      console.log( "core uncork end", response.cork == null, response.uncork == null, response.end == null);
      console.log("cork", response.cork == null);
      response.setTimeout(20000 * 60 * 1000);
      if (response.cork)
          response.cork();
      cursor.forEach(function(doc) {
          var line = doc.gene_label;
	  sort_order.map(function(i, j) {
	     line += "\t";
             if (doc.rsem_quan_log2[i])
                 line += String(doc.rsem_quan_log2[i]);
	  });
	  line += "\n";
	  response.write(line);
          if ((count % 1000) == 0) {
              if (response.cork) response.cork();
              if (response.uncork) response.uncork();
          }
          --count;
      });
      if (response.uncork)
          response.uncork();
      if (response.end)
          response.end();
      console.log("cursor download",count, "response.finished", response.finished );
}


function clinical(coll, samplesAllowed, study_label, response)  {
  coll.find(
	  {Study_ID: study_label},
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
        Charts._ensureIndex({updatedAt: -1});

	GeneLikeDataDomainsPrototype.map(function(domain) {
	    if (domain.index) {
	        console.log("Ensuring index ", domain.collection);
		DomainCollections[domain.collection]._ensureIndex(domain.index);
	    }
	})
        Expression3._ensureIndex( {study_label: 1} );
        Expression3._ensureIndex( {gene_label:1, sample_label:1, study_label:1});
        Expression3._ensureIndex( {study_label:1, gene_label:1, sample_label:1, study_label:1});
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

  var isLocal =  this.request.headers ['x-forwarded-for'] == '127.0.0.1';
  var collaborations  = [];
  if (!isLocal) {
      var user = loginMLT(this.request, this.params);
      if (user == null)
          return;
      if (user.collaborations)
	  collaborations = user.collaborations;
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

  // Studies requsted parameter, default to prad_wcdt for now
  var study_query = { }
  if (this.params && this.params.query && this.params.query.study && this.params.query.study.length > 0)
      study_query.id = this.params.query.study;
  else
      study_query.id = "prad_wcdt";

  // Filename parameter
  var attachmentFilename = table + '_' + study_query.id + '.txt';
  if (this.params && this.params.query && this.params.query.filename)
      attachmentFilename = this.params.query.filename;


  // Filter studies to only thosea allowed by collaborations
  if (!isLocal) 
      study_query.collaborations = {$in: ["public"].concat(collaborations)};

  study = Collections.studies.findOne( study_query );

  if (study == null) {
     console.log("No Study Found", study_query);
     response.end();
     return;
  }


  var response = this.response;
  var outstream;

  if (local != null) {
      console.log("local", local);
      outstream = fs.createWriteStream(local, {encoding: "utf8"});
  } else {


      // Fill from cache
      var path = process.env.MEDBOOK_WORKSPACE +"/cache/" + attachmentFilename;
      if (fs.existsSync(path)) {
          console.log("Filling from cache", path);
          var stat = fs.statSync(path)
	  response.writeHead(200, {
	    'Content-Disposition': 'attachment; filename="' + attachmentFilename +'"',
	    'Content-Length': String(stat.size),
	    'Cache-Control': 'no-cache, no-store, must-revalidate',
	    'Pragma': 'no-cache',
	    'Expires': '0',
	  });
	  var readStream = fs.createReadStream(path);
	  readStream.pipe(response);
	  return;

      } else {
 
	  response.writeHead(200, {
	    'Content-Disposition': 'attachment; filename="' + attachmentFilename +'"',
	    'Cache-Control': 'no-cache, no-store, must-revalidate',
	    'Pragma': 'no-cache',
	    'Expires': '0',
	  });
	  outstream = response;
      }
  }

  if (kind == "genomic") {

      outstream.write("Gene");
      study.Sample_IDs.map(function(sample_label) {
	  outstream.write("\t");
	  outstream.write(sample_label);
      });
      outstream.write("\n");
      var coll =  DomainCollections[table];
      if (table == "Mutations")
	  genomicDataMutations(coll, study.Sample_IDs, study, outstream);
      else 
	  genomicDataSamples3(Expression3, study, outstream);

  } else if (kind == "clinical") {
      var meta = Collections.Metadata.findOne({name: table});
      var q = {
	      CRF: table,
	      Study_ID: study.id,
	  };
      console.log("q", q);

      var data = Collections.CRFs.find(q, {sort: {Sample_ID:1}}).fetch();

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

  var isLocal =  this.request.headers ['x-forwarded-for'] ==  '127.0.0.1';
  var collaborations  = [];
  if (!isLocal) {
      var user = loginMLT(this.request, this.params);
      if (user == null)
          return;
      if (user.collaborations)
	  collaborations = user.collaborations;
  }

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

