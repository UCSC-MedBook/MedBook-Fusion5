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
    }


function data() {
    var defaultQ = {
        post: {$exists: 0},
        userId: Meteor.userId()
    };
    var data = null;
    var id = this.params._id || this.params.query.id;

    if (this.params.query.id != null) {
	data = Charts.findOne({_id: id});
    } else {
	data = Charts.find(defaultQ, {sort: {modifiedAt: -1}, limit:1}).fetch()[0]
	if (data && id == null) {
	    var url = Router.current().url;
	    if (url && url.length > 0 && url.indexOf('id=') < 0)
		updateUrl(url, data._id);
	}
    }
    return data;
}

function waitOn() {
    return [
      Meteor.subscribe('Chart', this.params._id || this.params.query.id),
      Meteor.subscribe('Metadata'),
      Meteor.subscribe('studies')
    ]
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
    onBeforeAction: function() { this.state.set("NoControls", true); this.next()},
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
       return Meteor.subscribe("AllCharts");
    }
  });
});


Router.map(function() {
  this.route('fusionTables', {
    template: "TableBrowser",
    path: '/fusion/tables/',
    data: data,
    waitOn: function() {
       return Meteor.subscribe("Metadata");
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
       return Meteor.subscribe("Metadata");
    },
    onBeforeAction : function(arg) {
       var study =  this.params._study;
       var table = this.params._table; 
       var user = Meteor.user();

       if (study == null) {
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
  this.route('import', {
    template: "DataImport",
    path: '/fusion/import',
    waitOn: function() {
	return [
	  Meteor.subscribe('Metadata'),
	  Meteor.subscribe('studies')
	]
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

dataFile = function() {
  console.log("datafile");

  var attachmentFilename = 'filename.txt';
  if (this.query && this.query.params && this.query.params.filename)
      attachmentFilename = this.query.params.filename;
  var cookies = parseCookies(this.request);
  var mlt = cookies["meteor_login_token"];
  var hash_mlt =  Accounts._hashLoginToken(mlt);
  var user = Meteor.users.findOne({"services.resume.loginTokens.hashedToken": hash_mlt});
  if (user == null)
      throw new Error("user must be logged in");

  var studiesRequested;
  if (this.query && this.query.params && this.query.params.study)
      studiesRequested = [this.query.params.study];
  else if (this.query && this.query.params && this.query.params.studies)
      studiesRequested = this.query.params.studies;
  else
      studiesRequested = ["prad_wcdt"];

  var response = this.response;
  response.writeHead(200, {
    'Content-Type': 'text/tab-separated-values',
    'Content-Disposition': 'attachment; filename=' + attachmentFilename,
  });

  // filter studies to only thosea allowed by collaborations
  var studiesFiltered = [];
  var samplesAllowed = [];

  Collections.studies.find( {
        id: {$in: studiesRequested},
        collaborations: {$in: user.profile.collaborations}
      }, 
      {fields: {id:1, Sample_IDs: 1}}
  ).forEach( function(doc) {
      studiesFiltered.push(doc.id)
      samplesAllowed = _.union(samplesAllowed, doc.Sample_IDs);
  });

  if (studiesFiltered.length == 0 || samplesAllowed.length == 0)
      throw new Error("must specify studies that your collaborations are allowed to use");

  samplesAllowed = samplesAllowed.sort();

  console.log(samplesAllowed);

  response.write("Gene");
  samplesAllowed.map(function(sample_label) {
      response.write("\t");
      response.write(sample_label);
  });
  response.write("\n");
  Expression.find({Study_ID: {$in: studiesFiltered}}, {sort:{gene:1, studies:1}}).forEach(function(doc) {
      var line = doc.gene;
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
  response.end();
};


Router.map(function() {
  this.route('download', {
    where: 'server',
    action: dataFile,
  });
});
