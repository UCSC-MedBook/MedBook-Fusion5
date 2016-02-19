
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

	svg = d3.select('#viz')
	    .append('svg')
	    .attr('width', width + margins.left + margins.right + legendPanel.width)
	    .attr('height', height + margins.top + margins.bottom),

	outerTableau = svg
	    .append('g')
	    .attr('transform', 'translate(' + margins.left + ',' + margins.top + ')')

	frontTableau = svg
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
	    .style('fill', 'yellow')
	    .on('click', function (d) { 
	    	Overlay("Report", function() {
		    return {data: JSON.stringify(d, null, 2)}
		});
	    })

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
	    patient.events.map(function(event, k) {
	        if (event.on == null || event.off == null || isNaN(event.on) || isNaN(event.off) || event.on < -2000)
		   return;
		patientG
		    .append("rect")
		    .attr("k", k)
		    .attr("class", "event")
		    .style('fill', function() { 
			if (!(event.description in eventColors))
			    eventColors[event.description] = colours(colorIndex++)
			return eventColors[event.description];
		    })
		    .attr('opacity', 0.8)
		    .attr('x', function() { 
		       if (isNaN(event.on))
		          debugger
		       var val =  xScale(event.on) + 2;
		       return val;
		    })
		    .attr('height', bandheight-4)
		    .attr('y', 2)
		    .attr('width', function() { 
			   if (event.off < -2000 || (event.on - event.off)  < 20)
			       return 20;
			   var x0 = xScale(event.on) + 2;
			   var x1 = xScale(event.off) - 2;
			   var width = x1 - x0;
			   if (width < 20) {
			       return 20;
			   }
			   return width;
			})

		    .on('mouseover', function (d) {

			tooltip.attr("opacity", 1.0)


			var xPos = d3.mouse(frontTableau[0][0])[0];
			var yPos = d3.mouse(frontTableau[0][0])[1] + 10;
			console.log("mouseover", xPos, yPos);
			var k = parseInt(d3.select(this).attr("k"));

			d3.select('#tooltip').attr('transform', 'translate(' + xPos + ',' + yPos + ')')

			var textwidth = 
			    Math.max(
				d3.select('#tooltip-text1').text(patient.Patient_ID)[0][0].getComputedTextLength(),
				d3.select('#tooltip-text2').text(event.description)[0][0].getComputedTextLength(),
				d3.select('#tooltip-text3').text(String(event.on + ", "+ event.off))[0][0].getComputedTextLength())

			d3.select('#tooltip-background').attr("width", textwidth + 20);

			// d3.select('#tooltip').classed('hidden', false)[0][0];
		    })
		    .on('mouseout', function () { tooltip.attr("opacity", 0.0); })

		});
	 });




	outerTableau.append('g')
	    .attr('class', 'elapsed_axis')
	    .attr('transform', 'translate(0,' + height + ')')
	    .call(xAxis);

	outerTableau.append('g')
	    .attr('class', 'elapsed_axis')
	    .call(yAxis);

	var tooltip = frontTableau.append('g')
	    .attr('id', 'tooltip')
	    .attr('opacity', 0.0)

	tooltip.append("rect")
	    .attr('id', 'tooltip-background')
	    .attr('stroke', 'blue')
	    .attr('stroke-width', 2)
	    .attr('fill', 'white')
	    .attr('x', 0)
	    .attr('y', 0)
	    .attr('width', "100px")
	    .attr('height', "80px")

	tooltip.append("text")
	    .attr('id', 'tooltip-text1')
	    .attr('x', 10)
	    .attr('y', 15)

	tooltip.append("text")
	    .attr('id', 'tooltip-text2')
	    .attr('x', 10)
	    .attr('y', 35)

	tooltip.append("text")
	    .attr('id', 'tooltip-text3')
	    .attr('x', 10)
	    .attr('y', 75)

	/* legend

	outerTableau.append('rect')
	    .attr('fill', 'yellow')
	    .attr('width', 160)
	    .attr('height', 30 * patients.length)
	    .attr('x', width + margins.left)
	    .attr('y', 0)

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
