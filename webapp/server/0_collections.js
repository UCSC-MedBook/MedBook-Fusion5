Meteor.startup(function() {
   GeneStatistics = new Meteor.Collection("gene_statistics");
   Meteor.call("prepareGeneStatistics", "prad_wcdt");

});
