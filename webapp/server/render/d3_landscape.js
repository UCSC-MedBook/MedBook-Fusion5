var colors = ["#f898e8", "#f87859", "#ffad33", "#00b6ff", "#ee6900", "#00a167", "#005d4d", "#d0ecb2", "#de6d8a", "#862e7b", "#861a41", "#00fadb", "#006fdb", "#006a97", "#ffbdb5", "#835de7", "#374e14", "#acb20e", "#00def7", "#00cb2d", "#901500", "#ccccff"];


var leftleftLabel = 100;
var leftLabel = 200;
var mark_unit_width=10, mark_unit_height=20;

D3Landscape = function(window, chartDocument, opts, exclusions) {
    var geneDataBundle = query(chartDocument);

    var WIDTH = (leftLabel + (chartDocument.chartData.length * mark_unit_width)) + "px";

    var wrapper = window.$("<div id='wrapper' >").css({ width: WIDTH, height: "1000px" });
    var viz = window.$("<div id='viz' >").css({ "margin-top": "20px", width: WIDTH, height: "1000px" }).appendTo(wrapper);
    window.$("<div id='stat' class='stat'title='two-tail P-value'>" ).css({ width: "100%", height: "50" }).appendTo(wrapper);

    var v = _.clone(chartDocument.pivotTableConfig.rows);
    var h = _.clone(chartDocument.pivotTableConfig.cols);

    debugger;
    var xk = Object.keys(exclusions);
    var data = chartDocument.chartData.filter(function(elem) {
        for (var i = 0; i < xk.length; i++) {
            var k = xk[i];
            var v = exclusions[k];
            if (v.indexOf(String(elem[k])) >= 0)
                return false;
        }
        return true;
    });
    // Session.set("ChartDataFinal", data);

    var analysis = analyze(chartDocument.chartData, h.concat(v));;
    function numbers(field) {
        return analysis[field].isNumbers;
    }

    var x = _.find(h, numbers);
    var y = _.find(v, numbers);

    h = _.without(h, x);
    v = _.without(v, y);

    function unique(attribute) { 
        var values = new Object();
        data.map(function(elem) { values[elem[attribute]] = 1; }); 
        return Object.keys(values).map(function(value)  { return [ attribute, value] });
    }

    var predicates = cartesianProductOf(h.concat(v).map(unique));

    var legend = window.$('<div class="legend" style="background-color:#fff3ea;float:right;margin-right:20px;">').appendTo(wrapper);
    addViz(window, geneDataBundle, viz[0], chartDocument, WIDTH,legend);
    return wrapper;
} // D3Landscape()

var gene_list =  ["AR", "TP53", "PTEN", "FOXA1", "ZBTB16", "NCOR1", "NCOR2", "PIK3CA", "PIC3CB", "PIK3R1", "AKT1", "BRAF", "RAF1", "APC", "CTNNB1", "RSPO2", "ZNRF3", "BRCA2", "ATM", "BRCA1", "CDK12", "MLH1", "MSH2", "RB1", "CDKN1B", "CDKN2A", "CCND1", "KMT2C", "KMT2D", "KDM6A", "CHD1", "SPOP", "MED12", "ZFHX3", "ERF", "GNAS"];

var gene_panel =  [ 
    {name:"Important", feature_list: ["AR", "TP53", "PTEN"]},
    {name:"AR-Associated", feature_list: ["FOXA1", "ZBTB16", "NCOR1", "NCOR2"]},
    {name:"PI3K Pathway", feature_list: [ "PIK3CA", "PIC3CB", "PIK3R1", "AKT1"]},
    {name:"RAF Pathway", feature_list: [ "BRAF", "RAF1"]},
    {name:"WNT Pathway", feature_list: ["APC", "CTNNB1", "RSPO2", "ZNRF3"]},
    {name:"DNA Repair", feature_list: ["BRCA2", "ATM", "BRCA1", "CDK12", "MLH1", "MSH2"]},
    {name:"Cell Cycle", feature_list: ["RB1", "CDKN1B", "CDKN2A", "CCND1"]},
    {name:"Chromatin Modifier", feature_list: ["KMT2C", "KMT2D", "KDM6A", "CHD1"]},
    {name:"other", feature_list: ["SPOP", "MED12", "ZFHX3", "ERF", "GNAS"]}
];
function query(chartDocument) {
   var study_label = chartDocument.studies[0];
   var study = Collections.studies.findOne({id: study_label});

   var gene_data = Mutations.find({study_label: study_label, gene_label: {$in: gene_list}}).fetch();

   var sample_labels = 
   	_.union( study.Sample_IDs,
	       Object.keys(study.gene_expression_index),
	       gene_data.map(function (gd) { return gd.sample_label  })).sort();

   var gene_labels = gene_data.map(function(doc) { return doc.gene_label; });
   return { study: study, gene_data: gene_data, gene_labels: gene_labels, sample_labels: sample_labels};
}

var margin = {top: 50, right: 00, bottom: 40, left: 10, leftMost: 10};

