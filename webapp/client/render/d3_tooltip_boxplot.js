var SuppressRollover = false;
var highlightedSample = null;
var toolTip = null;
var Count = 0;

d3_tooltip_boxplot = function () {

    d3.select(".tooltip").remove();

    var toolTip = d3.select("body").append("div")   
          .attr("class", "tooltip")               
          .style("opacity", 0);

    window.clearToolTip = function() {
      toolTip.style("opacity", 0);   
    };

    function bye(d) {
      if (--Count <=  0) {

	if (highlightedSample == d)
	    toolTip.transition()        
		.duration(500)      
		.style("opacity", 0);   

	d3.selectAll(".highlight").classed("highlight", false);
      }
    };



    $(".BoxPlotToolTipHover")
    .on("mouseover", function(event) {
	
	if (SuppressRollover)
	   return;

	var d = event.target;
	if (Count == null)
	  Count = 1;
	else
	  Count++
	toolTip.transition()        
	    .duration(200)      
	    .style("display", "block")
	    .style("opacity", .9);      

	highlightedSample = d;
	var dd = d3.select(d);
	var label = dd.attr("text");
	var text2 = dd.attr("text2");
	var text3 = dd.attr("text3");
	var href = '/wb/patient/' + label;

	var study = dd.attr("class").split(" ").filter(function(c){ return c.indexOf("Study_ID") >= 0;})
	if (study && study.length > 0)
	    href +=  '?Study_ID=' + study[0];

	var m = "<a style='text-decoration: underline;' href='" + href + "'>" + label + "</a><br>" + text2 + "<br>" + text3;
	toolTip.html(m)
	    .style("left", (event.pageX + 15) + "px")     
	    .style("top", (event.pageY - 28) + "px");    

	d3.selectAll(".highlight").classed("highlight", false);
	d3.selectAll("circle[text='" + label + "']").classed("highlight", true);

	$(".tooltip").hover(function() { 
	    Count++;
	    console.log("hover count", Count);
	}, function() { bye(d)});

	})                  
    .on("mouseout", function(event) {       
	if (SuppressRollover)
	   return;
	setTimeout(function() {bye(event.target)}, 1000);
    })
}

Toggle = function(event) {
    var klass = $(event.target).data("klass");
    $("."+klass).toggle();
}
