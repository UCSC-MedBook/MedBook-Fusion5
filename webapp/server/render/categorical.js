
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


BoxPlotChartData = function(pivotData, exclusions) {

    var h = pivotData.getRowKeys();
    var value_color_scale = d3.scale.category10();
    var rowCategoricalVariables = [];
    var strata = {}
    var strataSampleSets = {}
    

    h.map(function(k, i) {
        var rowLabel = k.join(",");
        rowCategoricalVariables.push({ text: rowLabel, color: value_color_scale(i),
            deciders: 
                k.map(function(kk) { 
                        var n = kk.lastIndexOf(":");

                        var label = kk.substr(0,n);
                        var value = kk.substr(n+1);
                        return function(elem) { return elem[label] == value; }
                    })
        })
    });
    rowCategoricalVariables.sort();

    var v = pivotData.colAttrs;
    var boxPlot = pivotData.input.boxplot;

    var numberVariables = [], columnCategoricalVariables = [];
    v.map(function(label, nthColumn) {
        if (boxPlot.colNumbers[nthColumn])
            numberVariables.push( { label: label, decide: function(elem) { return !isNaN(elem[label]); } });
        else  {
            columnCategoricalVariables.push(
                boxPlot.allColValues[nthColumn]
                .filter(function(value) { 
                    return !(label in exclusions && exclusions[label].indexOf(value) >= 0); })
                .map(
                  function (value) { 
                      return ({ label: label+":"+value, decide: function(elem) { return elem[label] == value; } });
                })
            );
        }
    });
    var allColumnVars = _.clone( columnCategoricalVariables );
    allColumnVars.splice(0 ,0, numberVariables)
    var plots = cartesianProductOf(allColumnVars);
    var plotDataSets = plots.map(function(plotPredicates) {
        var labels = _.pluck(plotPredicates, 'label');
        var columnLabel = labels.join(";")
        var labelForView = labels.join("\n").replace(/:/g, "\n");
        var points = [];
        var plot = [labelForView, points];

        pivotData.input.map(function(elem, e) {
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

