
cartesianProductOf = function(array) {
    return _.reduce(array, function(a, b) {
        return _.flatten(_.map(a, function(x) {
            return _.map(b, function(y) {
                return x.concat([y]);
            });
        }), true);
    }, [ [] ]);
};
// Meteor.subscribe("QuickR")


analyze = function(chartData, dataFieldNames) {
     var analysis = {};

     function and(a,b) { return a && b };
     function or(a,b) { return a || b };
     function xor(a,b) { return a || b };

     function allNumbers(values) {
         if (values.length == 0)
            return [];
         return values.map(function(v) { return v == "N/A" || !isNaN(v)} ).reduce(and);
     }
     function extract(key) {
         var v = unique(_.pluck(chartData, key)); // .filter(function(v) { return v != "N/A" }));
         return v;
     }
     function unique(values) {
         var m = {};
         for (var i = 0; i < values.length; i++)
             m[values[i]] = true;
         return Object.keys(m);
     }
     var analysis = {};
     dataFieldNames.map(function (field) {
	 var values = extract(field);
     	 analysis[field] = {
	     values : values,
	     isNumbers: allNumbers(values),
	 }
     });
     return analysis;
}


BoxPlotCategorical = function(pivotData, exclusions) {

    var value_color_scale = d3.scale.category10();

    var h = pivotData.pivotTableConfig.rows;
    var v = pivotData.pivotTableConfig.cols;
    var analysis = analyze(pivotData.chartData, h.concat(v));

    var rowCategoricalVariables = h.filter(function(field) { return analysis[field].allNumbers == false });
    var colCategoricalVariables = v.filter(function(field) { return analysis[field].allNumbers == false });

    var strata = {}
    var strataSampleSets = {}
    

    h.map(function(k, i) {
        var rowLabel = k.join(",");
        rowCategoricalVariables.push({ text: rowLabel, color: value_color_scale(i),
            deciders: 
                k.map(function(kk) { 
		       debugger;
                        var n = kk.lastIndexOf(":");
                        var label = kk.substr(0,n);
                        var value = kk.substr(n+1);
                        return function(elem) { return elem[label] == value; }
                    })
        })
    });
    rowCategoricalVariables.sort();



    var numberVariables = [], columnCategoricalVariables = [];

    v.map(function(label, nthColumn) {
        if (analysis[label].isNumbers)
            numberVariables.push( { label: label, decide: function(elem) { return !isNaN(elem[label]); } });
        else  {
            columnCategoricalVariables.push(
                analysis[label].values
                .filter(function(value) { 
                    return !(label in exclusions && exclusions[label].indexOf(value) >= 0); })
                .map(
                  function (value) { 
                      return ({ label: label+":"+value, decide: function(elem) { 
		          debugger;
			  return elem[label] == value; } });
                })
            );
        }
    });

    // preflight(input, {rows: rows, cols: cols});

    var allColumnVars = _.clone( columnCategoricalVariables );
    allColumnVars.splice(0 ,0, numberVariables)
    var plots = cartesianProductOf(allColumnVars);
    var plotDataSets = plots.map(function(plotPredicates) {
        var labels = _.pluck(plotPredicates, 'label');
        var columnLabel = labels.join(";")
        var labelForView = labels.join("\n").replace(/:/g, "\n");
        var points = [];
        var plot = [labelForView, points];

        pivotData.chartData.map(function(elem, e) {
            var good = true;
            for (var p = 0; good && p < plotPredicates.length; p++)
                if (!plotPredicates[p].decide(elem))
                    good = false;

            var rowLabel = null;
            var value_color = null;

            for (var p = 0; good && p < rowCategoricalVariables.length; p++) {
                var deciders = rowCategoricalVariables[p].deciders;
                var oneIsGood = false;
                for (var q = 0; good && q < deciders.length; q++) {
                    if (deciders[q](elem)) {
                        oneIsGood = true;
                    }
                }
                if (oneIsGood) {
                    rowLabel = rowCategoricalVariables[p].text;
                    value_color = rowCategoricalVariables[p].color;
                } 
            }

            if (good && (rowCategoricalVariables.length == 0 || value_color != null)) {
                var value = elem[plotPredicates[0].label];
                var f = parseFloat(value);
                var g = { 
                    Label: elem.Sample_ID ? elem.Sample_ID : elem.Gene, 
                    Study_ID: elem.Study_ID, 
                    ValueClass: rowLabel,
                    ValueColor: value_color,
                    Phenotype: rowLabel ? rowLabel+","+columnLabel : columnLabel,
                    Value: f,
                };
                var strataLabel = null;
                if (columnLabel && rowLabel)
                    strataLabel = columnLabel + ";" + rowLabel;
                else if (columnLabel)
                    strataLabel = columnLabel;
                else if (rowLabel)
                    strataLabel = rowLabel;

                if (strataLabel)  {
                    if (!(strataLabel in strata)) {
                        strata[strataLabel] = [];
                        strataSampleSets[strataLabel] = [];
                    }
                    strata[strataLabel].push(f);
                    strataSampleSets[strataLabel].push(g.Patient);
                }

                points.push(g);
            }
        });
        return plot;
    });
    h = h.join(",");
    v = v.join(",");
    return [plotDataSets, h, v, rowCategoricalVariables, strata, strataSampleSets];
}