function addViz(window, geneDataBundle, viz, chartDocument, WIDTH,legend) {

    var probability_color = d3.scale.linear() .domain([0, .1])
        .range(["green", "white"]);

    var width = parseInt(d3.select(viz).style('width'), 10) - margin.left - margin.right;
    var height = parseInt(d3.select(viz).style('height'), 10) - margin.top - margin.bottom;






    var svg = d3.select(viz).append("svg").attr("id", "vizsvg")
	.attr("width", width + margin.left + margin.right)
	.attr("height", height + margin.top + margin.bottom)
        .append("g")
	   .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // svg.append("g").attr("class", "axis").attr("transform", "translate(0," + height + ")") .call(xAxis);
    // svg.append("g").attr("class", "axis").attr("transform", "translate(" + leftLabel + ", 0)") .call(yAxis);


    var fields = chartDocument.pivotTableConfig.cols.concat( chartDocument.pivotTableConfig.rows);


    var j = 0;
    var k = fields.length;
    for (var j = 0; j < gene_panel.length; j++)  {
	var g = svg
	   .append("g")
	   .attr("transform", "translate(" + 0 +  "," + ((0.5+k)*mark_unit_height) + ")");

         var hh = (mark_unit_height * gene_panel[j].feature_list.length) -5;
	 var ww = leftLabel;
	 g.append("rect")
	   .attr("x", 0)
	   .attr("y", 0)
	   .attr("width", WIDTH)
	   .attr("height", hh)
	   // .attr("stroke", "green") .attr("stroke-width", "3px")
	   .attr("fill", colors[j])
	   .style("opacity", 0.5)

	 g.append("text")
	    .text(gene_panel[j].name)
	    .attr("x",  leftleftLabel)
	    .attr("y", hh/2)
	    .attr("font-size",10)
	    .attr("font-family","sans-serif")
	    .attr("text-anchor","middle")
	    .attr("font-weight","bold")
            .attr("transform", "rotate(-30, " + (ww/2) +","+  (hh/2)+ ")");


	for (var jj = 0; jj < gene_panel[j].feature_list.length; jj++, k++)  {
	    g.append("text")
		.text(gene_panel[j].feature_list[jj])
		.attr("y", (jj*mark_unit_height)+10)
		.attr("x",  leftLabel -2)
		.attr("font-size",10)
		.attr("font-family","sans-serif")
		.attr("text-anchor","end")
		.attr("font-weight","bold")
	}
    }

    function rect(i, j, pvalue, label, text2, text3, color) {
	var x = leftLabel + (i*mark_unit_width);
	var y = (j*mark_unit_height) + 10;
	var rectangle = svg.append("rect")
	  .attr("x", x)
	  .attr("y", y)
	  .attr("text", label)
	  .attr("text2", text2)
	  .attr("text3", text3)
	  .attr("class", "BoxPlotToolTipHover")
	  .attr("width", mark_unit_width)
	  .attr("height", mark_unit_height);
        
	if (color == null)
	  rectangle.style("fill", probability_color(pvalue));
        else
	  rectangle.style("fill", color);
    }

    var sample_label_map = {};

    chartDocument.chartData.map(function(doc, i) {
	sample_label_map[doc.Sample_ID] = i;
    });

    var gene_label_map = {};
    gene_list.map(function(gene, j) {
        gene_label_map[gene_list[j]] = fields.length + j;
    });


    geneDataBundle.gene_data.map(function(doc) {
	var i = sample_label_map[doc.sample_label];
	var j = gene_label_map[doc.gene_label];
	var label = doc.sample_label;

	var text2 = doc.gene_label + " " + doc.mutation_type; 
	if (doc.chasm_driver_p_value)
	    text2 += "  chasm driver pval " + doc.chasm_driver_p_value.toPrecision(3);

	var text3 = doc.protein_change;
	if (doc.vest_pathogenicity_p_value)
	    text3 += " vest path pval " + doc.vest_pathogenicity_p_value.toPrecision(3);

	rect(i, j, doc.chasm_driver_p_value, label, text2, text3);
    });



    var categorical_color_map = d3.scale.category20c();

    function addLegend(field, value, color) {
        var line = window.$("<div>").appendTo(legend);

        window.$("<div style='display:inline-block;border:1px solid %000;'>&nbsp;</div>").css({
          background: color,
          width:  mark_unit_width  + "px",
          height: mark_unit_height + "px",
        }).appendTo(line);
        window.$("<span>"  + field+",&nbsp"+value + "</span>").appendTo(line);
    };


    fields.map(function(field, j) {
	var meta = chartDocument.metadata[field];
	var numerical_color_map;

	if (meta.type == "String" && meta.allowedValues  && meta.allowedValues.length > 0 && meta.allowedValues.length < 10) {
	    meta.allowedValues.map(function (value) { 
		var color = categorical_color_map(field+";"+value)
		addLegend(field, value, color);
	    });
	} else if (meta.type == "Number") {
	     var values =_.pluck(chartDocument.chartData, field).filter(function(n) { return !isNaN(n)});
		 max = _.max(values),
	         min = _.min(values),
		 mid = (max + min) / 2; 
	     numerical_color_map = d3.scale.linear().domain([min, mid, max]).range(["blue", "white", "red"]);
	}


	chartDocument.chartData.map(function(doc, i) {
	    // var i = sample_label_map[doc.Sample_ID];

	    var value = doc[field];
	    var color = "orange";
	    if (meta.type == "String")
	    	color = categorical_color_map(field+";"+value);
	    else if (meta.type == "Number") {
	    	color = numerical_color_map(value);
	    }

	    rect(i, j, 0, doc.Sample_ID, field, String(value), color);
	})
	svg.append("text")
	    .text(field)
	    .attr("y", (j+1)*mark_unit_height +6)
	    .attr("x",  leftLabel -2)
	    .attr("font-size",10)
	    .attr("font-family","sans-serif")
	    .attr("text-anchor","end")
	    .attr("font-weight","bold")
    });
}

