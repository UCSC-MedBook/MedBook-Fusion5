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

Meteor.publish('data_sets', function()  {
    var collaborations = ["public"]
    if (this.userId) {
        var user_record = Meteor.users.findOne({_id:this.userId}, {_id:0,'profile.collaborations':1})
        // console.log('concat',user_record.profile.collaborations)
        collaborations = collaborations.concat(user_record.profile.collaborations)
    }
    var cnt = Collections.data_sets.find({collaborations: {$in: collaborations}}).count();
    // console.log ('member of',cnt, 'data_set based on ',collaborations)
    return Collections.data_sets.find({collaborations: {$in: collaborations}});
});

Meteor.publish('GeneExpression', function(data_sets, genes) {
    var q = ({data_set_id:{$in: data_sets}, gene: {$in: genes}});
    var cursor =  Expression.find(q);
    // console.log("Expression publish", q,"returns", cursor.count());
    return cursor;
});

Meteor.publish('GeneExpressionIsoform', function(data_sets, genes) {
    var cursor =  ExpressionIsoform.find({data_set_id:{$in: data_sets}, gene: {$in: genes}});
    // console.log("ExpressionIsoform publish", data_sets, genes, cursor.count());
    return cursor;
});

Meteor.publish('GeneSignatureScores', function(data_sets, genes) {
    var cursor =  SignatureScores.find({data_set_id:{$in: data_sets}, gene: {$in: genes}});
    // console.log("SignatureScores publish", data_sets, genes, cursor.count());
    return cursor;
});

Meteor.publish('GeneMutations', function(data_sets, genes) {
    var q = { // data_set_id:{$in: data_sets},
            Hugo_Symbol: {$in: genes} };
    var cursor =  Mutations.find( q, { fields: {"Hugo_Symbol":1, sample: 1, Variant_Type:1 } });
    // console.log("Mutations publish", data_sets, genes, cursor.count());
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
    var cursor =  Collections.Metadata.find({}, { sort: {"name":1}});
    // console.log("Metadata publish", cursor.count());
    return cursor;
});
Meteor.publish('CRFs', function(data_sets, crfs) {
    console.log("this.userId", this.userId, data_sets, crfs);

    var user_record = Meteor.users.findOne({_id:this.userId}, {fields: {'profile.collaborations':1}});
    // console.log("user_record", user_record);
    var collaborations = ["public"];

    collaborations = _.union(collaborations, user_record.profile.collaborations);
    data_sets = _.union(data_sets, "user:" + user_record.username);

    // console.log("collaborations", collaborations);
    // console.log("data_sets", data_sets);
    // console.log("crfs", crfs);

    var metadata = Collections.Metadata.findOne({name: {$in: crfs}}, { sort: {"name":1}});
    if (metadata == null) {
	// console.log("no metadata for", crfs);
        return [];
    }

    var data_setQuery = {
	collaborations: {$in: collaborations}
    };

    if (!_.contains(data_sets, "common")) {
	data_setQuery._id = {$in: data_sets};
    }

    var crfsQuery = Array.isArray(crfs) ? {CRF: {$in: crfs}} : crfs;

    if (metadata.data_set == "common") {
	var data_set_ids = Collections.data_sets.find(
	    data_setQuery, 
	    {fields:{id:1}}
	).map(function(data_set){ return data_set._id});

	if (data_set_ids.length == 0)  // The user is not a collaborator in any of the selected data_sets
	    return [];
	else
	    crfsQuery.data_set_id = {$in: data_set_ids};
    }

    var cursor =  Collections.CRFs.find(crfsQuery, { sort: {"name":1}});

    // console.log("CRFs publish", crfs, data_sets, data_set_ids, cursor.count());
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
	    fields: {chartData:0},
	    
	    sort:{lastupdated:  -1}
    });

    if (cursor.count() == 0) {
        Charts.insert({userId: this.userId, chartData: []}) ;
        cursor = Charts.find(q);
    }

    // console.log("MyCharts", q, cursor.count());
    return cursor;
});



// var fields = {fields: { "_id":1, "updatedAt":1, "userId":1, "pivotTableConfig":1, "selectedFieldNames":1,"data_sets":1,"gene_list: "exclusions":1, "html":1 }};
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

Meteor.publish('TheChartData', function(_id, dataFields) {
     
    var obj = Charts.findOne({_id: _id}, {fields: { pivotTableConfig:1 }});
    if (obj) {
        var fields = {};
        if (dataFields)
            dataFields.map(function(field) { fields["chartData."+field] = 1; });
        var cursor = Charts.find({_id: _id}, {fields: fields});
        return cursor;
    } else {
        return [];
    }
});
