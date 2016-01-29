
window.makeD3Elapsed = function(theChart, opts) {
    var totalWidth = 2000;
    var totalHeight = 2000;
    

    theChart.chartData.sort(function(a,b) { return b.Days_on_Study - a.Days_on_Study; });

    var wrapper = "<div id='wrapper' style='width " + totalHeight + ";height:" + totalHeight + " ;'><div id='viz' style='margin-top:20p;'></div><div id='stat' class='stat' title='two-tail P-value' style='width:100%;height:50;'> </div> <div id='legend' class='legend' style='float:left;margin:50px;'> </div></div>"; 
    setTimeout(function() {
        $('#viz').empty();
        $('#stat').empty();
        $('#legend').empty();

    var margins = {
	top: 12,
	left: 148,
	right: 24,
	bottom: 24
    },
    legendPanel = {
	width: 180
    },
    width = totalWidth - margins.left - margins.right - legendPanel.width,
	height = totalHeight - margins.top - margins.bottom,
	patients = theChart.chartData,

	outerTableau = d3.select('#viz')
	    .append('svg')
	    .attr('width', width + margins.left + margins.right + legendPanel.width)
	    .attr('height', height + margins.top + margins.bottom)
	    .append('g')
	    .attr('transform', 'translate(' + margins.left + ',' + margins.top + ')');

	var xScale = d3.scale.linear()
	    .domain([theChart.elapsed.min, theChart.elapsed.max])
	    .range([margins.left, width - margins.right]),

	patient_IDs = patients.map(function (d) { return d.y; }),

	yScale = d3.scale.ordinal()
	    .domain(patient_IDs)
	    .rangeRoundBands([0, height], .1),
	xAxis = d3.svg.axis()
	    .scale(xScale)
	    .orient('bottom'),
	yAxis = d3.svg.axis()
	    .scale(yScale)
	    .orient('left'),
	colours = d3.scale.category20();

	var bandheight =  10;
	var bandgap =  2;
	var maxHeight =  0;


	var gs = outerTableau.selectAll("rect")
	    .data(patients)
	    .enter()
	    .append('g')
	    .attr('transform', function (d, i) {
		return 'translate(0,' + String(i*(bandheight + bandgap)) + ')';
	    })
	    .attr("class", function(d) { return d.Patient_ID + " patient"; })

	gs
	    .append('rect')
	    .attr('x', function (d) { return xScale(d.min); })
	    .attr('y', function (d, i) { return 0; })
	    .attr('height', function (d) { return bandheight; })
	    .attr('width', function (d) { 
		var x0 = xScale(d.min);
		var x1 = xScale(d.max);
		return x1 - x0;
	     })
	    .attr("class", "epoch")
	    .style('fill', 'yellow');

 	gs.append("line")
	 .attr("x1", xScale(0))
	 .attr("y1", 0)
	 .attr("x2", xScale(0))
	 .attr("y2", height)
	 .attr("stroke-width", 2)
	 .attr("stroke", "black")

	// svg.selectAll("g")
	gs
	    .append('text')
	      .attr("x", -100)
	      .attr("y", bandheight*0.8)
	      .attr("font-family",  "sans-serif")
	      .attr("font-size", "9px")
	      .attr("fill", "black")
	      .text(function(d) { return d.Patient_ID; });


	 var eventColors = {};
	 var colorIndex =  0;


	 patients.map(function(patient) {
	    var patientG = d3.select("." + patient.Patient_ID);
	    patient.events.map(function(event, i) {
		patientG
		    .append("rect")
		    .attr("class", "event")
		    .style('fill', function() { 
			if (!(event.description in eventColors))
			    eventColors[event.description] = colours(colorIndex++)
			return eventColors[event.description];
		    })
		    .attr('x', function() { 
		       if (isNaN(event.on))
		          debugger
		       var val =  xScale(event.on) + 2;
		       return val;
		    })
		    .attr('height', bandheight-4)
		    .attr('y', 2)
		    .attr('width', function() { 
			   if (isNaN(event.on) || isNaN(event.off))
			      debugger
			   var x0 = xScale(event.on) + 2;
			   var x1 = xScale(event.off) + 2;
			   return x1 - x0;
			})

		    .on('mouseover', function (d) {
			var xPos = parseFloat(d3.select(this).attr('x')) / 2 + width / 2;
			var yPos = parseFloat(d3.select(this).attr('y')) + bandheight / 2;
			console.log("mouseover", xPos, yPos);

			d3.select('#elapsed_tooltip')
			    .attr("x", xPos)
			    .attr("y", yPos)
			    .text(patient.Patient_ID);

			// d3.select('#elapsed_tooltip').classed('hidden', false);
		    })
		    // .on('mouseout', function () { d3.select('#elapsed_tooltip').classed('hidden', true); })

		});
	 });




	outerTableau.append('g')
	    .attr('class', 'elapsed_axis')
	    .attr('transform', 'translate(0,' + height + ')')
	    .call(xAxis);

	outerTableau.append('g')
	    .attr('class', 'elapsed_axis')
	    .call(yAxis);

	/*
	outerTableau.append('rect')
	    .attr('id', 'elapsed_tooltip')
	    .attr('fill', 'blue')
	    .attr('width', 1200)
	    .attr('height', 1200)
	    .attr('x', 0)
	    .attr('y', 0)

	/* legend

	outerTableau.append('rect')
	    .attr('fill', 'yellow')
	    .attr('width', 160)
	    .attr('height', 30 * patients.length)
	    .attr('x', width + margins.left)
	    .attr('y', 0);

	series.forEach(function (s, i) {
	    outerTableau.append('text')
		.attr('fill', 'black')
		.attr('x', width + margins.left + 8)
		.attr('y', i * 24 + 24)
		.text(s);
	    outerTableau.append('rect')
		.attr('fill', colours(i))
		.attr('width', 60)
		.attr('height', 20)
		.attr('x', width + margins.left + 90)
		.attr('y', i * 24 + 6);
	});

	*/
    }, 250);
    return wrapper;
} // makeD3Elapsed()
