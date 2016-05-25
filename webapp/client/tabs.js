ReactiveTabs.createInterface({
  template: 'basicTabs',
  onChange: function (slug, template) {
    Session.set("activeTab", slug);
  }
});

Template.topLevel.helpers({
  tabs: function () {
    // Every tab object MUST have a name and a slug!
    return [
      { name: 'Import', slug: 'Import' },
      { name: 'Analyze', slug: 'Analyze' },
      { name: 'Export', slug: 'Export', onRender: function(slug, template) {
      }}
    ];
  },
  activeTab: function () {
    // Use this optional helper to reactively set the active tab.
    // All you have to do is return the slug of the tab.

    // You can set this using an Iron Router param if you want--
    // or a Session variable, or any reactive value from anywhere.

    // If you don't provide an active tab, the first one is selected by default.
    // See the `advanced use` section below to learn about dynamic tabs.
    return Session.get('activeTab'); // Returns "people", "places", or "things".
  }
});

