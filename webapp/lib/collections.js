Collections = {};
Collections.studies = new Meteor.Collection('studies');
Collections.Metadata = new Meteor.Collection("Metadata");
Collections.CRFs = new Meteor.Collection("CRFs");
Collections.FusionFeatures = new Meteor.Collection("FusionFeatures");

DIPSC_coll = new Meteor.Collection("DIPSC");
Charts = new Meteor.Collection("Charts");
Expression = new Meteor.Collection('expression2');
ExpressionIsoform = new Meteor.Collection('expression_isoform');
Mutations = new Meteor.Collection('mutations');
SignatureScores = new Meteor.Collection('signature_scores');
GeneSets = new Meteor.Collection('gene_sets');
GeneExpression = new Meteor.Collection("gene_expression");

DomainCollections = {
  'Expression' : Expression,
  'ExpressionIsoform' : ExpressionIsoform,
  'Mutations' : Mutations,
  'SignatureScores' : SignatureScores,
  'GeneExpression' : GeneExpression
};

MinimalChart = {
   pivotTableConfig: {
       rows: [],
       cols: [],
       rendererName: "table",
   },
   exclusions: [],
   chartData: []
};

ensureMinimalChart = function(doc) {
    if (doc) {
	Object.keys(MinimalChart).map(function(key) {
	    if (!(key in doc))
	       doc[key] = MinimalChart[key];
	});
    }
}

Charts.after.findOne( function (userId, selector, options, doc) {
    ensureMinimalChart(doc);
});

Charts.before.insert( function ChartsUpdate(userId, doc) {
  doc.updatedAt = Date.now();
  doc.userId = userId;
  if (doc.chartData == null)
      doc.chartData = [];
});

Charts.before.update(function (userId, doc, fieldNames, modifier, options) {
    modifier.$set = modifier.$set || {};
    modifier.$set.updatedAt = Date.now();
});

QuickR = new Meteor.Collection('QuickR');
Contrast = new Meteor.Collection('contrast');
Summaries = new Meteor.Collection("Summaries");

