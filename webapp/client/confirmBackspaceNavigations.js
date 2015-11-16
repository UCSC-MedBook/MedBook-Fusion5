// from http://stackoverflow.com/questions/1495219/how-can-i-prevent-the-backspace-key-from-navigating-back
//
function confirmBackspaceNavigations () {
    // http://stackoverflow.com/a/22949859/2407309
    var backspaceIsPressed = false
    var last = new Date();

    $(document).keydown(function(event){
        console.log(document.activeElement);
        last = new Date();
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
        alert(new Date() - last);
        if (backspaceIsPressed) {
            backspaceIsPressed = false
            return "Hitting backspace causes the browser to navigate back a page."
        }
        return "Unloading page"
    })
} // confirmBackspaceNavigations

Meteor.startup(function() {
    $(document).ready(confirmBackspaceNavigations)
});
