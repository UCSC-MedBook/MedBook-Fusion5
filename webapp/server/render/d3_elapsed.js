
makeD3Elapsed = function(window, chartDocument) {
    var patients = {};
    var now = new Date();
    var milliSecondsPerDay = 24*60*60*1000;

    aggregated = [];

    chartDocument.chartData.map(function(ci) {
    	if (ci.On_Study_Date == "N/A") ci.On_Study_Date = null;
    	if (ci.On_Study_Date == null) return; // skip this record

    	if (ci.Off_Study_Date == "N/A") ci.Off_Study_Date = null;

	if (!(ci.Patient_ID in patients)) {
	    var on = ci.On_Study_Date;
	    var off = ci.Off_Study_Date ? ci.Off_Study_Date : now;
	    var total = parseInt((off - on) / milliSecondsPerDay);
	    var patient = {
	        Patient_ID: ci.Patient_ID,
		On_Study_Date:  on,
		Off_Study_Date: off,
		min: 0,
		max: 0,
		Days_on_Study: total,
		events: []
	    };
	    patients[ci.Patient_ID] = patient;
	    aggregated.push(patient);
	 } else /* seen already */ {

	    if (patients[ci.Patient_ID].On_Study_Date == null  &&  ci.On_Study_Date != null)
		patients[ci.Patient_ID].On_Study_Date = ci.On_Study_Date;

	    else if ((patients[ci.Patient_ID].On_Study_Date != null) &&  ci.On_Study_Date == null)
	       ; // don't care

	    else if (patients[ci.Patient_ID].On_Study_Date != ci.On_Study_Date) {
	       console.log("patients[ci.Patient_ID=", ci.Patient_ID, "].On_Study_Date", patients[ci.Patient_ID].On_Study_Date, ci.On_Study_Date);
	       throw new Error("patients[ci.Patient_ID=", ci.Patient_ID, "].On_Study_Date", patients[ci.Patient_ID].On_Study_Date, ci.On_Study_Date);

	    } else // both null
	       ; // don't care

	 } //else seen already
    });

    var max = 0;  // should this be MININT
    var min = 0;  // should this be MAXINT

    function aggregate(crf) {
	Collections.CRFs.find({CRF: crf, Study_ID: "prad_wcdt"}, {sort: {Patient_ID:1, Sample_ID:1}})
	   .forEach(function(treatment) {
	       var patient = patients[treatment.Patient_ID];

	       var onTreatment = parseInt((treatment.Start_Date - patient.On_Study_Date) / milliSecondsPerDay);

	       if (onTreatment < -2000)
		   onTreatment = -2000; // BAD HACK,

	       var stop_Date = treatment.Stop_Date;
	       if (stop_Date == null)
		   stop_Date = now;

	       var offTreatment = parseInt((stop_Date - patient.On_Study_Date) / milliSecondsPerDay);

	       if (max < offTreatment) max = offTreatment;
	       if (min > onTreatment) min = onTreatment;

	       var description = treatment.Drug_Name || treatment.Treatment_Details;

	       if (description != null) {
		   patient.events.push({
		       description: description,
		       on: onTreatment,
		       off: offTreatment,
		   });


		  if (patient.min > onTreatment) patient.min = onTreatment;
		  if (patient.max < offTreatment) patient.max = offTreatment;
	      } else 
		  console.log("bad treatment", treatment);

	      if (treatment.Reason_for_Stopping_Treatment) {
		   patient.events.push({
		       description: treatment.Reason_for_Stopping_Treatment,
		       on: offTreatment,
		       off: null
		   });
	      }
	  })
    }

    aggregate("SU2C_Prior_TX_V3");
    aggregate("SU2C_Subsequent_Treatment_V1");

    console.log("chart min max", min, max);
    Object.keys(patients).sort().map(function(k) {
       console.log(k, patients[k]);
    })

    chartDocument.chartData = aggregated;

    var spin =["Patient_ID"];
    chartDocument.selectedFieldNames = spin;
    chartDocument.dataFieldNames = spin;
    chartDocument.pivotTableConfig.rows = spin;
    chartDocument.pivotTableConfig.cols = [];
    chartDocument.elapsed = { min: min, max: max };

    console.log("makeD3Elapsed", max, min, chartDocument.chartData.length);
    return "makeD3Elapsed";
}
