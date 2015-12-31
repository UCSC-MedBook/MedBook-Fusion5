
  /*
  "Bar Chart": makeGoogleChart("ColumnChart"),
  "Stacked Bar Chart": makeGoogleChart("ColumnChart", { isStacked: true }),
  */
window.LEGEND_PROPORTION = 0.5;


GoogleChart = function(chartDocument, opts) {
    var agg, colKey, defaults, groupByTitle, h, hAxisTitle, k, numCharsInHAxis, options, result, row, rowKey, title, v, vAxisTitle, wrapper, _i, _j, _len, _len1;
    defaults = {
      localeStrings: {
	vs: "vs",
	by: "by"
      },
      selectionMode: 'multiple',
      tooltip: { trigger: 'selection' },
      aggregationTarget: 'auto',

    };
    opts = $.extend({}, defaults, opts);

    var dataTable = new google.visualization.DataTable();
    var fields = chartDocument.pivotTableConfig.rows.concat( chartDocument.pivotTableConfig.cols );

    fields.map(function(field)  {
	var type = "string";
	try {
	    type = chartDocument.metadata[field].type.toLowerCase();
	} catch (err) {
	   // why should metadata be missing anything? TBD
	}
	dataTable.addColumn(type, field);
    })
    chartDocument.chartData.map(function(elem) {
	 var row = fields.map(function(field) { return elem[field]; });
	 debugger;
	 dataTable.addRow(row);
    });

    title = vAxisTitle = ""; 
    hAxisTitle = chartDocument.pivotTableConfig.cols.join("-");
    if (hAxisTitle !== "") {
      title += " " + opts.localeStrings.vs + " " + hAxisTitle;
    }

    groupByTitle = chartDocument.pivotTableConfig.rows.join("-");
    if (groupByTitle !== "") {
      title += " " + opts.localeStrings.by + " " + groupByTitle;
    }

    document.title = title;
    var windowWidth = $(window).width() * 0.8;
    var chartWidth  = windowWidth * window.LEGEND_PROPORTION;
    var legendWidth = windowWidth * (1.0 - window.LEGEND_PROPORTION);

    options = {
      width: chartWidth + legendWidth,
      height: $(window).height() / 1.4,
      chartArea: {
	left: 120,
	width: chartWidth },
      legend: {width: legendWidth },

      title: title,
      
      hAxis: {
	title: hAxisTitle,
	slantedText: numCharsInHAxis > 50
      },
      vAxis: {
	title: vAxisTitle
      }
    };


    result = $("<div class='ChartWrapper' >").css({
      width: "100%",
      height: "100%"
    });
    wrapper = new google.visualization.ChartWrapper({
      dataTable: dataTable,
      chartType: "ColumnChart",
      options: options
    });
    result[0].wrapper = wrapper;

    wrapper.draw(result[0]);

    /*

    google.visualization.events.addListener(wrapper, 'ready', onReady);



    /*
    function editChart() {
      var editor;
      editor = new google.visualization.ChartEditor();
      google.visualization.events.addListener(editor, 'ready', function() {
	 $('.google-visualization-charteditor-dialog').width(1000).css({left:200})
      });
      google.visualization.events.addListener(editor, 'ok', function() {
	return editor.getChartWrapper().draw(result[0]);
      });


      return editor.openDialog(wrapper);
    };
    var editChartBtn = $('<button type="button" style="margin:10px;" class="btn btn-default">Edit Chart</button>').appendTo(result);
    editChartBtn.click(editChart);
    */

    return result.html();
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
