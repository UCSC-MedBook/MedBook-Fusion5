C3_Bar_Chart = function(window, pivotData, opts, exclusions) {
    debugger;

    console.log("before C3bind");
    d3bind(window);
    C3bind(window);
    console.log("after C3Bind");

    var wrapper = window.$("<div id='chart' >").css({ width: "800px", height: "600px" });

    debugger;

    var chart = window.c3.generate({
	bindto: wrapper[0],
	data: {
	    columns: [
		['data1', 300, 350, 300, 0, 0, 120],
		['data2', 130, 100, 140, 200, 150, 50]
	    ],
	    types: {
		data1: 'area-spline',
		data2: 'area-spline'
		// 'line', 'spline', 'step', 'area', 'area-step' are also available to stack
	    },
	    groups: [['data1', 'data2']]
	}
    });

    return wrapper;
} 


