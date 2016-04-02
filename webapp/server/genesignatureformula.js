// process formula's like this

/* 
https://github.com/hacksparrow/safe-eval

Copyright (c) 2015 Hage Yaapa

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/

var vm = Npm.require("vm");

ProcessGeneSignatureFormula = function(chart) {
    var ST = Date.now();
    var lines = chart.geneSignatureFormula.split("\n").map(function(line) { return line.replace(/#.*/, "")})
	.filter(function(line) { return line.match(/=/)});


    var resultFields = lines.map(function(line) { return line.replace(/=.*/, "").trim() });
    var allGeneFields = lines.map(function(line) { return line.replace(/.*=/, "") })
	.join(" ")
	.match(/\w+/g)
	.filter(function(word) { return isNaN(word)});

    console.log("allGeneFields", allGeneFields);

    var program = lines.map(function(line) { 
        var lhs = line.replace(/=.*/, "");
	return "try {" + line + "} catch (err) {" + lhs + "='N/A'};" }).join("\n");
    console.log("program", program);
    var script = new vm.Script(program);




    var geneCache = {};
    Expression3.find({
	study_label: {$in: chart.studies},
	gene_label: {$in: allGeneFields}
    }).forEach(function(gene) {
       console.log("expression3", chart.studies, allGeneFields, gene.study_label, gene.gene_label);
       geneCache[gene.study_label + gene.gene_label] = gene;
    });

    var studiesCache = {};
    Collections.studies.find({ id: {$in: chart.studies} }).forEach(function(study) { studiesCache[study.id] = study; });

    var sandbox = {};

    chart.chartData.map(function(elem) {

        var study = studiesCache[elem.Study_ID];

	allGeneFields.map(function(gene_label) {
	    var study = studiesCache[elem.Study_ID];
	    var gene = geneCache[ elem.Study_ID + gene_label ];
	    var n = gene.rsem_quan_log2[study.gene_expression_index[ elem.Sample_ID]];
	    sandbox[gene_label] = n;
	});

	script.runInNewContext(sandbox);
	// console.log("after sandbox",sandbox, program);
	resultFields.map(function (field) {
	    elem[field] = sandbox[field];
	});
    });

    resultFields.map(function(field_label){
	chart.metadata[field_label] = {
	    collection: null,
	    crf: null, 
	    label: field_label,
	    type: "Number"
	};
    });
    chart.dataFieldNames = _.union(chart.dataFieldNames, resultFields);
    console.log("pgsf", Date.now() - ST);
}
