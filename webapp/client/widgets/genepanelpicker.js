function parseGeneSets(text) {
   try {
       var lines = text.split("\n").map(function(line) {return line.trim()}).filter(function(line) { return line.length > 0});
       var sets = lines.map(function(line) {
	   line = line.replace("#.*", "");
	   var match = line.match(/(.*):(.*)/);
	   if (match.length == 3) {
	       var name = match[1];
	       var features = match[2].split(",").map(function(feature) {return feature.trim()}).filter(function(feature) { return feature.length > 0});
	       if (name.length > 0 && features.length > 0)
		   return { name: name, feature_list: features};
	   }
	   return null;
       }).filter(function(element) { return element != null && element.name != "example"});
       console.log("parseGeneSets", text, sets);
       return sets;
   } catch(err) {
      return [];
  }
}

Template.GenePanelPicker.events({
    'click .OK' : function() {
	// var TheChart   = Template.currentData().theChart;
	var text = $(".genePanelText").val();
	var genePanel = parseGeneSets(text)
	UpdateCurrentChart("genePanel", genePanel);
	OverlayClose();
    }
    
});
