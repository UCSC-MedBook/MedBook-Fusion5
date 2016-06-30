

function getClinicalData(data_set, mlt) {
  return ["Clinical_Info"].concat(data_set.tables).sort().map(function(table) {
      return {text: "Download " + table,
      	href: '/fusion/export?data_set=' + data_set._id + "&table=" + table + "&kind=clinical"
            + "&mlt=" + mlt
      }
  });
}


function getGenomicData(data_set, mlt) {
  return GeneLikeDataDomainsPrototype.sort(function(a,b) { return a.label.localeCompare(b.label)})
      .filter(function(gld) { return gld && gld.label && gld.collection;})
      .map(function(gld) {
      return {text: 'Download ' + gld.label, 
      	href: '/fusion/export?data_set=' + data_set._id + "&table=" + gld.collection + "&kind=genomic" 
            + "&mlt=" + mlt
      };
  });
}
function l(a) {
    if (a) return String(a.length);
    return "0"
}

function getTree() {
  var data_sets = Collections.data_sets.find({}, {sort: {"name":1}}).fetch();

  var cookies = {};
  document.cookie && document.cookie.split(';').forEach(function( cookie ) {
      var parts = cookie.split('=');
      cookies[parts.shift().trim()] = decodeURI(parts.join('='));
  });
  var mlt = cookies.meteor_login_token;

  var tree = data_sets.map(function(data_set){ 
      var p  = l(data_set.patient_labels);
      var s  = l(data_set.sample_labels);

      var clin = getClinicalData(data_set,mlt);
      var gen = getGenomicData(data_set,mlt);

      return {
	  text: data_set.name + " " + p + " patients, " + s + " samples",
	  data_set_id: data_set._id,
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
	      var data_sets = [ data.data_set_id ];
	    } // onNodeSelected 
        })
}

