Session.set("BrowseTable", "Clinical_Info");


function arrayDoc(array) {
    if (typeof(array[0]) == "string")
        if (array[0][0] == '<')
            return array.join(""); // its html just return it.
        else 
            return array.join("; ");

    return array.map(function(element) {
        return before +  Object.keys(element).sort().map( function(key) {
                return "<tr><td>"+key+"</td><td>"+element[key]+ "<td></tr>";
            }) + after;
    }).join("<p>")
}

function simpleDate(obj) {
   if (obj == null){
    return obj;
   } try {
        return moment(obj).utc().format("MM/DD/YYYY")
   } catch (reason) {
        console.log("simpleDate  mapping failed on column", obj, reason);
        return "Error (see Javascript console)";
   }
}

function fn(value, obj) {
    try {
	if (value == null) return "";
	if (Array.isArray(value)) {
	    return new Spacebars.SafeString("<span>" + arrayDoc(value) + "</span>");
	} else if (isDate) {
	    return simpleDate(value);
	} else if (typeof value == 'string' || value instanceof String) {
	    value = value.replace(/-/g, "&#8209;")
	    return new Spacebars.SafeString("<span sort='"+ value +"'>" + value + "</span>");
	} else if (typeof value == 'object')
	    debugger;
	return value;
    } catch (reason) {
	console.log( reason);
    }
}

function browseTableFields() {
   var table = Session.get("BrowseTable");
   if (table == null)
      return [];
   var met = Collections.Metadata.findOne({name: table});
   if (met == null)
      return [];
   Session.set("BrowseTableFields", met.fieldOrder);
   return met.fieldOrder;
};

Handlebars.registerHelper('TabularTables', function (){
    return TabularTables;
});

Handlebars.registerHelper('myStudy', function (){
      var un = Meteor.user().username;
      return "user:"+un;
});


Template.TableBrowser.helpers({
    geneLikeDomains: function() {
      return GeneLikeDataDomainsPrototype.map(function(gld) {
          return {name: gld.label};
      });
    },
    studies : function() {
      var ret = Collections.studies.find({}, {sort: {"name":1}}).fetch();
      return ret;
    },
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
       var table = Session.get("BrowseTable");
       var studies = Session.get("BrowseStudies");

       if (studies != null && table != null) {
          Meteor.subscribe("CRFs", studies, [table]);
          var data = Collections.CRFs.find({CRF: table/*, Study_ID: {$in: studies} */}).fetch();
	  data.map(function(row,i) {
	      Object.keys(row).map(function(key) {
	          if (Array.isArray(row[key]))
		      row[key] = new Spacebars.SafeString("<span>" + arrayDoc(row[key]) + "</span>");
	    
	      });
	  });
          Session.set("BrowseTableData", data);
	  return data;
       }
       return [];
    },

    browseTableFields : browseTableFields,

    crfTablesSettings : function() {
      return {
        rowsPerPage: 10,
        showFilter: true,
        fields: browseTableFields().map(function(fieldName) { 
	    return { key: fieldName, label: fieldName, fn: fn };
	})
      };
    },

    myTablesSettings : function() {
      return {
        rowsPerPage: 10,
        showFilter: true,
        fields: [ 
	   { key: "study", label: "Study",
	     headerClass: 'col-md1'
	   },

	   { key: "name", label: "Name" },

	   { key: "fieldOrder", label: "Fields", fn: fn },
       ],
    };
   },

});

Template.TableBrowser.events({

 'click .downloadBrowseTable' : function(evt, tmpl) {
       var table = Session.get("BrowseTable");
       var data = Session.get("BrowseTableData");
       var fields = Session.get("BrowseTableFields");
       var studies = Session.get("BrowseStudies");

       if (table && data && fields) {
          var name = table + "_" + studies.join("_") + "_" + data.length + ".txt";
          saveTextAs(ConvertToTSV(data, fields), name);
       }
 },

 'click .selectable' : function(evt, tmpl) {
     var data;
     if (evt.target.data) 
        data = evt.target.data;
     else if (evt.target.parentNode.data)
        data = evt.target.parentNode.data;
     if (data) {
         Session.set("BrowseStudies", [data.study]);
         Session.set("BrowseTable", data.name);
     }
 },
 'click .existingTablesRow' : function(evt, tmpl) {
    Session.set("BrowseTable", this.name);
    var prevStudies = Session.get("BrowseStudies");
    var nextStudies = prevStudies && prevStudies.length > 0 ?  _.union(prevStudies, this.study) : [this.study];
    nextStudies = nextStudies.sort();
    Session.set("BrowseStudies", nextStudies);
 },

 'click #TableBrowser' : function(evt, tmpl) {
    var source_chart_id = Template.currentData()._id;
    if (source_chart_id == null)
    	return;

    var target_name = $("#newTableName").val();
    var source_fields = null;
    var studyForNewTable = $("#studyForNewTable").val()

    Meteor.call("newTable", target_name, studyForNewTable, source_fields, source_chart_id, function(err, status) { });
  }
});



Template.TableBrowser.rendered = function() {
};

