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

Template.DataImport.events({
 'click #transpose' : function() {
      debugger;
      var data = DataImportSpreadSheet.getData();
      var newData = [];
      data[0].map(function() {newData.push([])});
      data.map(function(oldRow) {
         oldRow.map(function(item, j){
	     newData[j].push(item);
	 });
      });
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
