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



function data() {
    var defaultQ = {
        post: {$exists: 0},
        userId: Meteor.userId()
    };
    var data;

    if (this.params._id != null) {
        data = Charts.findOne({_id: this.params._id});
    } else {
        data = Charts.findOne(defaultQ);
    }
    return data;
}

function waitOn() {
    return [
      Meteor.subscribe('Chart', this.params._id),
      Meteor.subscribe('Metadata'),
      Meteor.subscribe('studies')
    ]
}

Router.map(function() {
  this.route('home', {
    template: "SampleFusion",
    path: '/fusion/',
    data: data,
    waitOn: waitOn, 
  });
});

Router.map(function() {
  this.route('displaySimple', {
    template: "ChartDisplay",
    onBeforeAction: function() { this.state.set("NoControls", true); this.next()},
    path: '/fusion/display/',
    data: data,
    waitOn: waitOn, 
  });
});

Router.map(function() {
  this.route('display', {
    template: "ChartDisplay",
    onBeforeAction: function() { this.state.set("NoControls", true); this.next()},
    path: '/fusion/display/:_id/',
    data: data,
    waitOn: waitOn, 
  });
});

Router.map(function() {
  this.route('edit', {
    template: "SampleFusion",
    path: '/fusion/edit/:_id/',
    data: data,
    waitOn: waitOn, 
  });
});


Router.map(function() {
  this.route('all', {
    template: "AllCharts",
    path: '/fusion/all/',
    data: data,
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

