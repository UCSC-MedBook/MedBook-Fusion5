Template.GeneSignatureFormula.events({
    'click .OK' : function() {
	var geneSignatureFormula = $(".genePanelText").val();
	UpdateCurrentChart("geneSignatureFormula", geneSignatureFormula);
	OverlayClose();
    }
    
});
