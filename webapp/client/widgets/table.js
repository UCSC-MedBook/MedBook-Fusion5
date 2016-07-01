

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
        if ("__primaryKey" in elem)
            s.__primaryKey = elem.__primaryKey;
        keys.map(function(key) {  s[key] = elem[key]; });
        return s;
    });
}


window.makeReactiveTable = function(theChart, extraOptions) {

    var result = $("<div class='ChartWrapper' >").css({

      /*
      "min-width": "800px",
      "min-height": "600px"
      */
      width: "100%",
      height: "100%"
    });

    var data =  TableData(theChart, {});
    var html = Blaze.renderWithData(Template.Inspector, { data: data }, result[0]);
    // addMedBookButtons(result, null);

    return result.html();
}

hot = null;
hotSet = null;

window.makeHandsontable = function(theChart, extraOptions, length, column) {

    Meteor.subscribe("TheChartData", theChart._id);

    window.hotSet = function() {
        var fields = theChart.pivotTableConfig.rows.concat(theChart.pivotTableConfig.cols);
	var columns = fields.map(function(field, i) { return {data: field}});
	if (column)
	   columns.push(column);
	if (hot)
	   try { hot.destroy(); } catch (err) {};

	var cw = document.getElementById('ChartWrapper');
        if (cw == null || cw.length == 0)
            return;

	window.hot = new Handsontable(document.getElementById('ChartWrapper'), { 
	     minSpareRows: 1,
	     rowHeaders: true,
	     colHeaders: true,
	     contextMenu: true,
	     colHeaders: fields,
	     columns: columns,
	     data: theChart.chartData,
	     width:  "100%",
	     height: length == null ? "100%" : length,

             cells: function (row, col, prop) {

                  var src = this.instance.getSourceDataAtRow(row)
                  var className = "Row_Patient Row_Patient_ID_"  + src.Patient_ID;
		  if (src.__primaryKey)
		      className += " " + src.__primaryKey;

                  var cellProperties = {className: className};
 
                  // cellProperties.renderer = "negativeValueRenderer"; // uses lookup map
 
                  return cellProperties;
            }
 

	 });
    }

    setTimeout(function() { window.hotSet(1200, length == null ? 1200 : length); }, 250);
    return "<div id='ChartWrapper' style='min-width:800px;min-height:600px;'></div>"
}

