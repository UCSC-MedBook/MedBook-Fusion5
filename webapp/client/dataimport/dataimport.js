DataImportSpreadSheet = null;

Template.DataImport.rendered = function() {
    var container = document.getElementById("hot");

    DataImportSpreadSheet = new Handsontable(container, { 
         minRows: 20,
         minCols: 20,
	 minSpareRows: 1,
	 minSpareCols: 1,
	 rowHeaders: true,
	 colHeaders: true,
	 contextMenu: true,
         manualColumnResize: true,
         manualRowResize: true
    });
    $("#importTableArea").resizable( {
        resize: function( event, ui ) {
            DataImportSpreadSheet.updateSettings({
                height: ui.size.height -40,
                width: ui.size.width -40, 
            });
        }
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
 var firstRow = rowData.shift(); // discard first row
 var columns = transpose(rowData);

 columns = columns.filter(function(a){
     for (var i =0; i < a.length;i++)
        if (a[i] != "" && a[i] != null) 
            return true;
     return false;
 });

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
       return "String"
  }

  var dataBoolVec= columns.map(allDates);
  var numbersBoolVec= columns.map(allNumbers);
  var stringsBoolVec= columns.map(allNumbers);
  var valueSpace= columns.map(unique);
  var results = numbersBoolVec.map(judge);

   
  return results;
}

function saveTable(rowData, headerSelects) {
    var headers = _.clone(rowData[0]).filter(function(a) { return a != null});
    var primaryKeys = rowData.map(function(row) { return row[0]; });


    var fields =  headers.map(function(fieldName, columnNumber) {
	return {
		  "Field_Name": fieldName,
		  "optional": true,
		  "type": headerSelects[columnNumber].value
	}
    });
    console.log(fields, fields);

    Meteor.call("newTableFromSpreadsheet", 
       $("#newTableName").val(), $("#studyForNewTable").val(), fields, rowData, 

       function(err, ret) {
	   if (err)
	       Overlay("MessageOver", { text: err })
	   else 
	       Overlay("MessageOver", { text: ret })
       }
    );
}

var types = ["Number","String", "Date"];

function selectType(columnNumber, current) {

    function option(value) {
      var o = '<option value="' + value +'"';
      if (current == value)
          o += ' selected ';
      o += '>' + value  + ' </option>';
      return o;
    }

    return '<select  data-columnnumber="' + columnNumber + '" >' + types.map(option) + ' </select>';
}


Template.DataImport.events({
 'click #save' : function(evt, tmpl) {
    var rowData = _.clone(DataImportSpreadSheet.getData());
    if (tmpl.dataAnalyzed)
        saveTable(rowData, tmpl.headerSelects);
    else
       Overlay("MessageOver", { text: "Please click analyze first and review each column's type" })
  }, 

 'click #analyze' : function(evt, tmpl) {
    var rowData = _.clone(DataImportSpreadSheet.getData());
    var results = analyze(rowData);

    tmpl.dataAnalyzed = true;
    
    function colHeadersFunction(n) {
        if (n < results.length)
            return  selectType( n, results[n] );
        return null;
    }
    tmpl.headerSelects = [];

    var ret =  DataImportSpreadSheet.updateSettings(
        {
            colHeaders: colHeadersFunction,
            fixedRowsTop: 1,
            fixedColumnsLeft: 1,

            afterGetColHeader: function(col, TH) {
                if (col >= 0) {
                    var $select = $(TH).find("select")
                    if ($select.length > 0) {
                        var columnNumber = $select.data("columnnumber");
                        tmpl.headerSelects[columnNumber] = $select[0];
                        console.log(columnNumber, tmpl.headerSelects[columnNumber]);
                    }
                }
            },
        },
        false);
    console.log(results);
  },

 'click #transpose' : function() {
      var data = DataImportSpreadSheet.getData();
      var newData = transpose(data);
      var ret = DataImportSpreadSheet.updateSettings({data: newData}, false);
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

