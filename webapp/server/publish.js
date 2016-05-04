Meteor.publish('FusionFeatures', function() {
  var cursor = Collections.FusionFeatures.find();
  console.log("FusionFeatures publish", cursor.count());
  return cursor;
});

/*
Meteor.publish('Chart', function(_id) {
    var q;
    if (_id != null) {
        q = { $or:
            [
                {
                    _id: _id
                },
                {
                    userId: this.userId,
                    post: {$exists: 0}
                }
            ]
        };
    } else if (this.userId != null) {
        q = {
                userId: this.userId,
                post: {$exists: 0}
            };
    } else
        return [];

    var cursor = Charts.find(q,{limit:3});
    if (cursor.count() == 0) {
        Charts.insert({userId: this.userId, chartData: []}) ;
        cursor = Charts.find(q);
    }

    console.log("Chart", q, cursor.count());
    return cursor;
});
*/

Charts.allow({
  insert: function (userId, doc) { return true; },
  update: function (userId, doc, fieldNames, modifier) { return true; },
  remove: function (userId, doc) { return true; }
});

// Charts.deny({
//   insert: function (userId, doc) { return false; },
//   update: function (userId, doc, fieldNames, modifier) { return false; },
//   remove: function (userId, doc) { return true; }
// });

// 0 security. Not okay.
Meteor.publish('Contrast', function() {
    return Contrast.find({});
});

Contrast.allow({
  insert: function (userId, doc) { return true; },
  update: function (userId, doc, fieldNames, modifier) { return true; },
  remove: function (userId, doc) { return true; }
});
Contrast.deny({
  insert: function (userId, doc) { return false; },
  update: function (userId, doc, fieldNames, modifier) { return false; },
  remove: function (userId, doc) { return false; }
});

Meteor.publish("studies", function() {
  var user = MedBook.ensureUser(this.userId);

  return Studies.find({
    collaborations: { $in: user.getCollaborations() },
  });
});

Meteor.publish('GeneExpression', function(studies, genes) {
    var q = ({Study_ID:{$in: studies}, gene: {$in: genes}});
    var cursor =  Expression.find(q);
    // console.log("Expression publish", q,"returns", cursor.count());
    return cursor;
});

Meteor.publish('GeneExpressionIsoform', function(studies, genes) {
    var cursor =  ExpressionIsoform.find({Study_ID:{$in: studies}, gene: {$in: genes}});
    // console.log("ExpressionIsoform publish", studies, genes, cursor.count());
    return cursor;
});

Meteor.publish('GeneSignatureScores', function(studies, genes) {
    var cursor =  SignatureScores.find({Study_ID:{$in: studies}, gene: {$in: genes}});
    // console.log("SignatureScores publish", studies, genes, cursor.count());
    return cursor;
});

Meteor.publish('GeneMutations', function(studies, genes) {
    var q = { // Study_ID:{$in: studies},
            Hugo_Symbol: {$in: genes} };
    var cursor =  Mutations.find( q, { fields: {"Hugo_Symbol":1, sample: 1, Variant_Type:1 } });
    // console.log("Mutations publish", studies, genes, cursor.count());
    return cursor;
});

Meteor.publish('AllCharts', function() {
    var cursor = Charts.find();
    // console.log("AllCharts publish", cursor.count());
    return cursor;
});
Meteor.publish('GeneSets', function() {
    var cursor = GeneSets.find();
    // console.log("GeneSets publish", cursor.count());
    return cursor;
});

Meteor.publish('Metadata', function() {
  var user = MedBook.ensureUser(this.userId);

  var studies = MedBook.collections.Studies.find({
    collaborations: { $in: user.getCollaborations() }
  }, { fields: { id: 1 } }).fetch();

  var studyLabels = _.pluck(studies, "id");

  return Collections.Metadata.find({
    study: { $in: studyLabels }
  });
});

Meteor.publish('CRFs', function(study_label, crfName) {
  check(study_label, String);
  check(crfName, String);

  console.log("study_label:", study_label);
  console.log("crfName:", crfName);

  var user = MedBook.ensureUser(this.userId);
  user.ensureAccess(Studies.findOne({id: study_label}));

  // We could check the Metadata as an extra security for crfName, but
  // we shouldn't be adding anything to the database that isn't in the
  // Metadata collection, so I don't think it's necessary.
  // Perhaps this should be done to maintain referential integrity (kind of)
  // between Metadata and CRFs?

  // NOTE: not hardcoding "common" study here: users may choose to join or leave
  // that as they please.
  return CRFs.find({
    Study_ID: study_label,
    CRF: crfName,
  });
});

QuickR.allow({
  insert: function (userId, doc) { return userId != null; },
  update: function (userId, doc, fieldNames, modifier) { return userId != null; },
  remove: function (userId, doc) { return true; }
});

QuickR.before.insert(function(userId, doc) {
    doc.userId = userId;
});

Meteor.publish('QuickR', function(_id) {
    if (this.userId) {
        var cursor = QuickR.find({_id:_id});
        // console.log("QuickR", this.userId, _id,  cursor.count());
        return cursor;
    }
    return null;
});


Meteor.publish('MyCharts', function(_id) {
    var q;
    if (_id != null) {
        q = { $or:
            [
                {
                    _id: _id
                },
                {
                    userId: this.userId,
                    post: {$exists: 0}
                }
            ]
        };
    } else if (this.userId != null) {
        q = {
                userId: this.userId,
                post: {$exists: 0}
            };
    } else
        return [];

    var cursor = Charts.find(q, {
	    fields: {_id:1, updatedAt:1, post: 1, userId: 1},

	    sort:{lastupdated:  -1}
    });

    if (cursor.count() == 0) {
        Charts.insert({userId: this.userId, chartData: []}) ;
        cursor = Charts.find(q);
    }

    // console.log("MyCharts", q, cursor.count());
    return cursor;
});



// var fields = {fields: { "_id":1, "updatedAt":1, "userId":1, "pivotTableConfig":1, "selectedFieldNames":1,"studies":1,"gene_list: "exclusions":1, "html":1 }};
/*
Meteor.publish('TheChart', function(_id) {
    var cursor = Charts.find({_id: _id}, fields);
    console.log("TheChart", _id, cursor.count());
    return cursor;
});
*/

Meteor.publish('TheChart', function(_id) {
    var cursor = Charts.find({_id: _id}, {fields: { chartData:0 }});
    return cursor;
});

Meteor.publish('TheChartData', function(_id, n, m) {
    var cursor = Charts.find({_id: _id}, {fields: { chartData:1 }});
    return cursor;
});
