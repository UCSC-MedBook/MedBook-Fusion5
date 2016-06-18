fss = Meteor.npmRequire('fs-extra');
var fs = fss;
spawn = Npm.require('child_process').spawn;
Fiber = Npm.require('fibers');

function WrapScript(name, script) {

    return function(window, chartDocument) {
	var cwd = process.env.MEDBOOK_WORKSPACE + "bridge/" + chartDocument._id + "/";
	fs.mkdirsSync(cwd);

	var stdout =  "stdout";
	var stderr =   "stderr";
	var infilename1 =   "input";
	var outfilename1 =   "plot.svg";
	var outfilename2 =   "stats";

	var fields = ["Patient_ID", "Sample_ID"].concat(chartDocument.pivotTableConfig.rows, chartDocument.pivotTableConfig.cols);
	var fields = chartDocument.pivotTableConfig.rows.concat( chartDocument.pivotTableConfig.cols);
	if (fields[0] != "Sample_ID")
	    fields.unshift("Sample_ID");
	var output = ConvertToTSV(chartDocument.chartData, fields);
	fs.writeFileSync(cwd + infilename1, output);

	var args = [ chartDocument._id, infilename1, outfilename1, outfilename2  ];
	var cmd =[ script, chartDocument._id, infilename1, outfilename1, outfilename2  ].join(" ");
	fs.writeFileSync(cwd + "cmd", cmd);
	cmd = "'" + cmd + "'";


	var shlurp = spawn(script, args,
	{
	    cwd: cwd,
	    stdio: [
	      0, 
	      fs.openSync(cwd + stdout, 'w'),
	      fs.openSync(cwd + stderr, 'w')
	  ]
	});

	var html = "<div class='selectable loading'><div>CWD:<code>" + cwd + "</code></div><div>CMD:<code>" + cmd + "</code></div>";


	var start = new Date();
	console.log( "WrapScript running ", cmd );
	shlurp.on('error', function(error) { console.log('vis_r FAIL:', error) });
	shlurp.on('close', function(exit_code) {
	    var out = fs.readFileSync(cwd + stdout, 'utf8');
	    var err = fs.readFileSync(cwd + stderr, 'utf8');
	    var outfile1 = "";
	    var outfile2 = "";

	    try {outfile1 = fs.readFileSync(cwd + outfilename1, 'utf8'); } catch (err) {};
	    try {outfile2 = fs.readFileSync(cwd + outfilename2, 'utf8'); } catch (err) {};

	    Fiber(function() {
		console.log('Script', script, exit_code, cmd, new Date() - start, outfile1 ? outfile1.length : null, outfile2 ? outfile2.len : null, out, "err", err);
		/*
		if (whendone)
		    whendone(exit_code, out, err, outfile1, outfile2);
		*/

	    var figure = "<div class='selectable'><div>" + outfile1 + "</div>";
	    
	    var info = "<div>CWD:<code>" + cwd + "</code></div><div>CMD:<code>" + cmd + "</code></div>" 
	    + "<div>EXIT CODE:<code>" + exit_code + "</code></div>"
	    + "<div>STDOUT:<code>" + out + "</code></div>"
	    + "<div>STDERR:<code>" + err + "</code></div></div>";

	    var hideinfo = '<summary>'+outfile2+'<details>'
	    + info
	    + '</details> </summary>';

	    var html =  "<div class='script_panel'><div class='script_panel'>" 
		+ figure + 
	    "</div><div class='script_panel'>"
		+  hideinfo + 
	    "</div></div>";

	    // console.log("wrapScript", script, html);
	    var ret = Charts.direct.update({_id: chartDocument._id}, {$set: {html: html}});

	    }).run();  
	});
	return html;
    }
}


Meteor.startup(function() {

    var dir = "/scripts/viz/"

    function readDirUpdateDB() {
	var data = fs.readdir(dir, function(err, data) {
	    data.map(function(filename) {
		var niceName = filename.replace(/_/g, " ");
		ChartTypeMap[niceName] = { type: 2, func: WrapScript(niceName, dir + filename)};
	    });
	    Fiber(SyncChartTypesWithFusionFeaturesDB).run();
	});
    }
    readDirUpdateDB();
    fs.watch(dir, readDirUpdateDB);
});
