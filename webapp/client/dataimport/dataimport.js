DataImportSpreadSheet = null;

Template.DataImport.rendered = function() {
    var container = document.getElementById("hot");

    DataImportSpreadSheet = new Handsontable(container, { 
	 minSpareRows: 1,
	 rowHeaders: true,
	 colHeaders: true,
	 contextMenu: true
    });

}
Template.DataImport.helpers({
   studies : function() {
      var ret = Collections.studies.find({}, {sort: {"name":1}}).fetch();
      return ret;
   },
});


function transpose(data) {
  var newData = [];
  data[0].map(function() {newData.push([])});
  data.map(function(oldRow) {
     oldRow.map(function(item, j){
	 newData[j].push(item);
     });
  });
  return newData
}

function analyze(rowData) {
 rowData.shift(); // discard first row
 var columns = transpose(rowData);

 function and(a,b) { return a && b };
 function or(a,b) { return a || b };

 function allStrings(column) {
     if (column.length == 0)
	return [];
     return column.map(function(v) { return v == "" || v == "N/A" || typeof(v) == "string"} ).reduce(and);
 }
 function allNumbers(column) {
     if (column.length == 0)
	return [];
     return column.map(function(v) { return v == "" || v == "N/A" || !isNaN(v)} ).reduce(and);
 }
 function allDates(column) {
     if (column.length == 0)
	return [];
     return column.map(function(v) { return v == "" || v == "N/A" || moment(v).isValid()} ).reduce(and);
 }
 function unique(column) {
     var seen = {};
     var dupes = {};
     for (var i = 0; i < column.length; i++) {
	 if (column[i] in seen)
	     dupes[column[i]] = true;
	 else
	     seen[column[i]] = true;
     }
     return  {
	 uniqueValues: Object.keys(seen),
	 dupeValues: Object.keys(dupes),
     }
 }
  function judge(isNumber, i) {
       if (isNumber)
	   return "number";

       if (stringsBoolVec[i]) 
	   return "date";

       if (stringsBoolVec[i]) 
	   return "strings";
       return "unknown"
  }

  var dataBoolVec= columns.map(allDates);
  var numbersBoolVec= columns.map(allNumbers);
  var stringsBoolVec= columns.map(allNumbers);
  var valueSpace= columns.map(unique);
  var results = numbersBoolVec.map(judge);
   
  return results;
}

function saveTable(rowData) {
    var headers = _.clone(rowData[0]);
    var primaryKeys = rowData.map(function(row) { return row[0]; });

    var fields =  headers.map(function(fieldName) {
	return {
		  "Field_Name": fieldName,
		  "optional": true,
		  "type": "String"
	}
    };

    Meteor.call("newTableFromSpreadsheet", 
       $("newTableName").val(), $("#studyForNewTable").val(), fields, rowData, 

       function(err, ret) {
       }
    );
}

Template.DataImport.events({
 'click #save' : function() {
    var rowData = _.clone(DataImportSpreadSheet.getData());
    saveTable(rowData);

  }, 
 'click #analyze' : function() {
    var rowData = _.clone(DataImportSpreadSheet.getData());
    var results = analyze(rowData);
    console.log(results);
  },

 'click #transpose' : function() {
      var data = DataImportSpreadSheet.getData();
      var newData = transpose(data);
      DataImportSpreadSheet.updateSettings({data: newData}, false);
      return ret;
   },

 "change #fileInput" : function(e) {
   var f = document.getElementById('fileInput').files[0];
   console.log("read file");
   readFile(f, function(content) {
	var data;

	try {
	    data = JSON.parse(content);
	} catch (err) {
	   var lines = content.split(/\r\n|\n/);

	   var tabs = lines.map(function(line) { return line.split("\t"); });
	   var comma = lines.map(function(line) { return line.split(","); });

	   var tabsN = tabs.map(function(tab) { return tab.length; });
	   var commaN = comma.map(function(comma) { return comma.length; });

	   tabsN = tabsN.sort().filter(function(n) { return n >= 2; });
	   commaN = commaN.sort().filter(function(n) { return n >= 2; });

	   if (tabsN.length > 2 && tabsN[0] == tabsN[tabsN.length-1])
	      data = tabs;
	   else if  (commaN.length > 2 && commaN[0] == commaN[commaN.length-1])
	      data = comma;
	   else {
	      alert("Could not decode file");
	      return;
	   }
	}
	DataImportSpreadSheet.updateSettings({data: data}, false);
   });
 }
});

readFile = function(f,onLoadCallback) {
 var reader = new FileReader();
 reader.onload = function (e){
  var contents=e.target.result
  onLoadCallback(contents);
 }
 reader.readAsText(f);
};
