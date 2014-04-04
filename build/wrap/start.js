 (function(factory){
    // AMD
    if(typeof define !== "undefined" && define["amd"]){
        define( ["exports"], factory);
    // No module loader
    } else {
        window.qtek = window.qtek || {};
        factory(window.qtek['2d'] = {});
    }

})(function(_exports){
