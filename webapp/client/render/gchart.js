
  /*
  "Bar Chart": makeGoogleChart("ColumnChart"),
  "Stacked Bar Chart": makeGoogleChart("ColumnChart", { isStacked: true }),
  */
window.LEGEND_PROPORTION = 0.5;

Meteor.startup(function() {
    // google.charts.load("43", { packages: ["bar"] });
})

GoogleChart = function(chartDocument, opts) {
    var cols = chartDocument.pivotTableConfig.cols;
    var rows = chartDocument.pivotTableConfig.rows;
    var aa = analyze(chartDocument.chartData, cols);

    if (cols.length == 0 || !_.any(aa, function(elem) { return elem.isNumbers; }))
	return "<div id='GoogleChartTarget' class='ChartWrapper'   style='  width: \'100%\' height: \'100%\'' >Need at least one numerical value for Bar Charts. <br> Drag data elements from the left to the box above. </div> "

    if ( _.every(aa, function(elem) { return elem.isNumbers; })) {
        cols.unshift("Sample_ID");
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
	    // HACK: why should metadata be missing anything? TBD
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
        legend += '<rect x="10" y="' + y + '" width="30" height="15" stroke="none" stroke-width="0" fill="' + colors[clusterNumber] + '"></rect>';
        legend += '<text text-anchor="start" x="47" y="'+ (y+12.75) + '" font-family="Arial" font-size="15" stroke="none" stroke-width="0" fill="#222222">'+label+'</text>';
	y += 20;
        
	columns.map(function(elem) {
	    var valid = true;
	    var row = cols.map(function(field) {
		value = elem[field];
		if (value == "N/A")
		    valid = false;
		return value;
	    });

	    var tooltip = String(row) + label;
	    tooltip = tooltip.replace(/"/g, "")
	    tooltip = tooltip.replace(/,/g, " ")
	    row.push(tooltip);
	    row.push(colors[clusterNumber]);
	    if (valid)
		dataTable.addRow(row);
	});
    }

    if (rows == null || rows.length == 0)
	columnCluster(chartDocument.chartData, "", 0);
    else {
	var clusters = {};
	var blank = _.map(_.range(cols.length +2), function() {
	    return undefined;
	});

	chartDocument.chartData.map(function(elem) {
	    var key = JSON.stringify(_.pick(elem, rows)).replace(/[,{}"']/g, "");
	    if (!(key in clusters)) clusters[key] = [];
	    clusters[key].push(elem);
	});
	Object.keys(clusters).sort().map(function(key, i) {
	    if (i > 0)
		dataTable.addRow(blank);
	    columnCluster(clusters[key], key, i);
	});
    }

    legend += '</g></svg>';
    setTimeout(function() {
        window.legend = legend;
	$('#legend').html(legend);
    }, 3000);

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
