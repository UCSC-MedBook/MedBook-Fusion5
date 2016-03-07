

function TableData(theChart, exclusions) {

    var xk = Object.keys(exclusions);
    var data = theChart.chartData.filter(function(elem) {
        for (var i = 0; i < xk.length; i++) {
            var k = xk[i];
            var v = exclusions[k];
            if (v.indexOf(String(elem[k])) >= 0)
                return false;
        }
        return true;
    });
    Session.set("ChartDataFinal", data);

    var keys = theChart.pivotTableConfig.cols.concat(theChart.pivotTableConfig.rows);

    return data.map(function(elem) { 
        var s =  { } ;
        s.Patient_ID = elem.Patient_ID;
        if ("Sample_ID" in elem)
            s.Sample_ID = elem.Sample_ID;
        keys.map(function(key) {  s[key] = elem[key]; });
        return s;
    });
}


window.makeReactiveTable = function(theChart, extraOptions) {

    var result = $("<div class='ChartWrapper' >").css({
      "min-width": "800px",
      "min-height": "600px"
    });

    var data =  TableData(theChart, {});
    var html = Blaze.renderWithData(Template.Inspector, { data: data }, result[0]);
    // addMedBookButtons(result, null);

    return result.html();
}

hot = null;

window.makeHandsontable = function(theChart, extraOptions) {

    setTimeout(function() {
        var fields = theChart.pivotTableConfig.rows.concat(theChart.pivotTableConfig.cols);
	var columns = fields.map(function(field, i) { return {data: field}});
	if (hot)
	   try { hot.destroy(); } catch (err) {};


	hot = new Handsontable(document.getElementById('ChartWrapper'), { 
	     minSpareRows: 1,
	     rowHeaders: true,
	     colHeaders: true,
	     contextMenu: true,
	     colHeaders: fields,
	     columns: columns,
	     data: theChart.chartData,
	     height: 1200

	});
	Meteor.subscribe("TheChartData", theChart._id);
	Tracker.autorun(function() {
	    var tc = Charts.findOne({_id: theChart._id}, {fields: {chartData: 1}});
	    console.log("tc.chartData.length", tc.chartData.length);
	});
    }, 250);
    return "<div id='ChartWrapper' style='min-width:800px;min-height:600px;'></div>"
}

