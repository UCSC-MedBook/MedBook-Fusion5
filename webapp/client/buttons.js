
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

window.printButton = function () { 
    var container = $('.pvtRendererArea').children()
    var width = container.width();
    var height = container.height();
    var printWindow = window.open('', 'PrintMap', 'width=' + width + ',height=' + height);
    printWindow.document.writeln('<style> body, h1, h2, h3, ol, ul, div { width: auto; border: 0; margin: 0 5%; paddin: 0; float: none;position: static; overflow: visible; }</style>');

    printWindow.document.writeln($(container).html());
    printWindow.document.close();
    /*
    printWindow.print();
    printWindow.close();
    */
};


