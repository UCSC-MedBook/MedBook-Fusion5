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


function empty(s) { 
    if (s == null) return true;
    if (s == "") return true;
    s = s.trim();
    if (s.indexOf("n/a") == 0) return true;
    if (s == "na") return true;
    if (s == "") return true;
    s = s.toLowerCase(s);
    if (s.indexOf("unk") == 0) return true;
    return false
};

function and(a,b) { return a && b };
function or(a,b) { return a || b };

function allEmpty(column) {
   if (column.length == 0)
      return [];
   return column.map(empty).reduce(and);
}

function allStrings(column) {
   if (column.length == 0)
      return [];
   return column.map(function(v) { return empty(v) || typeof(v) == "string"} ).reduce(and);
}
function allNumbers(column) {
   if (column.length == 0)
      return [];
   return column.map(function(v) { return empty(v) || !isNaN(v)} ).reduce(and);
}
function allDates(column) {
   if (column.length == 0)
      return [];
   return column.map(function(v) { return empty(v) || moment(v).isValid()} ).reduce(and);
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
function analyze(rowData) {
  var firstRow = rowData.shift(); // discard first row
  var columns = transpose(rowData);
  var dateVec= columns.map(allDates);
  var numbersVec= columns.map(allNumbers);
  var emptyVec= columns.map(allEmpty);
  var stringsVec= columns.map(allStrings);
  // var valueSpace= columns.map(unique);

  // from the specfic to the general
  function judge(isNumber, i) {
       if (emptyVec[i])   
	   return "Exclude";

       if (dateVec[i]) 
	   return "Date";

       if (isNumber)
	   return "Number";

       if (stringsVec[i]) 
	   return "String";

       return "Unknown"
  }


  var results = numbersVec.map(judge);
   
  return results;
}

function saveTable(rowData) {
    var headers = _.clone(rowData[0]);
    var primaryKeys = rowData.map(function(row) { return row[0]; });

    var headerTypes = [];

    $("select.SelectType").each(function() {
        headerTypes[$(this).data("columnnumber")] = this.value;
    });


    var fields =  headers.map(function(fieldName, columnNumber) {
	return {
		  "Field_Name": fieldName,
		  "optional": true,
		  "type": DataImportSpreadSheet.types[columnNumber]
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

var types = ["Unknown", "Number","String", "Date", "Exclude"];

function selectType(columnNumber, current) {

    function option(value) {
      var o = '<option value="' + value +'"';
      if (current == value)
          o += ' selected ';
      o += '>' + value  + ' </option>';
      return o;
    }

    return '<select class="SelectType"  data-columnnumber="' + columnNumber + '" >' + types.map(option) + ' </select>';
}


function cleanUp() {
    DataImportSpreadSheet.updateSettings({
         minCols: 1,
         minRows: 1,
	 minSpareRows: 0,
	 minSpareCols: 0,
    });

    for (var i = DataImportSpreadSheet.types.length - 1; i >= 0; i--) {
        if (DataImportSpreadSheet.types[i] == "Exclude") {
            DataImportSpreadSheet.types.splice(i, 1);
            DataImportSpreadSheet.alter("remove_col", i, 1, null, false)
        }
    }

    var rowData = DataImportSpreadSheet.getData();

    for (var j = rowData.length - 1; j >= 0; j--) {
        if (DataImportSpreadSheet.isEmptyRow(j))  {
            rowData.splice(j, 1);
        } else {
            DataImportSpreadSheet.types.map(function(type, i) {
                if (type == "Number" ||  type == "Date") {
                    var value = rowData[j][i];
                    if (type == "Number" && isNan(value))
                        ;
                    else if (type == "Date" &&  moment(v).isValid())
                        ;
                }
            });
        }
    }

    DataImportSpreadSheet.updateSettings({
         data: rowData,
    });
};

Template.DataImport.events({
 'click #cleanUp' : function(evt, tmpl) {
    if (tmpl.dataAnalyzed)
       cleanUp();
    else
       Overlay("MessageOver", { text: "Please click analyze first and review each column's type" })
  }, 

 'click #save' : function(evt, tmpl) {
    if (tmpl.dataAnalyzed) {
        var rowData = _.clone(DataImportSpreadSheet.getData());
        saveTable(rowData);
    } else
       Overlay("MessageOver", { text: "Please click analyze first and review each column's type" })
  }, 

 'change .SelectType' : function(evt, tmpl) {
     var columnnumber = $(evt.target).data("columnnumber");
     DataImportSpreadSheet.types[columnnumber] = evt.target.value;
 },

 

 'click #analyze' : function(evt, tmpl) {
    var rowData = _.clone(DataImportSpreadSheet.getData());

    DataImportSpreadSheet.types = analyze(rowData);

    tmpl.dataAnalyzed = true;
    
    function colHeadersFunction(n) {
        if (n < DataImportSpreadSheet.types.length)
            return  selectType( n,  DataImportSpreadSheet.types[n] );
        return null;
    }

    var ret =  DataImportSpreadSheet.updateSettings(
        {
            colHeaders: colHeadersFunction,
            fixedRowsTop: 1,
            fixedColumnsLeft: 1,

            afterGetColHeader: function(col, TH) {
            },
        },
        false);
    console.log( DataImportSpreadSheet.types );
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

