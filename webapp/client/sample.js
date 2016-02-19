TheChartID = null;
     
function valueIn(field, value) {
    return function(mp) {
        var t =  mp[field];
        if (t)
            return t.indexOf(value) >= 0 ? value : "";
        return "";
    }
}
id_text = function(array) {
    return array.map(function(e) { return { id: e, text: e} });
}


Meteor.startup(function() {
    Meteor.subscribe("GeneSets");
    Meteor.subscribe("Biopsy_Research");
});

function getCurrentDipsc() {
  var dipsc_id =  CurrentChart("dipsc_id");
  if (dipsc_id == null) return null;
  Meteor.subscribe("DIPSC", dipsc_id);
  var dipsc =  DIPSC_coll.findOne({_id: dipsc_id});
  return dipsc;
};

var cache_dipsc, cache_dipsc_linear;

function formatFloat(f) {
    f = parseFloat(f);
    if (isNaN(f)) return "";
    f = f.toPrecision(4);
    return f;
};

Template.Controls.helpers({

   chartTypes: function() {
       return Collections.FusionFeatures.findOne({name: "ChartTypes"}).value;
   },

   TheChart: function() {
       return CurrentChart()
   },

   html: function() {
       var TheChart = CurrentChart();
       TheChart = Charts.findOne({_id: TheChart._id});
       var html = TheChart.html;
       if (html && html.length > 0 && html.length < 30)  {
          var func = eval(html)
	  if (func) {
	      html = func(TheChart, {});
	  }
       } else {
	  if (TheChart.pivotTableConfig.rendererName.indexOf("Box Plot") >= 0)
	      setTimeout(d3_tooltip_boxplot, 1000);
       }
       return html;
   },

   previousCharts : function() {
      var prev = Charts.find({}, {fields: {updatedAt:1}, sort: {updatedAt:-1}, limit: 30}).fetch();
      prev.map(function(p) {
         p.label = moment(p.updatedAt).fromNow();
      });
      return prev;
   },
   Join : function() {
      var j = CurrentChart("Join");
      if (j == null) {
          j = "Sample_ID";
      }

      $('button[value="' + j + '"]').addClass("active").siblings().removeClass("active");

      return j;
   },

   dipsc :  getCurrentDipsc,

   mostImportantCorrelationsFields : function() {
       function link(s) {
           return "<a class='dipsc-phenotype' data-phenotype='" + s + "'>" + s.replace(/_PHENOTYPE/g, "") + "</a>"
       }

       function fn(value) {
            // TRICKY A MUST MATCH B
            var s = link(value[0]) + "<br>" + link(value[1]);
            return new Spacebars.SafeString(s); 
       };


       return { fields: [
         { fn: fn, key: 'correlates', label: 'Correlates' , cellClass: 'correlate-cell col-md-3', headerClass: 'correlate-headerCell'},
         { key: 'p_value', sortOrder: 0, sortDirection: 'ascending', label: 'P-Value' ,  cellClass:  'correlate-cell col-md-1', headerClass: 'correlate-headerCell'},
         { key: 'correlation', label: 'Pearson R' ,  cellClass:  'correlate-cell col-md-1', headerClass: 'correlate-headerCell'},
         { key: 'variance', label: 'Variance' ,  cellClass:  'correlate-cell col-md-1', headerClass: 'correlate-headerCell'}
        ]};
   },


   mostImportantCorrelations : function() {
       var d = CurrentChart();
       /*
       if (d == null) return null;
       if (cache_dipsc == d)
           return cache_dipsc_linear;
       */

       cache_dipsc = d;

       var c = cache_dipsc.output.correlations;
       var p = cache_dipsc.output.pValues;
       var v = cache_dipsc.output.variances;
       var k = c[0].length;

       var cutoff = Session.get("DIPSCPvalueCutOff");


       var cache_dipsc_linear = [];
       for (var i = 1; i < k; i++)
           for (var j = 1; j < k; j++) {
               var pValue = parseFloat(p[i][j]);
               if (isNaN(pValue)) 
                   continue
               if (cutoff && pValue > cutoff) 
                   continue
               cache_dipsc_linear.push({correlates: [ c[i][0],  c[0][j] ],  // TRICKY B MUST MATCH A
                   p_value: formatFloat(pValue), 
                   correlation: formatFloat(c[i][j]),
                   variance: formatFloat(v[i][j])});
           }
       cache_dipsc_linear = cache_dipsc_linear.sort(function(a,b) { return  b.p_value - a.p_value; });
       return cache_dipsc_linear
   },

   geneLikeDataDomains : function() {
      var prevGeneLikeDataDomains = CurrentChart("geneLikeDataDomain");
      if (prevGeneLikeDataDomains)
          GeneLikeDataDomainsPrototype.map(function(prevDomain) {
              prevGeneLikeDataDomains.map(function(newDomain) {
                  if (prevDomain.collection == newDomain.collection  && prevDomain.field == newDomain.field ) {
                      newDomain.state = prevDomain.state;
                  }
              });
          });
      else
          prevGeneLikeDataDomains = JSON.parse(JSON.stringify(GeneLikeDataDomainsPrototype));
      return prevGeneLikeDataDomains;
   },

   studiesSelected: function() {
    
     var studies = CurrentChart("studies");
     if (studies && studies.length > 0)
        return Collections.studies.find({id: {$in: studies }}, {sort: {"name":1}});
     else
        return [];
   },

   studiesSelectedSettings: function () {
      return {
        rowsPerPage: 10,
        showFilter: false,
        fields: [ "id", "description",
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

   studies : function() {
      var studies = CurrentChart("studies");
      var ret = Collections.studies.find({}, {sort: {"name":1}}).fetch();
      ret.map(function(r) {
          if (_.contains(studies, r.id)) {
              r.selected = "selected";
          } else {
              r.selected = "";
          }
      })
      return ret;
   },
   genesets : function() {
       var html = '';
       var type = null;
       var selectedGenesets = CurrentChart("genesets");

       GeneSets.find({}, {sort: [["type", "asc"], ["name", "asc"]]})
        .forEach(function(vv) {
           if (type == null || type != vv.type) {
               if (type != null)
                   html += '</optGroup>\n';
               type = vv.type;
               html += '<optGroup label="'+ type +'">';
           }
           selected = _.contains(vv._id, selectedGenesets) ? " selected " : "";
           html += '    <option value="'+ vv.name + '"' + selected + '>' + vv.name + '</option>';
       });
       html += '</optGroup>\n';


       return html;
   },
   additionalQueries : function() {
       var html = '';
       var coll = Collections.Metadata.find({}).fetch();
       var myStudy = "user:" + Meteor.user().username;

       var mine = [];
       var others = [];
       var rest = [];
       coll.map(function(c) {
          if (c.study == "admin")
	      return;
          else if (c.study == myStudy)
	      mine.push(c);
	  else if (c.study.indexOf("user:") == 0)
	      others.push(c);
	  else 
	      rest.push(c);
       });
       function ss(a, b){
          var studyA=a.study.toLowerCase(), studyB=b.study.toLowerCase()
	  if (studyA < studyB) return -1 
	  if (studyA > studyB) return 1

          var nameA=a.name.toLowerCase(), nameB=b.name.toLowerCase()
	  if (nameA < nameB) return -1 
	  if (nameA > nameB) return 1
	  return 0 //default return value (no sorting)
       };
       mine   = mine.sort(ss);
       others = others.sort(ss);
       rest   = rest.sort(ss);

       coll = mine.concat(others).concat(rest);

       coll.map(function(vv) {
           var collName = vv.name;
           html += '<optGroup label="'+vv.study+":"+ collName +'">';

           var ft = vv.fieldTypes;
           var hasSample_ID = false;
           vv.fieldOrder.map(function(fieldName, i) {
               if (fieldName == "Sample_ID")
                   hasSample_ID = true;
           });
           vv.fieldOrder.map(function(fieldName, i) {

               var meta = { 
		   c: collName,
		   f: fieldName, 
                   j: hasSample_ID ? "Sample_ID" : "Patient_ID" ,
		   s: vv.study
               };
               var value = escape(JSON.stringify(meta));
                 

               html += '    <option value="'+ value + '">'+collName + ":" +fieldName+'</option>';
           });

           html += '</optGroup>\n';
       });
       return html;
   },
   unusedDataFieldNames: function() {
       var TheChart = CurrentChart();
       unused = _.difference(_.difference(TheChart.dataFieldNames, TheChart.pivotTableConfig.rows), TheChart.pivotTableConfig.cols);
       return unused
   }
})

Template.checkBox.helpers({
    'checked' : function() {
        return this.state ? "checked" : "";
    }
});


Template.Controls.events({
  'click .element' : function(e) {
       var field =  $(e.target).data("field");
       var TheChart = CurrentChart();
       var analysis = analyze(TheChart.chartData, [field])[field];
       var exclusions = _.clone(TheChart.pivotTableConfig.exclusions);
       var type = TheChart.metadata[field].type;

       var bin = null;
       var binTransform = _.find(TheChart.transforms, function(obj) { return obj.op == "bin" && obj.field == field; });
       if (binTransform) bin = binTransform.value;

       Overlay("Element", { 
	   theChart: TheChart,
	   field: field, 
	   type: type,
	   exclusions: exclusions,
	   bin: bin
       });
  }, 
  'change #previousCharts' : function(e) {
	var _id = $(e.target).val();
	Router.go("/fusion/?id=" +_id);
   },
  'click button[name="newChart"]' : function(e) {
	var _id =  Charts.insert({});
	var d = Charts.findOne({_id: _id});
	Router.go("/fusion/?id=" +_id);
   },
  'click button[name="focus"]' : function(e) {
      var clickedButton = e.currentTarget;
      UpdateCurrentChart("Join", $(clickedButton).val());
      $(clickedButton).addClass("active").siblings().removeClass("active");
   },
  'click .dipsc-phenotype': function(evt, tmpl) {
      Session.set("DIPSCSelectedItem", $(evt.target).data("phenotype"))
   },
  'click #DIPSC' : function(evt, tmpl) {
      var dipsc_id =  CurrentChart("dipsc_id");
      if (dipsc_id == null)
          return;
      var dipsc = DIPSC_coll.findOne({_id: dipsc_id}); 
      if (dipsc)
          Overlay("DIPSC", dipsc);
   },
   'change .transform' : function(evt, tmpl) {
       var transforms = [];
       $('.transform').map(function(i, e) {
           if (e.value) 
               transforms.push( {
                   op: $(e).data("op"),
                   field: $(e).data("field"),
                   precedence: $(e).data("precedence"),
                   value: $(e).val()
               });
        });
       // BUG the sort changes this into an object:
       // transforms = transforms.sort(function(a,b) { return a.precedence - b.precedence; })
       UpdateCurrentChart("transforms", transforms);
   },
   'change .geneLikeDataDomains' : function(evt, tmpl) {
       var $checkbox = $(evt.target)
       var field = $checkbox.data('field');
       var collection = $checkbox.data('collection');
       GeneLikeDataDomainsPrototype.map(function(domain) {
           if ( domain.field == field && domain.collection == collection ) {
              domain.state = $checkbox.prop("checked");
              // update
          }
       });
      UpdateCurrentChart("geneLikeDataDomain", GeneLikeDataDomainsPrototype);
   },

   'click .topMutatedGenes': function(evt, tmpl) {
        var $link = $(evt.target);
        Meteor.call("topMutatedGenes", function(err,data) {
            Overlay("Picker", { 
                data: data, 

                title: "Top Mutated Genes (click to select)",


                reactiveTableFields: function() {
                   return [
                    { key: 'Hugo_Symbol', label: 'Gene' },
                    { key: 'count', label: 'Number of Mutations', sort: 'descending' },
                   ]
                },

                renderRow: function(elem, d) {
                    if (d.Hugo_Symbol == null)
                        return;
                    var genelist = CurrentChart("genelist");
                    var k = genelist.indexOf(d.Hugo_Symbol);
                    if (k >= 0) {
                        $(elem).addClass("includeThisGene");
                    }
                },

                selectRow: function(elem, d) {
                    var gene = d.Hugo_Symbol;
                    if (gene == null)
                        return
                    var genelist = CurrentChart("genelist");
                    $(elem).addClass("includeThisGene");
                    var k = genelist.indexOf(gene);
                    if (k < 0) {
                        // add it
                        genelist.push(gene)
                        UpdateCurrentChart("genelist", genelist);
                        var $genelist = $("#genelist");
                        $genelist.select2("data", genelist.map(function(e) { return { id: e, text: e} }));
                    }
                },

                clearRow: function(elem, d) {
                    var gene = d.Hugo_Symbol;
                    if (gene == null)
                        return
                    var genelist = CurrentChart("genelist");
                    $(elem).removeClass("includeThisGene");
                    var k = genelist.indexOf(gene);
                    if (k >= 0) {
                        // remove it
                        genelist.splice(k,1);
                        UpdateCurrentChart("genelist", genelist);
                        var $genelist = $("#genelist");
                        $genelist.select2("data", genelist.map(function(e) { return { id: e, text: e} }));
                    }
                },


                clickRow: function(elem, d) {
                    var gene = d.Hugo_Symbol;
                    if (gene == null)
                        return
                    var genelist = CurrentChart("genelist");
                    var k = genelist.indexOf(gene);
                    if (k >= 0) {
                        // remove it
                        $(elem).removeClass("includeThisGene");
                        genelist.splice(k,1);
                    } else {
                        // add it
                        $(elem).addClass("includeThisGene");
                        genelist.push(gene)
                    }
                    UpdateCurrentChart("genelist", genelist);

                    var $genelist = $("#genelist");
                    $genelist.select2("data", genelist.map(function(e) { return { id: e, text: e} }));
                }
            });
        })
   },

   'click #TableBrowser': function(evt, tmpl) {
	var currentChart = CurrentChart();
	/*
	var fields = ["Patient_ID", "Sample_ID"].concat(currentChart.pivotTableConfig.cols.concat( currentChart.pivotTableConfig.rows ));
	var data = currentChart.chartData.map( function(doc) {
	    var newDoc = {};
	    fields.map(function(f) {
	    	newDoc[f] = doc[f];
	    });
	    return newDoc;
	});
	schema = [];
	fields.map(function(f) {
	   schema.push(currentChart.metadata[f]);
	});
	*/

        Overlay("TableBrowser", {_id: currentChart._id, save:true});
    },


   'click .inspect': function(evt, tmpl) {
        var $link = $(evt.target);
        var v = $link.data("var");
        var data = CurrentChart(v);
        Overlay("Inspector", { data: data });
   },
   'change #studies' : function(evt, tmpl) {
       var s = $("#studies").select2("val");
       UpdateCurrentChart("studies", s);
   },
   'change #additionalQueries' : function(evt, tmpl) {
       var additionalQueries = $("#additionalQueries").select2("val");
       UpdateCurrentChart("additionalQueries", additionalQueries);
   },
   'change #samplelist' : function(evt, tmpl) {
       var s = $("#samplelist").val();
       s = s.split(/[ ,;]/).filter(function(e) { return e.length > 0 });
       UpdateCurrentChart("samplelist", s);
   },

   'change #genelist' : function(evt, tmpl) {
       var $genelist = $("#genelist");
       var before = $genelist.select2("val");
       UpdateCurrentChart("genelist", before);
   },

   'change #genesets' : function(evt, tmpl) {
       var genesets = [];
       $(evt.target.selectedOptions).each(function(i, opt) {
           var _id = $(opt).val();
           genesets.push(_id);
       });
       UpdateCurrentChart("genesets", genesets); 
   },

   'click #clear' : function(evt, tmpl) {
       var $genelist = $("#genelist");
       $genelist.select2("data", [] );
       UpdateCurrentChart("genelist", []);
   },
   'change .pvtRenderer' : function(evt, tmpl) {
       var renderer = $(".pvtRenderer").val();
       UpdateCurrentChart("pivotTableConfig.rendererName", renderer);
   },
})

function initializeHtmlElements(document) {

    $('.pvtRenderer').find("option[value='"+
	document.pivotTableConfig.rendererName
	+"']").attr("selected",true);

    if (document & document.samplelist)
         $("#samplelist").val(document.samplelist);

     GeneLikeDataDomainsPrototype.map(function(domain) {
          $("input[name='" + domain.checkBoxName + "']").prop("checked", domain.state);
     });
     if (document && document.geneLikeDataDomain) {
         document.geneLikeDataDomain.map(function(domain) {
             $("input[name='" + domain.checkBoxName + "']").prop("checked", domain.state);
         });
     }

      // init to default values
      GeneLikeDataDomainsPrototype.map(function(gld) {
	  $("input[name='" + gld.checkBoxName + "']").prop(gld.state);
      });

      var prevGeneLikeDataDomains = CurrentChart("geneLikeDataDomain");
      if (prevGeneLikeDataDomains)
	  prevGeneLikeDataDomains.map(function(gld) {
	      $("input[name='" + gld.checkBoxName + "']").prop(gld.state);
	  });

     $('.studiesSelectedTable th').hide();
}

function initializeJQuerySelect2(document) {
     $("#additionalQueries").select2( {
       placeholder: "type in diease or study name",
       allowClear: true
     } );

     $("#studies").select2( {
       placeholder: "Select one or more studies",
       allowClear: true
     } );

     var $genelist = $("#genelist");
     if (document.genelist)
	 $genelist.val(document.genelist.join(" "));
     else
	 $genelist.val("");

     var httpGenesUrl = "/fusion/genes";
     var httpGeneListPreciseUrl = "/fusion/geneListPrecise";
     $genelist.select2({
          initSelection : function (element, callback) {
            var prev = document;
            if (prev && prev.genelist)
                callback( prev.genelist.map(function(g) { 
		    return { id: g, text: g }}) );
          },
          multiple: true,
          ajax: {
            url: httpGenesUrl ,
            dataType: 'json',
            delay: 250,
            data: function (term) {
              var qp = {
                q: term.toUpperCase()
              };
              return qp;
            },
            results: function (data, page, query) { return { results: data.items }; },
            cache: true
          },


	  tokenizer: function(input, selection, callback) {
	    var parts = input.split(/[ ;,\t]/)
		.filter(function(s) { return s && s.length > 1})
		.filter(function(s) { return s.match(/^[a-z0-9]+$/i)});
            if (parts.length == 1) return;

	    // We only get here on a paste
	    // AR, TP53
	     HTTP.get(httpGeneListPreciseUrl+"?q=" + parts.join(","), function(error, result) {
		if (error == null)
		    try {
		    	var prevItems = $("#genelist").select2("data");
			var newItems = prevItems.concat(JSON.parse(result.content).items);
			$("#genelist").select2("data", newItems);
		    } catch (exc) {}
	     });
          },
          escapeMarkup: function (markup) { return markup; }, // let our custom formatter work
          minimumInputLength: 2,
     });
     var $genesets = $("#genesets");
     $genesets.select2();

}


Template.Transforms.helpers({

   dataFieldNames: function() {
       var dataFieldNames = CurrentChart("dataFieldNames");
       if (dataFieldNames) {
           return dataFieldNames.sort();
       }
       return [];
   },
});

st = new Date();


cc = null;

CurrentChart = function(name) {
    var x = Charts.findOne({_id: TheChartID});
    if (x == null) return null;
    cc = x;
    if (name)
        return x[name];
    else
        return x;
}

UpdateCurrentChart = function(name, value) {
    var x = Charts.find({_id: TheChartID});
    x[name] = value;
    var u =  {};
    u[name] = value;
    Charts.update({_id: TheChartID}, {$set: u});
}


renderChart = function() {
    var _id = CurrentChart("_id");
    var watch = Charts.find({_id: _id});

    var currentChart = watch.fetch()[0];
    var element = this.find(".output");

    var dipsc_id =  CurrentChart("dipsc_id");
    Meteor.subscribe("DIPSC", dipsc_id);


    /*
    if (ChartDocument.studies == null || ChartDocument.studies.length == 0)
        ChartDocument.studies = ["prad_wcdt"]; // HACK HACK
    */

    RefreshChart(_id, true);

    watch.observeChanges({
        changed: RefreshChart
    }); // watch.observeChanges

    $('#genesets').select2({ placeholder: "Select a pathway or geneset" });
    // AR TP53
    /*
    $('body').on('paste', '.select2-input', function () {
	    var that = this;
	    setTimeout(function () {
		var tokens = that.value.split(/[\,\s]+/);$(that).blur();
		$('#genesets').val(tokens, true);
		console.log($('#genesets').select2('val'));
	    }, 1);
	});
    */
} // renderChart;


Template.Controls.rendered = function(){
   var TheChart = CurrentChart();
   initializeHtmlElements(TheChart);
   initializeJQuerySelect2(TheChart);
   initializeJQuerySortable(TheChart);
};

/*
Template.AllCharts.helpers({
    allCharts: function() {
        return Charts.find({svgHtml: {$exists:1}}, {fields: {svgHtml:1}});
     }
});

function asSvgHtml(cols, rows) {
    function get(a,i) { return a.length > i ? a[i] : "";};

    return "<svg > <title>SVG Table</title> <g id='columnGroup'> <rect x='65' y='10' width='75' height='110' fill='gainsboro'/> <rect x='265' y='10' width='75' height='110' fill='gainsboro'/> <text x='30' y='30' font-size='18px' font-weight='bold' fill='crimson'> <tspan x='30' dy='1.5em'>"+get(col,0)+"</tspan> <tspan x='30' dy='1em'>"+get(col,0)+"</tspan> <tspan x='30' dy='1em'>"+get(col,0)+"</tspan> <tspan x='30' dy='1em'>"+get(col,0)+"</tspan> </text> </g> </svg>";
}
Template.AllCharts.events({
  'click div.aChart' : function(e) {
	var id = $(e.target).data("_id");
	if (id == null)
	  id = $(e.target).parents(".aChart").data("_id")
	Router.go("/fusion/?id=" + id);
   }
});
*/

initializeJQuerySortable = function() {
   var wells = $(".cold").find(".pvtAxisContainer");

    $(".cold").find(".pvtAxisContainer").sortable({
      update: function(e, ui) {
         var well = ui.item.parent();
         var field = ui.item.data("field");
	 var TheChart = CurrentChart();

	 if (well.hasClass("pvtUnused")) {
	     Charts.update({_id: TheChart._id},
	       {$pull:
		 { 
		  "pivotTableConfig.cols": field,
		  "pivotTableConfig.rows": field
		 }
	       }
	     );
	 } else if (well.hasClass("pvtUsed")) {
	     if (this === ui.item.parent()[0]) {// http://forum.jquery.com/topic/sortables-update-callback-and-connectwith

		 var cols = $(".pvtCols.pvtUsed").children().map(function(i, e) {return $(e).data("field")}).get();
		 var rows = $(".pvtRows.pvtUsed").children().map(function(i, e) {return $(e).data("field")}).get();
		 Charts.update({_id: TheChart._id},
		   {$set:
		     { 
		      "pivotTableConfig.cols": cols,
		      "pivotTableConfig.rows": rows
		      }
		   });

	     }
	 }
      },
      connectWith: wells,
      items: 'li',
      placeholder: 'pvtPlaceholder'
    });

};

