var ChartHeightMax = 2048;
var ChartWidthMax = 2048;
var PlotHeight = 500;

var plotWidth, width,height;
var margin = {top: 50, right: 00, bottom: 40, left: 10, leftMost: 10};


Contingency = function(window, chart, opts, exclusions) {
    Categorical(chart, exclusions);
    return "makeHandsontable";
}


// Create the raw data for the contingy table and set it in the Chart object
function Categorical(chart, exclusions) {
   var categories = {};
   var categoriesValues = {};
   var valueSets = [];
   var valueMap = {}

   chart.selectedFieldNames.map(function(field) {
       var values = {};
       chart.chartData.map(function(datum, i) {
            var value = datum[field];
	    var key = field + ":" + value;
	    values[key] = true;
	    if (!(key in categories)) categories[key] = [];

	    categories[key].push(i);
       });
       values = Object.keys(values);

       /*
       if (values.length > 20)
          throw new Error("Diagram is too complex: Field " +  field + 
	      " has too many values" + values.legnth + 
	      "(20 max) please simplify by choosing different fields"); 
       */

       valueMap[field] = values;
       valueSets.push(values);
   });

   cartesianProductOf(valueSets).map(function(intersectKeys) {
       var categoryLists = intersectKeys.map(function(c) { return categories[c]; });
       var compoundKey = intersectKeys.sort().join(";");
       categories[compoundKey] = _.intersection.apply(null, categoryLists);
   });

   // Update the chart object
   Charts.direct.update(chart._id, {$set: {valueMap: valueMap, categories: categories}});
}

