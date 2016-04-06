
d3_area = function(data, yAxisLabel, reviserCB) {

    var margin = {top: 20, right: 20, bottom: 30, left: 50},
	width = 960 - margin.left - margin.right,
	height = 500 - margin.top - margin.bottom;


    var x = d3.scale.linear()
	.range([0, width]);

    var y = d3.scale.linear()
	.range([height, 0]);

    var xAxis = d3.svg.axis()
	.scale(x)
	.orient("bottom");

    var yAxis = d3.svg.axis()
	.scale(y)
	.orient("left");

    var area = d3.svg.area()
	.x(function(d) { return x(d.index); })
	.y0(height)
	.y1(function(d) { return y(d.value) });

    var svg = d3.select(".genedisplay").append("svg")
	.attr("width", width + margin.left + margin.right)
	.attr("height", height + margin.top + margin.bottom)
      .append("g")
	.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    for (i = 0; i < data.length; i++)
       data[i].index = i;

    x.domain(d3.extent(data, function(d) { return d.index; }));
    y.domain([0, d3.max(data, function(d) { return d.value; })]);

    svg.append("path")
	.datum(data)
	.attr("class", "area")
	.attr("d", area);

    clipPath = svg.append("clipPath")
      .attr('id', function(d) { return "clip" })
      .append('rect')
        .attr("x",(width* 0.25))
        .attr("y", 0)
        .attr("width", width)
        .attr("height", 2*height);

    var xi = width * 0.25;
    var xx = parseInt(x.invert(xi));
    reviserCB(data[xx]);

    svg.append("path")
	.datum(data)
	.attr("clip-path", function(d) { return "url(#clip)"})
	.attr("class", "areaRed")
	.attr("d", area);


    svg.append("g")
	.attr("class", "x axis")
	.attr("transform", "translate(0," + height + ")")
	.call(xAxis);

    svg.append("g")
	.attr("class", "y axis")
	.call(yAxis)
      .append("text")
	.attr("transform", "rotate(-90)")
	.attr("y", 6)
	.attr("dy", ".71em")
	.style("text-anchor", "end")
	.text(yAxisLabel);


   // Define the line
   var valueline = d3.svg.line()
      .x(function(d) { return x(d.index); })
      .y(function(d) { return y(d.value); });
	    


    // var lineSvg = svg.append("g"); 

    var focus = svg.append("g").style("display", "none");

   /* Add the valueline path.
    lineSvg.append("path")
        .attr("class", "line")
        .attr("d", valueline(data));
   */

    // Add the X Axis
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    // Add the Y Axis
    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis);

   // append the x line
    focus.append("line")
        .attr("class", "x")
        .style("stroke", "blue")
        .style("stroke-dasharray", "3,3")
        .style("opacity", 0.5)
        .attr("y1", 0)
        .attr("y2", height);

    // append the y line
    focus.append("line")
        .attr("class", "y")
        .style("stroke", "blue")
        .style("stroke-dasharray", "3,3")
        .style("opacity", 0.5)
        .attr("x1", width)
        .attr("x2", width);

    // append the circle at the intersection
    focus.append("circle")
        .attr("class", "y")
        .style("fill", "none")
        .style("stroke", "blue")
        .attr("r", 4);

    // place the value at the intersection
    focus.append("text")
        .attr("class", "y1")
        .style("stroke", "white")
        .style("stroke-width", "3.5px")
        .style("opacity", 0.8)
        .attr("dx", 8)
        .attr("dy", "-.3em");
    focus.append("text")
        .attr("class", "y2")
        .attr("dx", 8)
        .attr("dy", "-.3em");

    // place the index at the intersection
    focus.append("text")
        .attr("class", "y3")
        .style("stroke", "white")
        .style("stroke-width", "3.5px")
        .style("opacity", 0.8)
        .attr("dx", 8)
        .attr("dy", "1em");
    focus.append("text")
        .attr("class", "y4")
        .attr("dx", 8)
        .attr("dy", "1em");
    
    // append the rectangle to capture mouse
    svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "none")
        .style("pointer-events", "all")
        .on("mouseover", function() { focus.style("display", null); })
        .on("mouseout", function() { focus.style("display", "none"); })
        .on("mousemove", mousemove);

    function mousemove() {
	var x0 = x.invert(d3.mouse(this)[0]);
	var i = parseInt(x0),
	    d0 = data[i - 1],
	    d1 = data[i], 
	    d;
	    if (d0 && d1)
		d = x0 - d0.index > d1.index - x0 ? d1 : d0;
	    else if (d0)
	       d = d0;
	    else if (d1)
	       d = d1;
	    else
	       return;
	       


	focus.select("circle.y")
	    .attr("transform",
		  "translate(" + x(d.index) + "," +
				 y(d.value) + ")");

	/*
	focus.select("text.y1")
	    .attr("transform",
		  "translate(" + x(d.index) + "," +
				 y(d.value) + ")")
	    .text(d.value);

	focus.select("text.y2")
	    .attr("transform",
		  "translate(" + x(d.index) + "," +
				 y(d.value) + ")")
	    .text(d.value);

	focus.select("text.y3")
	    .attr("transform",
		  "translate(" + x(d.index) + "," +
				 y(d.value) + ")")
	    .text(d.index + ":" + d.gene_label + " " + d.value);
	*/

	focus.select("text.y4")
	    .attr("transform",
		  "translate(" + x(d.index) + "," +
				 y(d.value) + ")")
	    .text(d.index + ":" + d.gene_label + " " + d.value);

	focus.select(".x")
	    .attr("transform",
		  "translate(" + x(d.index) + "," +
				 y(d.value) + ")")
		       .attr("y2", height - y(d.value));

	focus.select(".y")
	    .attr("transform",
		  "translate(" + width * -1 + "," +
				 y(d.value) + ")")
		       .attr("x2", width + width);
    }


    function click(){
      // Ignore the click event if it was suppressed
      if (d3.event.defaultPrevented) return;


      // Extract the click location\    
      var point = d3.mouse(this)
      , p = {x: point[0], y: point[1] };

      var x0 = x.invert(p.x);
      var i = parseInt(x0),
	  d0 = data[i - 1],
	  d1 = data[i],
	  d = x0 - d0.index > d1.index - x0 ? d1 : d0;

      reviserCB(d);

      clipPath.attr("x",p.x);
  }
  svg.on("click", click);
}

