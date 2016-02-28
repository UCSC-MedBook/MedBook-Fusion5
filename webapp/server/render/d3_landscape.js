var colors = ["#f898e8", "#f87859", "#ffad33", "#00b6ff", "#ee6900", "#00a167", "#005d4d", "#d0ecb2", "#de6d8a", "#862e7b", "#861a41", "#00fadb", "#006fdb", "#006a97", "#ffbdb5", "#835de7", "#374e14", "#acb20e", "#00def7", "#00cb2d", "#901500", "#ccccff"];

D3Landscape = function(window, chartDocument, opts, exclusions) {
    var geneDataBundle = query(chartDocument);

    var wrapper = window.$("<div id='wrapper' >").css({ width: "800px", height: "1000px" });
    var viz = window.$("<div id='viz' >").css({ "margin-top": "20px", width: "800px", height: "1000px" }).appendTo(wrapper);
    window.$("<div id='stat' class='stat'title='two-tail P-value'>" ).css({ width: "100%", height: "50" }).appendTo(wrapper);

    var v = _.clone(chartDocument.pivotTableConfig.rows);
    var h = _.clone(chartDocument.pivotTableConfig.cols);

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

    var legend = window.$('<div class="legend" style="float:right;margin-right:20px;">').appendTo(wrapper);
    predicates.map(function(p, i) {
        var line = window.$("<div>").appendTo(legend);
        window.$("<div style='display:inline-block;'>").css({
          background: colors[i],
          width: "20px",
          height: "20px",
          "border-radius": "50%",
        }).appendTo(line);

        window.$("<span>"  
            + p.map(function(pp) { return pp[0] + "=" + pp[1] }).join(",&nbsp")
            + "</span>").appendTo(line);
    });

    addViz(geneDataBundle, viz[0], chartDocument);
    return wrapper;
} // D3Landscape()

var gene_list =  ["AR", "TP53", "PTEN", "FOXA1", "ZBTB16", "NCOR1", "NCOR2", "PIK3CA", "PIC3CB", "PIK3R1", "AKT1", "BRAF", "RAF1", "APC", "CTNNB1", "RSPO2", "ZNRF3", "BRCA2", "ATM", "BRCA1", "CDK12", "MLH1", "MSH2", "RB1", "CDKN1B", "CDKN2A", "CCND1", "KMT2C", "KMT2D", "KDM6A", "CHD1", "SPOP", "MED12", "ZFHX3", "ERF", "GNAS"];

function query(chartDocument) {
   var study_label = chartDocument.studies[0];
   var study = Collections.studies.findOne({id: study_label});
   var sample_labels = study.Sample_IDs;

   var gene_data = Mutations.find({study_label: study_label, gene_label: {$in: gene_list}}).fetch();

   var gene_labels = gene_data.map(function(doc) { return doc.gene_label; });
   var sort_order = [];
   for (var i = 0; i < study.Sample_IDs; i++)
       sort_order.push(study.gene_expression_index[sample_labels[i]]);
   return { study: study, gene_data: gene_data, gene_labels: gene_labels, sample_labels: sample_labels,  sort_order: sort_order };
}

var margin = {top: 50, right: 00, bottom: 40, left: 10, leftMost: 10};

function addViz(geneDataBundle, viz, chartDocument) {

    var probability_color = d3.scale.linear() .domain([0, .1])
        .range(["green", "white"]);

    var width = parseInt(d3.select(viz).style('width'), 10) - margin.left - margin.right;
    var height = parseInt(d3.select(viz).style('height'), 10) - margin.top - margin.bottom;

    // var xScale = d3.scale.ordinal() .domain(geneDataBundle.sample_labels) .rangePoints([0, width]);
    var yScale = d3.scale.ordinal() .domain(gene_list) .rangePoints([0, height]);

    // var xAxis = d3.svg.axis().scale(xScale).orient("bottom");
    var yAxis = d3.svg.axis().scale(yScale).orient("left");

    var leftLabel = 100;

    var svg = d3.select(viz).append("svg").attr("id", "vizsvg")
	.attr("width", width + margin.left + margin.right)
	.attr("height", height + margin.top + margin.bottom)
        .append("g")
	   .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // svg.append("g").attr("class", "axis").attr("transform", "translate(0," + height + ")") .call(xAxis);
    svg.append("g").attr("class", "axis").attr("transform", "translate(" + leftLabel + ", 0)") .call(yAxis);

    var w=10, h=20;

    /*
    function leftText(text, j) {
	var x = leftLabel;
	var y = (j*h) + 10;
	var text = svg.append("text")
	  .attr("x", x)
	  .attr("y", y)
	  .attr("text", text)
    }

    gene_list.map(leftText);
    */

    svg.selectAll("text")
	.data(gene_list)
	.enter()
	.append("text")
	.text(function(d){ return d; })
	.attr("y",function(d,j){ return (j*h)+10 })
	.attr("x", function(d,i){ return leftLabel })
	.attr("font-size",10)
	.attr("font-family","serif")
	// .attr("text-anchor","middle")
	.attr("font-weight","bold");


    function rect(i, j, pvalue, label, text2, text3) {
	var x = leftLabel + (i*w) + 10;
	var y = (j*h) + 10;
	var rectangle = svg.append("rect")
	  .attr("x", x)
	  .attr("y", y)
	  .attr("text", label)
	  .attr("text2", text2)
	  .attr("text3", text3)
	  .attr("class", "BoxPlotToolTipHover")
	  .attr("width", w)
	  .attr("height", h)
	  .style("fill", probability_color(pvalue));
    }
    var sample_label_map = {};
    geneDataBundle.sample_labels.map(function(sample_label, i) {
	sample_label_map[sample_label] = i;
    });

    var gene_label_map = {};
    gene_list.map(function(gene, i) {
        gene_label_map[gene_list[i]] = i;
    });


    geneDataBundle.gene_data.map(function(doc) {
	var i = sample_label_map[doc.sample_label];
	var j = gene_label_map[doc.gene_label];
	console.log(doc.sample_label, doc.gene_label, i, j);
	var label = doc.sample_label;

	var text2 = doc.gene_label + " " + doc.mutation_type; 
	if (doc.chasm_driver_p_value)
	    text2 += "  chasm driver pval " + doc.chasm_driver_p_value.toPrecision(3);

	var text3 = doc.protein_change;
	if (doc.vest_pathogenicity_p_value)
	    text3 += " vest path pval " + doc.vest_pathogenicity_p_value.toPrecision(3);

	rect(i,j, doc.chasm_driver_p_value, label, text2, text3);
    });
}

