/**
 * Adapter to CanvasLinearGradient
 *
 * @export{class} LinearGradient
 */
define(function(require) {

    var Gradient = require('./Gradient');
    var Vector2 = require("qtek/math/Vector2");

    var LinearGradient = Gradient.derive(function(){
        return {
            start : new Vector2(),
            end : new Vector2(100, 0)
        }
    }, {
        update : function(ctx){
            var gradient = ctx.createLinearGradient(this.start.x, this.start.y, this.end.x, this.end.y);
            for (var i = 0; i < this.stops.length; i++) {
                var stop = this.stops[i];
                gradient.addColorStop(stop[0], stop[1]);
            }
            this.cache.put('gradient', gradient);
        }
    });

    return LinearGradient;
})