// from http://stackoverflow.com/questions/1495219/how-can-i-prevent-the-backspace-key-from-navigating-back
//
function confirmBackspaceNavigations () {
    // http://stackoverflow.com/a/22949859/2407309
    var backspaceIsPressed = false

    $(document).keydown(function(event){
        if (event.which == 8) {
            backspaceIsPressed = true
        }
    })
    $(document).keyup(function(event){
        if (event.which == 8) {
            backspaceIsPressed = false
        }
    })
    $(window).on('beforeunload', function(){
        if (backspaceIsPressed) {
            backspaceIsPressed = false
            return "Hitting backspace causes the browser to navigate back a page."
        }
    })
} // confirmBackspaceNavigations

Meteor.startup(function() {
    $(document).ready(confirmBackspaceNavigations)
});
