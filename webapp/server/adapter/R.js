var fs = Npm.require('fs');
spawn = Npm.require('child_process').spawn;
Fiber = Npm.require('fibers');


function Viz(name, script) {

    return function(chartDocument, args, outfilename1, outfilename2, whendone) {
	var dirs = process.env.MEDBOOK_WORKSPACE + "bridge/" + chartDocument._id;
	fs.mkdirSync(dirs);

	var stdout = dirs +  "/stdout";
	var stderr = dirs +  "/stderr";
	var infilename1 = dirs +  "/input";
	outfilename1 = dirs +  "/" + outfilename1;

	if (outfilename2)
	    outfilename2 = dirs +  "/" + outfilename2;

	var fields = ["Patient_ID", "__primaryKey"].concat(chartDocument.pivotTableConfig.rows, chartDocument.pivotTableConfig.cols);

	var output = ConvertToTSV(chartDocument.chartData, fields);
	fs.writeFileSync(infilename1, output);

	var argArray = [process.env.MEDBOOK_SCRIPTS + script, chartDocument._id, args, infilename1, outfilename1, outfilename2  ];
	var shlurp = spawn("/usr/bin/Rscript", argArray, {
	    stdio: [
	      0, 
	      fs.openSync(stdout, 'w'),
	      fs.openSync(stderr, 'w')
	  ]
	});


	var cmd = "sh -c " +  argArray.join(" ");

	var start = new Date();
	console.log( "vis_r running ", cmd );
	shlurp.on('error', function(error) { console.log('vis_r FAIL:', error) });
	shlurp.on('close', function(return_code) {
	    var out = fs.readFileSync(stdout, 'utf8');
	    var err = fs.readFileSync(stderr, 'utf8');
	    var outfile1;
	    var outfile2;

	    try {outfile1 = fs.readFileSync(outfilename1, 'utf8'); } catch (err) {};
	    try {outfile2 = fs.readFileSync(outfilename2, 'utf8'); } catch (err) {};

	    Fiber(function() {
		console.log('vis_r', script, return_code, cmd, new Date() - start, outfile1 ? outfile1.length : null, outfile2 ? outfile2.len : null, out, err);
		if (whendone)
		    whendone(return_code, out, err, outfile1, outfile2);
	    }).run();  
	});
	return "bridge_r return";
    }
}



Meteor.startup(function() {

    var dir = process.env.MEDBOOK_SCRIPTS + "viz/"

    // function readDirUpdateDB() {
    // 	var data = fs.readdir(dir, function(err, data) {
    // 	    console.log(data);
    // 	});
    // }

    // readDirUpdateDB();
    // fs.watch(dir, readDirUpdateDB);

});
