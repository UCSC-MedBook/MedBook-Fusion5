DataImportSpreadSheet = null;

Meteor.startup(function() {
    Session.set("DataImportDataSet", MyStudy())
});


var AfterInit = false;
var DocumentModified = false;

window.onbeforeunload = function() {
      if (DocumentModified)
           return "Navigating away may lose changes. Please save table first";
      return null;
}

function initHandsontable() {
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
         manualRowResize: true,
         afterChange: function(changes, source) {
             if (AfterInit) {
                DocumentModified = true;
             }
         },
         afterInit: function() { AfterInit = true;}

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
Template.DataImport.rendered = initHandsontable;

Template.DataImport.helpers({
   data_sets : function() {
      var ret = Collections.data_sets.find({}, {sort: {"name":1}}).fetch();
      return ret;
   },
   tables : function() {
       var dis = Session.get("DataImportDataSet");
       if (dis)
           return Collections.Metadata.find({data_set: dis}, {fields: {"name":1}})
       return [];
   }
});

Template.DataSave.helpers({
   data_sets : function() {
      var ret = Collections.data_sets.find({}, {sort: {"name":1}}).fetch();
      return ret;
   },
   tables : function() {
       var dis = Session.get("DataImportDataSet");
       if (dis)
           return Collections.Metadata.find({data_set: dis}, {fields: {"name":1}})
       return [];
   }
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
    try {
        if (s == null) return true;
        // http://stackoverflow.com/questions/203739/why-does-instanceof-return-false-for-some-literals
        if ( typeof(s) == 'string' || s instanceof String) {
            if (s == "") return true;
            s = s.trim();
            s = s.toLowerCase(s);
            if (s.indexOf("n/a") == 0) return true;
            if (s == "na") return true;
            if (s.indexOf("unk") == 0) return true;
            if (s.indexOf("none") == 0) return true;
        }
    } catch (err) { debugger; }
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
   return column.map(function(v) { return v instanceof Date || empty(v) || moment(v).isValid()} ).reduce(and);
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
    DocumentModified = false;
    if (rowData == null || rowData.length < 2)
       return Overlay("MessageOver", { text: "Need a header line and at least one line of content" })

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

    busy();
    Meteor.call("newTableFromSpreadsheet", 
       $("#newTableName").val(), $("#DataImportDataSet").val(), fields, rowData, 

       function(err, ret) {
           unbusy();
	   if (err)
	       Overlay("MessageOver", { text: err })
	   else 
	       Overlay("MessageOver", { text: ret })
       }
    );
}

var types = ["Unknown", "Number","String", "Date", "Exclude", "sample_label", "Patint_ID"];

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

    var rowData = DataImportSpreadSheet.getData();

    rowData.map(function(row, j) {
        row.map(function(element, i) {
            if (empty(element))
                row[i] = '';
        });
    });

    DataImportSpreadSheet.updateSettings({
         data: rowData,
         columns: null
    });

    for (var i = DataImportSpreadSheet.types.length - 1; i >= 0; i--) {
        if (DataImportSpreadSheet.types[i] == "Exclude") {
            DataImportSpreadSheet.types.splice(i, 1);
            DataImportSpreadSheet.alter("remove_col", i, 1, null, false)
        }
    }

    rowData = DataImportSpreadSheet.getData();

    for (var j = rowData.length - 1; j >= 0; j--) {
        if (DataImportSpreadSheet.isEmptyRow(j))  {
            rowData.splice(j, 1);
        } else {
            /*
            DataImportSpreadSheet.types.map(function(type, i) {
                if (type == "Number" ||  type == "Date") {
                    var value = rowData[j][i];
                    if (type == "Number" && isNaN(value))
                        ;
                    else if (type == "Date" &&  moment(value).isValid())
                        ;
                }
            });
            */
        }
    }

    DataImportSpreadSheet.updateSettings({
         data: rowData,
         columns: DataImportSpreadSheet.types.map(function(f) {
            return {
                renderer: function(hotInstance, TD, row, col, prop, value, cellProperties) {
                        TD.style.color = 'black';
                        TD.innerHTML = value;
                 }
            }
        })
    },
    false);
   Overlay("MessageOver", { text: "Clean up done" })
};

Template.DataImport.events({
 'click #cleanUp' : function(evt, tmpl) {
    if (tmpl.dataAnalyzed) {
       busy();
       cleanUp();
       unbusy();
    } else
       Overlay("MessageOver", { text: "Please click analyze first and review each column's type and null data fields" })
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

 'change #DataImportDataSet' : function(evt, tmpl) {
    var data_set = $("#DataImportDataSet").val();
    Session.set("DataImportDataSet", data_set);
  },

 'change #DataImportTable' : function(evt, tmpl) {
    var data_set = Session.get("DataImportDataSet");
    var table = $("#DataImportTable").val();
    Meteor.subscribe("CRFs", [data_set], [table])
    Session.set("DataImportTable", table);

    Meteor.autorun(function() {

        var table = Session.get("DataImportTable");
        if (table == "New Table") {
            DataImportSpreadSheet.destroy();
            initHandsontable();
        } else {
            var dataAsDocs = Collections.CRFs.find({ "data_set_id" : data_set, "CRF" : table }, { sort: { sample_label: 1, patient_label:1 }}).fetch();
            var md = Collections.Metadata.findOne({data_set: data_set, name: table});
            var dataAsRows = [md.fieldOrder];
            dataAsDocs.map(function(doc) {
                var row = [];
                md.fieldOrder.map(function(attr) {
                    if (attr in doc) {
                        row.push(doc[attr]);
                    } else
                        row.push(null);
                });
                dataAsRows.push(row);
            });

            if (dataAsRows.length > 0)
                DataImportSpreadSheet.updateSettings({data: dataAsRows}, false);
        }
   });
 },

  'click #analyze' : function(evt, tmpl) {
    busy();
    var rowData = _.clone(DataImportSpreadSheet.getData());

    DataImportSpreadSheet.types = analyze(rowData);

    tmpl.dataAnalyzed = true;
    
    function colHeadersFunction(n) {
        if (n < DataImportSpreadSheet.types.length)
            return  selectType( n,  DataImportSpreadSheet.types[n] );
        return null;
    }
    function getColumns() {
    }

    var ret =  DataImportSpreadSheet.updateSettings(
        {
            colHeaders: colHeadersFunction,
            fixedRowsTop: 1,
            fixedColumnsLeft: 1,

            afterGetColHeader: function(col, TH) {
            },

            columns: DataImportSpreadSheet.types.map(function(f) {
                return {
                    renderer: function(hotInstance, TD, row, col, prop, value, cellProperties) {
                            TD.style.color = 'blue';
                            if (empty(value))
                                TD.innerHTML = value + '<span style="color:red">NULL</span>';
                            else
                                TD.innerHTML = value;
                     }
                }
            })
        },
        false);
    console.log( DataImportSpreadSheet.types );

    unbusy();
    Overlay("MessageOver", { text: "Analyzed!" })
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


