
Meteor.publish('studies', function() {
    return Collections.studies.find({});
});
Meteor.publish('DIPSC', function(_id) {
    var cursor = DIPSC_coll.find({_id: _id});
    console.log("DIPSC publish", _id, cursor.count());
    return cursor;
});

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

    var cursor = Charts.find(q);
    if (cursor.count() == 0) {
        Charts.insert({userId: this.userId, chartData: []}) ;
        cursor = Charts.find(q);
    }

    console.log("Chart", q, cursor.count());
    return cursor;
});

Charts.allow({
  insert: function (userId, doc) { return true; }, 
  update: function (userId, doc, fieldNames, modifier) { return true; },
  remove: function (userId, doc) { return true; }
});
Charts.deny({
  insert: function (userId, doc) { return false; }, 
  update: function (userId, doc, fieldNames, modifier) { return false; }, 
  remove: function (userId, doc) { return true; }
});

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

/*
function assure(userId, collaborations)  {
    Meteor.findOne();

    var collaborations = ["public"]
    if (this.userId) {
        var user_record = Meteor.users.findOne({_id:this.userId}, {_id:0,'profile.collaborations':1})
        console.log('concat',user_record.profile.collaborations)
        collaborations = collaborations.concat(user_record.profile.collaborations)
    }
    var cnt = Collections.studies.find({collaborations: {$in: collaborations}}).count();
    console.log ('member of',cnt, 'study based on ',collaborations)
    return Collections.studies.find({collaborations: {$in: collaborations}});
}
*/

Meteor.publish('GeneExpression', function(studies, genes) {
    var q = ({Study_ID:{$in: studies}, gene: {$in: genes}});
    var cursor =  Expression.find(q);
    console.log("Expression publish", q,"returns", cursor.count());
    return cursor;
});

Meteor.publish('GeneExpressionIsoform', function(studies, genes) {
    var cursor =  ExpressionIsoform.find({Study_ID:{$in: studies}, gene: {$in: genes}});
    console.log("ExpressionIsoform publish", studies, genes, cursor.count());
    return cursor;
});

Meteor.publish('GeneSignatureScores', function(studies, genes) {
    var cursor =  SignatureScores.find({Study_ID:{$in: studies}, gene: {$in: genes}});
    console.log("SignatureScores publish", studies, genes, cursor.count());
    return cursor;
});

Meteor.publish('GeneMutations', function(studies, genes) {
    var q = { // Study_ID:{$in: studies},
            Hugo_Symbol: {$in: genes} };
    var cursor =  Mutations.find( q, { fields: {"Hugo_Symbol":1, sample: 1, Variant_Type:1 } });
    console.log("Mutations publish", studies, genes, cursor.count());
    return cursor;
});

Meteor.publish('AllCharts', function() {
    var cursor = Charts.find();
    console.log("AllCharts publish", cursor.count());
    return cursor;
});
Meteor.publish('GeneSets', function() {
    var cursor = GeneSets.find();
    console.log("GeneSets publish", cursor.count());
    return cursor;
});

Meteor.publish('Metadata', function() {
    var cursor =  Collections.Metadata.find({}, { sort: {"name":1}});
    console.log("Metadata publish", cursor.count());
    return cursor;
});
Meteor.publish('CRFs', function(studies, crfs) {
    console.log("this.userId", this.userId);

    var user_record = Meteor.users.findOne({_id:this.userId}, {fields: {'profile.collaborations':1}});
    console.log("user_record", user_record);
    var collaborations = ["public"];

    collaborations = _.union(collaborations, user_record.profile.collaborations);
    studies = _.union(studies, "user:" + user_record.username);

    console.log("collaborations", collaborations);
    console.log("studies", studies);
    console.log("crfs", crfs);

    var metadata = Collections.Metadata.findOne({name: {$in: crfs}}, { sort: {"name":1}});
    if (metadata == null) {
	console.log("no metadata for", crfs);
        return [];
    }

    var studyQuery = {
	collaborations: {$in: collaborations}
    };

    if (!_.contains(studies, "common")) {
	studyQuery.id = {$in: studies};
    }

    var crfsQuery = {CRF: {$in: crfs}};

    if (metadata.study == "common") {
	var study_ids = Collections.studies.find(
	    studyQuery, 
	    {fields:{id:1}}
	).map(function(study){ return study.id});

	if (study_ids.length == 0)  // The user is not a collaborator in any of the selected studies
	    return [];
	else
	    crfsQuery.Study_ID = {$in: study_ids};
    }

    var cursor =  Collections.CRFs.find(crfsQuery, { sort: {"name":1}});

    console.log("CRFs publish", crfs, studies, study_ids, cursor.count());
    return cursor;
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
        console.log("QuickR", this.userId, _id,  cursor.count());
        return cursor;
    }
    return null;
});
