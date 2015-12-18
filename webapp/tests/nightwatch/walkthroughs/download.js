// add tests to this file using the Nightwatch.js API
// http://nightwatchjs.org/api


var userA = {
  fullName: "Ted Goldstein",
    email: "ted@soe.ucsc.edu",
    username: "ted",
    password: "1415love",
};


module.exports = {
  tags: ['forms', 'wcdt', 'interactive'],
  "download" : function (client) {
    client
      .url("http://localhost:3000/fusion")
      .resizeWindow(800, 800)
      .signInDF(userA.email, userA.password)
      .pause(3000)
      .verify.elementPresent("#DownloadButton")
      .click("#DownloadButton")
      .pause(3000)
      .end();
  }
};

