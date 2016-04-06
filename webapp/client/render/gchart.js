
  /*
  "Bar Chart": makeGoogleChart("ColumnChart"),
  "Stacked Bar Chart": makeGoogleChart("ColumnChart", { isStacked: true }),
  */
window.LEGEND_PROPORTION = 0.5;

Meteor.startup(function() {
    // google.charts.load("43", { packages: ["bar"] });
})

function keyPicks(elem, picks) 
{
    var key = JSON.stringify(_.pick(elem, picks)).replace(/[{}"']/g, "");
    key = key.replace(/,/g, "\n");
    return key;
}




function clusterThis(data, picks) {
    var clusters = {};
    data.map(function(elem) {
	var key = keyPicks(elem, picks);
	if (!(key in clusters)) clusters[key] = [];
	clusters[key].push(elem);
    });
    var keys = Object.keys(clusters);
    var n = keys.length;
    var values = keys.map(function(key) { return clusters[key]});
    return { n: n, keys: keys, values: values};
}

GoogleChart = function(chartDocument, opts) {
    var cols = chartDocument.pivotTableConfig.cols;
    var rows = chartDocument.pivotTableConfig.rows;
    var chartData = chartDocument.chartData;
    var aa = analyze(chartData, cols);

    if (cols.length == 0)
	return "<div id='GoogleChartTarget' class='ChartWrapper'   style='  width: \'100%\' height: \'100%\'' > Drag data elements from the left to the box above. </div> "

    var performCount =  !_.any(aa, function(elem) { return elem.isNumbers; });

    if (performCount) {
	var clusters = clusterThis(chartData, cols.concat(rows));
	var chartData = clusters.values.map(function(cluster) { 
	    var representative = cluster[0];
	    representative.count = cluster.length;
	    return representative;
	});
	cols.push("count");

    } else { // push Sample_IDs
	if ( _.every(aa, function(elem) { return elem.isNumbers; })) {
	    cols.unshift("Sample_ID");
	}
    }


    var vAxisTitle;
    var defaults = {
	localeStrings: {
	    vs: "vs",
	    by: "by"
	},
	selectionMode: 'multiple',
	// tooltip: { trigger: 'selection' },
	aggregationTarget: 'auto',

    };
    opts = $.extend({}, defaults, opts);

    var dataTable = new google.visualization.DataTable();




    cols.map(function(field) {
	var type = "string";
	try {
	    type = chartDocument.metadata[field].type.toLowerCase();
	} catch (err) {
	    if (field == "count")
	       type = "number";
	}
	dataTable.addColumn(type, field);
    })

    var colors =  [
	"#3366CC",
	"#DC3912",
	"#FF9900",
	"#109618",
	"#990099",
	"#3B3EAC",
	"#0099C6",
	"#DD4477",
	"#66AA00",
	"#B82E2E",
	"#316395",
	"#994499",
	"#22AA99",
	"#AAAA11",
	"#6633CC",
	"#E67300",
	"#8B0707",
	"#329262",
	"#5574A6",
	"#3B3EAC"
    ];


    dataTable.addColumn({type: 'string', role: 'tooltip'});
    dataTable.addColumn({type: 'string', role: 'style'});

    var legend = '<svg><g>';

    var y = 0;
    function columnCluster(columns, label, clusterNumber) {
        legend += '<rect x="50" y="' + y + '" width="30" height="15" stroke="none" stroke-width="0" fill="' + colors[clusterNumber] + '"></rect>';
        legend += '<text text-anchor="start" x="87" y="'+ (y+12.75) + '" font-family="Arial" font-size="15" stroke="none" stroke-width="0" fill="#222222">'+label+'</text>';
	y += 20;
        
	columns.map(function(elem) {
	    var valid = true;
	    var row = cols.map(function(field) {
		value = elem[field];
		if (value == "N/A")
		    valid = false;
		return value;
	    });

	    var tooltip = keyPicks(elem, rows.concat(cols));
	    row.push(tooltip);
	    row.push(colors[clusterNumber]);
	    if (valid)
		dataTable.addRow(row);
	});
    }

    if (rows == null || rows.length == 0)
	columnCluster(chartData, "", 0);
    else {
	var blank = _.map(_.range(cols.length +2), function() {
	    return undefined;
	});

	var clusters = clusterThis(chartData, rows);

	function sortF(aa,bb) {
	    for (var i = 1; i < cols.length; i++) {
	       if (aa[cols[i]] < bb[cols[i]]) return -1
	       if (aa[cols[i]] > bb[cols[i]]) return 1
	    }
	    return 0;
	};

	for (var i = 0; i < clusters.n; i++) {
	    var key = clusters.keys[i];
	    var cluster = clusters.values[i];
	    // if (i > 0) dataTable.addRow(blank);

	    cluster = cluster.filter(function(elem) { // remove N/A
		for (var i = 1; i < cols.length; i++) {
		   if (elem[cols[i]] == "N/A") return false;
		}
		return true;
	    })
	    cluster.sort(sortF);
	    columnCluster(cluster, key, i);
	}
    }

    legend += '</g></svg>';
    setTimeout(function() {
        window.legend = legend;
	$('#legend').html(legend);
    }, 2000);

    var title = vAxisTitle = "";
    var hAxisTitle = chartDocument.pivotTableConfig.cols.join("-");
    if (hAxisTitle !== "") {
	title += " " + opts.localeStrings.vs + " " + hAxisTitle;
    }

    var groupByTitle = chartDocument.pivotTableConfig.rows.join("-");
    if (groupByTitle !== "") {
	title += " " + opts.localeStrings.by + " " + groupByTitle;
    }

    document.title = title;
    var windowWidth = $(window).width() * 0.8;
    var chartWidth = windowWidth * window.LEGEND_PROPORTION;
    var legendWidth = windowWidth * (1.0 - window.LEGEND_PROPORTION);
    var numCharsInHAxis = rows.reduce(function(n, e) { return n+e.length}, 0);

    var options = {
	// toolTip: { isHtml: true},
	tooltip: {
	    trigger: 'selection'
	},

	width: chartWidth + legendWidth,
	height: $(window).height() / 1.4,
	chartArea: {
	    left: 120,
	    width: chartWidth
	},
	legend: {
	    width: legendWidth
	},

	title: title,

	hAxis: {
	    title: hAxisTitle,
	    slantedText: numCharsInHAxis > 50
	},
	vAxis: {
	    title: vAxisTitle
	},

	legend : 'none'
    };

    options.hAxis.slantedText = true;
    options.hAxis.slantedTextAngle = 45;


    setTimeout(function() {
	var googleChart = new google.visualization.ColumnChart(document.getElementById('GoogleChartTarget'));
	googleChart.draw(dataTable, options);
    }, 1000);

    return "<div><div id='GoogleChartTarget' class='ChartWrapper'   style='animation-duration: 3s; animation-name: slidein; animation-iteration-count: infinite;  width: \'100%\' height: \'100%\'' >Loading</div><div id='legend'></div></div>";

    /*
     
     Out for the time being.




    function editChart() {
      var editor;
      editor = new google.visualization.ChartEditor();
      google.visualization.events.addListener(editor, 'ready', function() {
	 $('.google-visualization-charteditor-dialog').width(1000).css({left:200})
      });
      google.visualization.events.addListener(editor, 'ok', function() {
	return editor.getChartWrapper().draw(target[0]);
      });


      return editor.openDialog(wrapper);
    };
    var editChartBtn = $('<button type="button" style="margin:10px;" class="btn btn-default">Edit Chart</button>').appendTo(target);
    editChartBtn.click(editChart);
    */

};
