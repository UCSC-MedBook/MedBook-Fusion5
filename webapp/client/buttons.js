
window.postButton = function () { 
    var copy = Charts.findOne({_id: TheChartID});
    delete copy["_id"];
    delete copy["userId"];
    copy.posted = true;
    var postedId = Charts.insert(copy);
    var url = Meteor.absoluteUrl('display/'+postedId);
    window.medbookpost = { title: document.title, url: url }
    $.getScript('/postScript');
}

