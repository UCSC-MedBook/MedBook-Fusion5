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
  this.route('GeneFusion', {
    template: "GeneFusion",
    path: '/fusion/gene/',
    data: data,
    waitOn: function() {
       return [
	   Meteor.subscribe("Metadata"),
	   Meteor.subscribe('studies')
       ]
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
