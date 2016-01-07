

function getClinicalData(study) {
  return ["Clinical_Info"].concat(study.tables).sort().map(function(table) {
      return {text: "Download " + table,
      	href: '/fusion/export?study=' + study.id + "&table=" + table + "&kind=clinical"
      }
  });
}

function getGenomicData(study) {
  return GeneLikeDataDomainsPrototype.sort(function(a,b) { return a.label.localeCompare(b.label)})
      .filter(function(gld) { return gld && gld.label && gld.collection;})
      .map(function(gld) {
      return {text: 'Download ' + gld.label, 
      	href: '/fusion/export?study=' + study.id + "&table=" + gld.collection + "&kind=genomic"
      };
  });
}
function l(a) {
    if (a) return String(a.length);
    return "0"
}

function getTree() {
  var studies = Collections.studies.find({}, {sort: {"name":1}}).fetch();

  var tree = studies.map(function(study){ 
      var p  = l(study.Patient_IDs);
      var s  = l(study.Sample_IDs);

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

/*
Template.Download.events({
     'click a': function(evt, tpl) {
         debugger;
     }
});
*/



Template.Download.rendered = function() {

    $('#tree').treeview(
	{
	    data: getTree(),

	    enableLinks: true,

	    onNodeSelected: function(event, data) {
              $('#tree').treeview('toggleNodeExpanded', data.nodeId, { silent: true } );
	      var table = data.collection;
	      var studies = [ data.Study_ID];
	    } // onNodeSelected 
        })
}

