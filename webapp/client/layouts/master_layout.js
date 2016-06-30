/*****************************************************************************/
/* MasterLayout: Event Handlers and Helpersss .js*/
/*****************************************************************************/

OverlayClose = function() {
    $('#overlayContent').children().remove()
    $("body").removeClass("noscroll");
    $('.overlay').addClass("hidden");
};

Template.MasterLayout.events({
    'click #overlayClose' : function() {
	OverlayClose();
     },
     
    'click .overlay' : function(evt, tmpl) {
	if (evt.target.className == "overlay")
	    OverlayClose();
     },

	'click .logout' : function() {
		console.log('logout')
		Meteor.logout();
		Meteor.logoutOtherClients;
	}
});

Template.MasterLayout.helpers({
	member: function() {
		if (Meteor.user()) {
			var collaborations = Meteor.user().profile.collaborations;
			return collaborations
		}	
	},
	data_sets: function() {
		return Collections.data_sets.find({},{sort: {short_name:1}});		
	},
	selected: function(){
		if (Session.get('data_set_id') == this._id) 
			return true;
		else 
			return false;
	},
	currentQueryString: function() {
		return "";
	}
});

/*****************************************************************************/
/* MasterLayout: Lifecycle Hooks */
/*****************************************************************************/
Template.MasterLayout.created = function() {
};

Template.MasterLayout.rendered = function() {
};

Template.MasterLayout.destroyed = function() {
};

Overlay = function(templateName, params) {
    var $overlay = $( '.overlay' );
    $overlay.removeClass("hidden");
    $overlay.show();
    var $overlayContent = $( '#overlayContent' );
    if (typeof(params) == "function")
        params = params();
    $("body").addClass("noscroll");
    Blaze.renderWithData( Template[templateName], params, $overlayContent.get(0) );
}
