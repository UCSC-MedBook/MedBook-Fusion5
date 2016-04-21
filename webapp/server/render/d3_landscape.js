/*
 * this file has the landscape visualizaton.
 */
var colors = ["rgba(179,100,200,0.3)", "rgba(100,200,146,0.3)", "rgba(200,50,50,0.3)", "rgba(100,225,250,0.3)", "#ffbdb5", "#835de7", "#00b6ff", "#00fadb", "#ee6900", "#acb20e", "#f898e8", "#f87859", "#ffad33", "#d0ecb2", "#00def7", "#de6d8a", "#00cb2d", "#901500", "#ccccff"];

var Prototype_gene_panel =  [ 
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


var mark_unit_width=10, mark_unit_height=20;

D3Landscape = function(window, chartDocument, opts, exclusions) {
    // console.log("landscape chartDocument.length", chartDocument.chartData.length);
    var start = Date.now();

    var gene_panel = chartDocument.genePanel || Prototype_gene_panel;

    if (gene_panel == null || gene_panel.length == 0)
       throw new Error("Click on gene panel and add some gene sets");

    var maxLabel = 0;
    for (var j = 0; j < gene_panel.length; j++)  {
         var l  = gene_panel[j].name.length;
	 for (var k = 0; j < gene_panel[j].feature_list.length; j++)  {
	     var ll = 2 + l + gene_panel[j].feature_list[k].length;
	     if (maxLabel < ll) maxLabel = ll;
	 }
    }
    var leftLabel = maxLabel * mark_unit_width;


    var WIDTH = (leftLabel + (chartDocument.chartData.length * mark_unit_width)) + "px";

    var wrapper = window.$("<div id='wrapper' >").css({ width: WIDTH, height: "auto" });
    window.$("<div id='stat' class='stat'title='two-tail P-value'>" ).css({ width: "100%", height: "50" }).appendTo(wrapper);

    var v = _.clone(chartDocument.pivotTableConfig.rows);
    var h = _.clone(chartDocument.pivotTableConfig.cols);

    var xk = Object.keys(exclusions);
    chartDocument.chartData = chartDocument.chartData.filter(function(elem) {
        for (var i = 0; i < xk.length; i++) {
            var k = xk[i];
            var v = exclusions[k];
            if (v.indexOf(String(elem[k])) >= 0)
                return false;
        }
        return true;
    });
    // Session.set("ChartDataFinal", chartDocument.chartData);

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
        chartDocument.chartData.map(function(elem) { values[elem[attribute]] = 1; }); 
        return Object.keys(values).map(function(value)  { return [ attribute, value] });
    }

    var predicates = cartesianProductOf(h.concat(v).map(unique));

    var gene_labels = _.union.apply(null, _.pluck(gene_panel, "feature_list"));
    // console.log("gene_labels", gene_labels);

    var sample_labels = _.pluck(chartDocument.chartData, "Sample_ID");
    // console.log("sample_labels", sample_labels.sort());
    var study_labels = chartDocument.studies;
    var gene_data = Mutations.find({ "chasm_driver_p_value": {$lte: 0.05}, 
	   study_label: {$in: study_labels},
	   gene_label: {$in: gene_labels},
	   sample_label: {$in: sample_labels}
    }).fetch();
    sample_labels = _.unique(gene_data.map(function (gd) { return gd.sample_label  }).sort());
    // console.log("number of samples which contain mutations", sample_labels.length);
    // console.log("sample_labels", sample_labels.sort());

    function query(chartDocument, gene_list) {
       var study_labels = chartDocument.studies;
       var gene_data = Mutations.find({ "chasm_driver_p_value": {$lte: 0.05}, 
	   study_label: {$in: study_labels},
	   gene_label: {$in: gene_list}
	   // sample_label: {$in: chartDocument.sample_list}
       }).fetch();

       var gene_labels = gene_data.map(function(doc) { return doc.gene_label; });
       var counts = _.countBy(gene_labels);
       gene_labels = _.uniq(gene_labels);
       return {  gene_data: gene_data, gene_labels: gene_labels, sample_labels: sample_labels};
    }

    var margin = {top: 50, right: 00, bottom: 40, left: 10, leftMost: 10};
    var fontSize = 10, fontSizeHalf = 5;
    var SVGwidth = WIDTH; // parseInt(d3.select(viz).style('width'), 10);

    var sample_label_map = {};
    var n = 0;
    chartDocument.chartData.map(function(doc) {
	if (_.indexOf(sample_labels, doc.Sample_ID, true) >= 0)
	    sample_label_map[doc.Sample_ID] = n++;
    });
    // console.log("number of samples", n);

    function addViz(klass, collapse, background_color) {
	var geneDataBundle = query(chartDocument, bunch.feature_list);

	if ( geneDataBundle.gene_labels.length == 0) // no mutations matching the criteris found;
	    return 0;

	if (collapse) {
	    geneDataBundle.gene_labels = [""];
	    /*
	    geneDataBundle.gene_data.map(function(doc) {
		doc.gene_label = "none";
	    });
	    */
	}
	// console.log("bundle", geneDataBundle);


	var feature_list = geneDataBundle.gene_labels;
	var height = mark_unit_height * feature_list.length;

	var viz = window.$("<div id='viz' >").css({ 
	    "display": collapse ? "display" : "none", // display collapsed by default
	    "margin-bottom": "2px",
	    width: WIDTH,
	    height: height + "px" }).appendTo(wrapper);

	viz.addClass(klass);
	viz = viz[0];

	var probability_color = d3.scale.linear() .domain([0, .1])
	    .range(["green", "white"]);

	var SVGheight = parseInt(d3.select(viz).style('height'), 10);


	var svg = d3.select(viz).append("svg").attr("id", "vizsvg")
	    .attr("width", SVGwidth)
	    .attr("height", SVGheight)
	    .append("g").attr("transform", "translate(" + margin.left + ", -10)");

	var j = 0;
	var g = svg
	   .append("g")
	   .attr("transform", "translate(" + 0 +  "," + ((0.5)*mark_unit_height) + ")");

	var feature_list_height = (mark_unit_height * feature_list.length) -5;
	g.append("rect")
	  .attr("x", 0)
	  .attr("y", 0)
	  .attr("class", "Toggle")
	  .attr("data-klass", klass)
	  .attr("onClick", "Toggle(event)")
	  .attr("height", feature_list_height)
	  .attr("width", 2000)
	  .attr("fill", background_color)


	 var bunch_label_toggle = g.append("rect")
	    .attr("class", "Toggle")
	    .attr("onClick", "Toggle(event)")
	    .attr("x", 0)
	    .attr("y", 0)
	    .attr("rx", collapse ? 3 : 5)
	    .attr("ry", collapse ? 3 : 5)
	    .attr("height", feature_list_height)
	    .attr("width", leftLabel)
	    .attr("class", "Toggle")
	    .attr("data-klass", klass)
	    .attr("fill", "white")
	    .attr("fill-opacity", "0.03")

	 var bunch_label = g.append("text")
	    .text(bunch.name)
	    .attr("x",   collapse ? leftLabel : (leftLabel / 2))
	    .attr("y", feature_list_height/2 + fontSizeHalf )
	    .attr("font-size",fontSize)
	    .attr("font-family","sans-serif")
	    .attr("text-anchor",collapse ? "end" : "middle")
	    .attr("font-weight","bold")
	    .attr("class", "Toggle")
	    .attr("onClick", "Toggle(event)")
	    .attr("data-klass", klass)

	if (feature_list.length > 2) {
	    var degrees = feature_list.length < 5  ? -10 : -30;
	    bunch_label.attr("transform", "rotate(" + degrees + ", " + (leftLabel/2) +","+  (feature_list_height/2)+ ")");
	}


	for (var jj = 0; jj < feature_list.length; jj++)  {
	    g.append("text")
		.text(feature_list[jj])
		.attr("y", (jj*mark_unit_height)+10)
		.attr("x",  leftLabel -2)
		.attr("font-size",10)
		.attr("font-family","sans-serif")
		.attr("text-anchor","end")
		.attr("font-weight","bold")
	}

	function rect(i, j, pvalue, label, text2, text3, color) {
	    if (i == null) i = 0;
	    if (j == null) j = 0;
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

	var gene_label_map = {};
	feature_list.map(function(gene, j) { gene_label_map[gene] =  j; });


	geneDataBundle.gene_data.map(function(doc) {
	/*
	    if (doc.gene_label == null || doc.gene_label == "none")
		return;
	*/
	    if (doc.sample_label == null || doc.sample_label == "none")
		return;

	    var i = sample_label_map[doc.sample_label];
	    if (i == null) return;
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

        return geneDataBundle.gene_labels.length
    }

    function addFields() {
	var fields = chartDocument.pivotTableConfig.cols.concat( chartDocument.pivotTableConfig.rows);
	if (fields.length == 0)
	    return 

	var SVGheight = fields.length * mark_unit_height;
	var viz = window.$("<div id='viz' >").css({  width: SVGwidth, height: SVGheight + "px" }).appendTo(wrapper);
	var probability_color = d3.scale.linear() .domain([0, .1]).range(["green", "white"]);

	viz = viz[0];

	var svg = d3.select(viz).append("svg").attr("id", "vizsvg")
	    .attr("width", SVGwidth)
	    .attr("height", SVGheight)
	    .append("g").attr("transform", "translate(" + margin.left + ", -10)");

	var j = 0;
	var k = fields.length;
	var g = svg
	   .append("g")
	   .attr("transform", "translate(" + 0 +  "," + ((0.5+k)*mark_unit_height) + ")");

	function rect(i, j, pvalue, label, text2, text3, color) {
	    if (i == null) return;
	    if (j == null) return;
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

	var categorical_color_map = d3.scale.category20c();

	fields.map(function(field, j) {
	    var meta = chartDocument.metadata[field];
	    if (meta == null)
	       throw new Error("In landscape, undefined field:" + String( field));

	    var numerical_color_map;


	    if (meta.type == "String" && meta.allowedValues  && meta.allowedValues.length > 0 && meta.allowedValues.length < 10) {
		meta.allowedValues.map(function (value) { 
		    var color = categorical_color_map(field+";"+value)
		    // addLegend(field, value, color);
		});
	    } else if (meta.type == "Number") {
		 var values =_.pluck(chartDocument.chartData, field).filter(function(n) { return !isNaN(n)});
		     max = _.max(values),
		     min = _.min(values),
		     mid = (max + min) / 2; 
		 numerical_color_map = d3.scale.linear().domain([min, mid, max]).range(["blue", "white", "red"]);
	    }

	    chartDocument.chartData.map(function(doc) {
		var i = sample_label_map[doc.Sample_ID];

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


    addFields();

    for (var j = 0; j < gene_panel.length; j++)  {
        var bunch = gene_panel[j]
	var background_color = colors[(j % colors.length)];
	addViz("k" + j, true, "white");
	addViz("k" + j, false, background_color);
    }

    // console.log("landscape elapsed time", Date.now() - start);

    return wrapper;
} // D3Landscape()

