Collections = {};
Collections.data_sets = new Meteor.Collection('data_sets');
Collections.Metadata = new Meteor.Collection("Metadata");
Collections.CRFs = new Meteor.Collection("CRFs");
Collections.FusionFeatures = new Meteor.Collection("FusionFeatures");

DIPSC_coll = new Meteor.Collection("DIPSC");
Charts = new Meteor.Collection("Charts");
Mutations = new Meteor.Collection('mutations');
SignatureScores = new Meteor.Collection('signature_scores');
GeneSets = new Meteor.Collection('gene_sets');
GeneExpression = new Meteor.Collection("gene_expression");

Meteor.startup(function() {
    FeaturePanels = new Meteor.Collection("FeaturePanels");

    FeaturePanelsSchema = new SimpleSchema({
	categories: {
	    type: [Object]
	},
	"categories.$.name": {
	    type: String
	},
	"categories.$.features": {
	    type: [Object]
	},
	"categories.$.features.$.name": {
	    type: String
	},
	"categories.$.features.$.kind": {
	    type: String
	},
    });
    FeaturePanels.attachSchema( FeaturePanelsSchema );
});




DomainCollections = {
  'GeneExpression' : GeneExpression,
  'Mutations' : Mutations,
  'SignatureScores' : SignatureScores,
  'GeneExpression' : GeneExpression
};

MinimalChart = {
   pivotTableConfig: {
       rows: [],
       cols: [],
       rendererName: "Table",
   },
   exclusions: [],
   chartData: [],
   startTables: []

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

