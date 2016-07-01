
BoxPlotCategorical = function(chartDocument, exclusions) {
    var value_color_scale = d3.scale.category10();

    var rows = chartDocument.pivotTableConfig.rows;
    var cols = chartDocument.pivotTableConfig.cols;
    if (rows == null) rows = [];
    if (cols == null) cols = [];

    if (cols.length == 0)
       throw new Error("Please select data elements by dragging from the left most box to the above box.");

    var analysis = analyze(chartDocument.chartData, rows.concat(cols));

    var rowCategoricalVariables = [];
    var colCategoricalVariables = cols.filter(function(field) { return analysis[field].allNumbers == false });

    var strata = {}
    var strataSampleSets = {}
    

    var rowValuePairs = [];
    rows.map(function(rowLabel) {
       var l = analysis[rowLabel].values.length;
       if (!analysis[rowLabel].isNumbers) {
	   if (l > 10)
	       throw new Error("Attribute "+rowLabel+ " has too many values (" +l + ") and would result in too complex a chart, please simplify");
	   rowValuePairs.push(analysis[rowLabel].values.map(function(rowValue){
	       return ({rowLabel: rowLabel, rowValue: rowValue});
	   }));
       }
    });


    var combos = cartesianProductOf(rowValuePairs);
    combos.map(function(pairList, c) {
        var text = pairList.map(function(pair) {return pair.rowLabel + ":" + pair.rowValue}).join(",");
	// console.log("c", c);
	rowCategoricalVariables.push(
	    { 
		text: text,
		color: value_color_scale(c),
		deciders: [ 
		    function(elem) { 
		    	for (var i = 0; i < pairList.length; i++)
			   if (elem[pairList[i].rowLabel] != pairList[i].rowValue)
			   	return false;
			return true;
		    }
		]
	    })

       var l = rowCategoricalVariables.length;
       if (l > 20)
	   throw new Error("Rows are too complex, please simplify");
    }) // map


    var numberVariables = [], columnCategoricalVariables = [];

    cols.map(function(label, nthColumn) {
        if (analysis[label].isNumbers)
            numberVariables.push( { label: label, decide: function(elem) { return !isNaN(elem[label]); } });
        else  {
	    var l = analysis[label].values.length ;
	    if (l > 10)
	        throw new Error("Attribute "+label+ " has too many values (" +l + ") and would result in too complex a chart, please simplify");

            columnCategoricalVariables.push(
                analysis[label].values
                .filter(function(value) { 
                    return !(label in exclusions && exclusions[label].indexOf(value) >= 0); })
                .map(
                  function (value) { 
                      return ({ label: label+":"+value, decide: function(elem) { 
			  return elem[label] == value; } });
                })
            );
	   var l = columnCategoricalVariables.length;
	   if (l > 20)
	       throw new Error("Columns are too complex, please simplify");
        }
    });
    if (numberVariables.length == 0)
	throw new Error("Boxplot needs at least one numeric data element. Please select one from at left and drag it to the column box above.");

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

        chartDocument.chartData.map(function(elem, e) {
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
                var phenotype = plotPredicates[0].label;
                var value = elem[phenotype];
                var f = parseFloat(value);
                var g = { 
                    Label: elem.__primaryKey ? elem.__primaryKey : elem.Gene, 
                    Study_ID: elem.Study_ID, 
                    ValueClass: "BoxPlotToolTipHover " + rowLabel,
                    ValueColor: value_color,
                    Phenotype: phenotype,
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

    rows = rows.join(",");
    cols = cols.join(",");

    return [plotDataSets, rows, cols, rowCategoricalVariables, strata, strataSampleSets];
}

