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
    var data = null;

    try {
        if (this.params._id != null) {
            data = Charts.findOne({_id: this.params._id});
        } else {
            data = Charts.find(defaultQ, {sort: {modifiedAt: -1}, limit:1}).fetch()[0]
            if (data) {
                var url = Router.current().url;
                window.history.replaceState(null, null, url + "/" + data._id);
            }
        }
    } catch(err) {};
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
  this.route('homeId', {
    template: "SampleFusion",
    path: '/fusion/:_id/',
    data: data,
    waitOn: waitOn, 
  });
});

/*

Router.map(function() {
  this.route('display', {
    template: "ChartDisplay",
    onBeforeAction: function() { this.state.set("NoControls", true); this.next()},
    path: '/fusion/:_id/display',
    data: data,
    waitOn: waitOn, 
  });
});

Router.map(function() {
  this.route('edit', {
    template: "SampleFusion",
    path: '/fusion/:_id/edit',
    data: data,
    waitOn: waitOn, 
  });
});

*/
