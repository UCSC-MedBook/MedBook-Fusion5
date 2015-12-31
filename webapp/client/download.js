

function getClinicalData(study) {
  return ["Clinical_Info"].concat(study.tables).sort().map(function(table) {
      return {text: "Download " + table,
      	href: '/fusion/export?study=' + study.id + "&table=" + table + "&kind=clinical"
      }
  });
}

function getGenomicData(study) {
  return GeneLikeDataDomainsPrototype.sort(function(a,b) { return a.label.localeCompare(b.label)}).map(function(gld) {
      return {text: 'Download ' + gld.label, 
      	href: '/fusion/export?study=' + study.id + "&table=" + gld.collection + "&kind=genomic"
      };
  });
}

function getTree() {
  var studies = Collections.studies.find({}, {sort: {"name":1}}).fetch();

  var tree = studies.map(function(study){ 
      var p  = "";
      var s  = "";
      try {p = String(study.Sample_IDs.length); } catch(err) {};
      try {s = String(study.Patient_IDs.length); } catch(err) {};

      var clin = getClinicalData(study);
      var gen = getGenomicData(study);

      return {
	  text: study.name + " " + p + " patients, " + s + " samples",
	  Study_ID: study._id,
	  nodes: [
	     {
	         text: "Clinical Data " + String(clin.length)+ " tables",
		 nodes: clin, 
	     },
	     {
	         text:"Genomic Data " + String(gen.length)+ " tables",
		 nodes: gen,
	     }
	  ]
      }});

  return tree;
}



Template.Download.rendered = function() {

    $('#tree').treeview(
	{
	    data: getTree(),

	    enableLinks: true,

	    onNodeSelected: function(event, data) {
	      var table = data.collection;
	      var studies = [ data.Study_ID];
	    } // onNodeSelected 
        })
}

