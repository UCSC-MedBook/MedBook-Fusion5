
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
	    // debugger;
	}
	dataTable.addColumn(type, field);
    })


    dataTable.addColumn({type: 'string', role: 'tooltip'});

    function columnCluster(columns, col) {
	columns.map(function(elem) {
	    var valid = true;
	    var row = cols.map(function(field) {
		value = elem[field];
		if (value == "N/A")
		    valid = false;
		return value;
	    });

	    var tooltip = String(row) + col;
	    tooltip = tooltip.replace(/"/g, "")
	    tooltip = tooltip.replace(/,/g, " ")
	    row.push(tooltip);
	    if (valid)
		dataTable.addRow(row);
	});
    }

    if (rows == null || rows.length == 0)
	columnCluster(chartDocument.chartData, "");
    else {
	var clusters = {};
	var blank = _.map(_.range(cols.length +1), function() {
	    return undefined;
	});

	chartDocument.chartData.map(function(elem) {
	    var key = JSON.stringify(_.pick(elem, rows)).replace(/[{}]/, "");
	    if (!(key in clusters)) clusters[key] = [];
	    clusters[key].push(elem);
	});
	Object.keys(clusters).sort().map(function(key, i) {
	    if (i > 0)
		dataTable.addRow(blank);
	    columnCluster(clusters[key], ','+key);
	});
    }


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
	}
    };


    setTimeout(function() {
	var googleChart = new google.visualization.ColumnChart(document.getElementById('GoogleChartTarget'));
	googleChart.draw(dataTable, options);
    }, 1000);

    return "<div id='GoogleChartTarget' class='ChartWrapper'   style='animation-duration: 3s; animation-name: slidein; animation-iteration-count: infinite;  width: \'100%\' height: \'100%\'' >Loading</div> "

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
