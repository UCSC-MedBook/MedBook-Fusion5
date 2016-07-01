

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
      Meteor.subscribe('data_sets')
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
	  Meteor.subscribe('data_sets')
      ];
    },
    onBeforeAction : function(arg) {
       Session.set("BrowseDataSets", null);
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
	var name = Session.get('CurrentChart').data_sets.join("_") + "_" + data.length + ".txt";
	var keys = Session.get("ChartDataFinalKeys");

	saveTextAs(ConvertToTSV(data, keys), name);
        this.next();
    }
  });
});


Router.map(function() {
  this.route('SpreadsheetContainer', {
    template: "SpreadsheetContainer",
    path: '/fusion/ss/',
    data: data,
    waitOn: function() {
      return [
	  Meteor.subscribe('Metadata'),
	  Meteor.subscribe('FusionFeatures'),
	  Meteor.subscribe('data_sets')
      ];
    },
    onBeforeAction : function(arg) {
       Session.set("BrowseDataSets", null);
       Session.set("BrowseTable", null);
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
	  Meteor.subscribe('data_sets')
      ];
    },
    onBeforeAction : function(arg) {
       Session.set("BrowseDataSets", null);
       Session.set("BrowseTable", null);
       this.next();
    }
  });
});

Router.map(function() {
  this.route('fusionTablesDataSets', {
    template: "TableBrowser",
    path: '/fusion/tables/:_data_set/:_table/',
    data: data,
    waitOn: function() {
       return [Meteor.subscribe("Metadata"), Meteor.subscribe('FusionFeatures')]
    },
    onBeforeAction : function(arg) {
       var data_set =  this.params._data_set;
       var table = this.params._table;
       var user = Meteor.user();

       if (data_set === null) {
	   var last = user && user.profile && user.profile.lastCRFroute;
	   if (last) {
	       var a = last.split("/");
	       data_set = a[2];
	       table = a[3];
	   }
       }

       Session.set("BrowseDataSets", [data_set]);
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
	   Meteor.subscribe('data_sets')
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
          Meteor.subscribe('data_sets')
      ];
    },

    onBeforeAction : function(arg) {
       Session.set("BrowseDataSets", null);
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

function genomicDataMutations(coll, samplesAllowed, data_set, response)  {
  var cursor = coll.find( { data_set_label: data_set._id }, {sort:{gene_label:1, sample_label:1, data_set_label:1}});
  cursor.forEach(function(doc) { response.write(JSON.stringify(doc)); });
}


function genomicDataMutationsRectangle(coll, samplesAllowed, data_set, stream)  {
  var cursor = coll.find( { data_set_label: data_set._id }, {sort:{gene_label:1, sample_label:1, data_set_label:1}});
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

function genomicDataSamples(coll, data_set, response)  {
      var sort_order = data_set.sample_labels.sort().map(function( primaryKey) {
	  return data_set.gene_expression_index[primaryKey];
      })
      var tick = Date.now();

      var cursor = GeneExpression.find({ data_set_label:  data_set._id }, {sort:{gene_label:1, sample_label:1, data_set_label:1}});
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


function clinical(coll, samplesAllowed, data_set_label, response)  { FIX
  coll.find(
	  {data_set_id: data_set_id},
	  {sort:{gene:1, data_sets:1}}).forEach(function(doc) {
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
		// DomainCollections[domain.collection]._ensureIndex(domain.index);
	    }
	})
        GeneExpression._ensureIndex( {data_set_label: 1} );
        GeneExpression._ensureIndex( {gene_label:1, sample_label:1, data_set_label:1});
        GeneExpression._ensureIndex( {data_set_label:1, gene_label:1, sample_label:1, data_set_label:1});
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

  // DataSets requsted parameter, default to prad_wcdt for now
  var data_set_query = { }
  if (this.params && this.params.query && this.params.query.data_set && this.params.query.data_set.length > 0)
      data_set_query._id = this.params.query.data_set;
  else
      data_set_query._id = "prad_wcdt";

  // Filename parameter
  var attachmentFilename = table + '_' + data_set_query._id + '.txt';
  if (this.params && this.params.query && this.params.query.filename)
      attachmentFilename = this.params.query.filename;


  // Filter data_sets to only thosea allowed by collaborations
  if (!isLocal) 
      data_set_query.collaborations = {$in: ["public"].concat(collaborations)};

  data_set = Collections.data_sets.findOne( data_set_query );

  if (data_set == null) {
     console.log("No Study Found", data_set_query);
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
      data_set.sample_labels.map(function(sample_label) {
	  outstream.write("\t");
	  outstream.write(sample_label);
      });
      outstream.write("\n");
      var coll =  DomainCollections[table];
      if (table == "Mutations")
	  genomicDataMutations(coll, data_set.sample_labels, data_set, outstream);
      else 
	  genomicDataSamples(GeneExpression, data_set, outstream);

  } else if (kind == "clinical") {
      var meta = Collections.Metadata.findOne({name: table});
      var q = {
	      CRF: table,
	      data_set_id: data_set._id,
	  };
      console.log("q", q);

      var data = Collections.CRFs.find(q, {sort: {sample_label:1}}).fetch();

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
      var keys = ["patient_label", "sample_label"].concat(ptc.cols, ptc.rows);
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

