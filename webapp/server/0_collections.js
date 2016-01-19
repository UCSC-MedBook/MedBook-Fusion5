Meteor.startup(function() {
   GeneExpression = new Meteor.Collection("gene_expression");
   GeneStatistics = new Meteor.Collection("gene_statistics");
});
