
Template.SimpleDataBrowser.rendered = function() {

    this.simpleDataHot = new Handsontable(document.getElementById('SimpleDataWrapper'), { 
	 data: this.data.data,
	 minSpareRows: 1,
         rowHeaders: true,
	 colHeaders: true,
	 contextMenu: true,
         stretchH: 'all',
    });
}

Template.SimpleDataBrowser.events({
   'click .save': function(e, t){
      if (t.data.save)
	  t.data.save(t.simpleDataHot.getData())
      t.simpleDataHot.destroy();
      OverlayClose();
   },
   'click .cancel': function(e, t){
      t.simpleDataHot.destroy();
      OverlayClose();
   }
});
