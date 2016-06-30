console.log("Before HTTP Methods");
HTTP.methods({

    genes: function(){
        var items = [];
        var seen = {}
        GeneExpression.find( {gene_label: {$regex: "^"+ this.query.q + ".*" }}, { sort: {gene_label:1 }, fields: {"gene_label":1 }}).
            forEach(function(f) {
                if (!(f.gene_label in seen)) {
                    items.push({id: f.gene_label, text: f.gene_label});
                    seen[f.gene_label] = 1;
                }
            });
        items = _.unique(items);
        this.setContentType("application/javascript");
        return JSON.stringify({
            items:items
        });
    },
    geneListPrecise: function(){
	var genelist = this.query.q.split(/[, ;]/).filter(function(s) { return s && s.length > 1});
        var items = [];
        var seen = {}
        GeneExpression.find( {gene_label: {$in: genelist }}, { sort: {gene_label:1 }, fields: {"gene_label":1 }}).
            forEach(function(f) {
                if (!(f.gene_label in seen)) {
                    items.push({id: f.gene_label, text: f.gene_label});
                    seen[f.gene_label] = 1;
                }
            });
        items = _.unique(items);
        this.setContentType("application/javascript");
        return JSON.stringify({
            items:items
        });
    },

    quick: function(data){
        console.log("IN HTTP Method quick");

        var items = [];
        var term = this.query.q;
        var collection = this.query.c;
        var fieldName = this.query.f;
        var fields = {};
        fields[fieldName] = 1;

        GeneSets.find( {name: {$regex: "^"+ term + ".*" }}, { sort: fields, fields: fields}).
            forEach(function(f) {
                items.push({id: f._id, text: f[fieldName]});
            });
        this.setContentType("application/javascript");

        return JSON.stringify({
            items:items
        });
    },
});
console.log("After HTTP Methods");
