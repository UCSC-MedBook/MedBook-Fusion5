
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
         return Object.keys(m).sort();
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

