Session.set("BrowseTable", "Clinical_Info");

Template.saveNewTable.helpers({
    mergeClass : function() {
       var a = "table table-fixed table-bordered table-hover Inspector scrollTableBody";
       var b = this["class"];
       if (b)
           return a + " " +b;
       return a;
    },
    myTables : function() {
       return Collections.Metadata.find({}, {fields: {"name":1, study:1, fieldOrder: 1}});
    },
    browseTable : function() {
       var cc = Session.get("CurrentChart");
       var studies = cc.studies;
       if (studies == null || studies.length == 0)
          return alert("no studies");

       var table = Session.get("BrowseTable");
       if (table != null) {
	   Meteor.subscribe("CRFs", studies, [table]);
	   return Collections.CRFs.find({CRF: table, Study_ID: {$in: studies}});
       }
    },

    myTablesSettings : function() {
      return {
        rowsPerPage: 10,
        showFilter: true,
        fields: [ 
	   { key: "study", label: "Study",
	     headerClass: 'col-md1'
	   },

	   { key: "name", label: "Name",
	     // headerClass: function () { var css = 'col-md2'; '/*do some logic here */ return css;}
	   },

	   { key: "fieldOrder", label: "Fields",
	     // headerClass: function () { var css = 'col-md8'; '/*do some logic here */ return css;}
	   },
        /*
           The description field is in HTML. But this recipe for displaying HTML in reactive table
           causes an error in the console log.  Need a better recipe.

            { key: 'id' }, 
            {
              key: 'description',
              fn: function (value) { 
                  // return new Spacebars.SafeString(value);
                  return value;
              }
            }
            */
       ],
    };
   },

});

Template.saveNewTable.events({
 'click .existingTablesRow' : function(evt, tmpl) {
    Session.set("BrowseTable", this.name);
 },

 'click #saveNewTable' : function(evt, tmpl) {
    var source_chart_id = Template.currentData()._id;
    if (source_chart_id == null)
    	return;

    var target_name = $("#newTableName").val();
    var source_fields = null;
    var target_collaborations = $("#collaborators").val()

    Meteor.call("newTable", target_name, target_collaborations, source_fields, source_chart_id, function(err, status) { });
  }
});



Template.saveNewTable.rendered = function() {
};

