// process formula's like this

var fs = Npm.require('fs')

function signature_compare(chartDocument, sample_gene_labels, sig_gene_labels,  gene_sandbox, signature_sandbox, method, whendone) {
    var dirs = process.env.MEDBOOK_WORKSPACE + "bridge/signture/" + chartDocument._id;
    fs.mkdirSync(dirs);

    var stdout = dirs +  "/stdout";
    var stderr = dirs +  "/stderr";

    var sigs = dirs +  "/sigs";
    var cmdf = dirs +  "/cmd";
    var genes = dirs +  "/genes";
    var script = "signature_compare.r";

    fs.writeFileSync(genes, ConvertToTSV(gene_sandbox, sample_gene_labels));
    fs.writeFileSync(sigs,  ConvertToTSV(signature_sandbox, sig_gene_labels));

    var argArray = [process.env.MEDBOOK_SCRIPTS + script, sigs, genes, method];
    var shlurp = spawn("/usr/bin/Rscript", argArray, {
	stdio: [
	  0, 
	  fs.openSync(stdout, 'w'),
	  fs.openSync(stderr, 'w')
      ]
    });

    var cmd = "sh -c " +  argArray.join(" ");
    fs.writeFileSync(cmdf,  cmd);

    var start = new Date();
    console.log( "signature_compare running ", cmd );
    shlurp.on('error', function(error) { console.log('vis_r FAIL:', error) });
    shlurp.on('close', function(return_code) {
	var out = fs.readFileSync(stdout, 'utf8');
	var err = fs.readFileSync(stderr, 'utf8');
	if (err && err.length < 5)
	   err = null;

	Fiber(function() {
	    var results = null;
	    console.log('signature_compare', return_code, cmd, new Date() - start, err);
	    if (out && out.length > 2) {
	        var lines = out.split("\n");
		header = lines[0].split("\t")
		results = lines.slice(1).map(function(line) {
		     line = line.split("\t");
		     var elem = { sample_label: line[0] };
		     for (var i = 1; i <  header.length; i++)
		          elem[header[i]] = line[i];
		     return elem;
		});
	    }
	    if (whendone)
		whendone(results, err);
	}).run();  
    });
    return "bridge_r return";
}



// Meteor.startup(function() {

//     var dir = process.env.MEDBOOK_SCRIPTS + "viz/"

//     function readDirUpdateDB() {
// 	var data = fs.readdir(dir, function(err, data) {
// 	    console.log(data);
// 	});
//     }

//     readDirUpdateDB();
//     fs.watch(dir, readDirUpdateDB);

// });

ProcessGeneSignatureFormula = function(chart) {
    if (unchanged(chart, ["gene_signatures","samplelist"]))
       return;
    change(chart, ["chartData", "metadata"]);


    if (chart.gene_signatures == null)
       return

    var ST = Date.now();

    var sig_data = chart.gene_signatures.slice(1);
    var sig_indices = [];
    var sig_labels = ["gene_label"];

    chart.gene_signatures[0].map(function(score_label, i) { 
	if (i > 0 && score_label.match(/[A-Za-z]/)) {
	    score_label = score_label.replace(/[\.-]/g, "_").trim();
	    sig_labels.push(score_label);
	    sig_indices.push(i);
	}
    });

    var sig_sandbox = [];
    var gene_labels = [];
    sig_data.map(function(row) {
	 var gene_label = row[0];
	 if (gene_label && gene_label.length > 0) {
	     gene_label = gene_label.trim();
	     var box = { "gene_label": gene_label};
	     sig_indices.map(function(i) {
	         box[sig_labels[i]] = row[i]; 
	     })
	     sig_sandbox.push(box);
	     gene_labels.push(gene_label);
	 }
    });


    var geneCache = {};
    var q = {
	data_set_label: {$in: chart.data_sets},
	gene_label: {$in: gene_labels}
    } 
    GeneExpression.find(q).forEach(function(gene) {
       geneCache[gene.data_set_label + gene.gene_label] = gene;
    });



    var data_setsCache = {};
    var sample_labels = [];
    Collections.data_sets.find({ _id: {$in: chart.data_sets} }).forEach(function(data_set) { 
	data_setsCache[data_set._id] = data_set;
	sample_labels = _.union(sample_labels, data_set.sample_labels);
    });
    if (chart.samplelist && chart.samplelist.length > 0)
	sample_labels = _.intersection(sample_labels, chart.samplelist);
        

    // make a sandbox to play in
    gene_sandbox = [];

    gene_labels.map(function(gene_label) {
	var sandbox = {gene_label: gene_label};
	chart.chartData.map(function(elem) {
	    // Tricky join.
	    var data_set = data_setsCache[elem.data_set_id];
	    var gene = geneCache[ elem.data_set_id + gene_label ]; 
	    var n = gene ?  gene.rsem_quan_log2[data_set.gene_expression_index[ elem.sample_label]] : "NA"
	    if (n == null) 
	    	n = "NA";
	    sandbox[elem.sample_label] = n;
	});
	gene_sandbox.push(sandbox);
    });

    var sample_gene_labels = [ "gene_label"].concat(sample_labels);
    var sig_gene_labels =  sig_labels;

    signature_compare(chart, sample_gene_labels, sig_gene_labels, gene_sandbox, sig_sandbox, "dot",
	function whenDone(scores, err) {
	    if (err != null && err.length > 2) {
		 debugger
		 var html = "<B><font color='red'>" + String(err) + "</font><B>";
		 console.log("signature_compare", err);
		 Charts.direct.update({_id: chart._id}, {$set: {html: html}});
		 return;
	    }

	    if (scores == null) {
		 var html = "<B><font color='red'>Scores is null</font><B>";
		 Charts.direct.update({_id: chart._id}, {$set: {html: html}});
		 return;
	    }

	    var score_map = {};
	    scores.map(function(score) { score_map[score.sample_label] = score; });

	    chart.chartData.map(function(elem) {
		var score = score_map[elem.sample_label];
		if (score)
		   Object.keys(score).map(function(score_label) {
		       elem[score_label] = Number(score[score_label]);
		   });
	    });

	    sig_labels.map(function(sig_label, j){
		if  (j > 0) {
		    chart.metadata[sig_label] = {
			collection: null,
			crf: null, 
			label: sig_label,
			type: "Number"
		    };
		    chart.dataFieldNames = _.union(chart.dataFieldNames, sig_label);
		}
	    });

	    Charts.update({_id: chart._id}, {$set: 
                {
                    chartData: chart.chartData,
                    dataFieldNames: chart.dataFieldNames,
                    metadata: chart.metadata,
                }
            });

	} // whenDone
    );
}

