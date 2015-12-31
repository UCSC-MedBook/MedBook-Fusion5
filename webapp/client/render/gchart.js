
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

    function columnCluster(columns) {
	columns.map(function(elem) {
	    var valid = true;
	    var row = cols.map(function(field) {
		value = elem[field];
		if (value == "N/A")
		    valid = false;
		return value;
	    });

	    row.push(String(row));
	    if (valid)
		dataTable.addRow(row);
	});
    }

    if (rows == null || rows.length == 0)
	columnCluster(chartDocument.chartData);
    else {
	var clusters = {};
	var blank = _.map(_.range(cols.length), function() {
	    return undefined;
	});

	chartDocument.chartData.map(function(elem) {
	    var key = JSON.stringify(_.pluck(elem, rows)).replace(/[{}]/, "");
	    if (!(key in clusters)) clusters[key] = [];
	    clusters[key].push(elem);
	});
	Object.keys(clusters).sort().map(function(key, i) {
	    if (i > 0)
		dataTable.addRow(blank);
	    columnCluster(clusters[key]);
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
    }, 300);

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

naturalSort =  function(as, bs) {
    var a, a1, b, b1, rd, rx, rz;
    rx = /(\d+)|(\D+)/g;
    rd = /\d/;
    rz = /^0/;
    if (typeof as === "number" || typeof bs === "number") {
      if (isNaN(as)) {
	return 1;
      }
      if (isNaN(bs)) {
	return -1;
      }
      return as - bs;
    }
    a = String(as).toLowerCase();
    b = String(bs).toLowerCase();
    if (a === b) {
      return 0;
    }
    if (!(rd.test(a) && rd.test(b))) {
      return (a > b ? 1 : -1);
    }
    a = a.match(rx);
    b = b.match(rx);
    while (a.length && b.length) {
      a1 = a.shift();
      b1 = b.shift();
      if (a1 !== b1) {
	if (rd.test(a1) && rd.test(b1)) {
	  return a1.replace(rz, ".0") - b1.replace(rz, ".0");
	} else {
	  return (a1 > b1 ? 1 : -1);
	}
      }
    }
    return a.length - b.length;
};
