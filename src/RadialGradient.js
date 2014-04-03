/**
 * Adapter to CanvasRadialGradient
 *
 * @export{class} RadialGradient
 */
define(function(require) {

    var Gradient = require('./Gradient');
    var Vector2 = require("qtek/math/Vector2");

    var RadialGradient = Gradient.derive(function(){
        return {
            start : new Vector2(),
            startRadius : 0,
            end : new Vector2(),
            endRadius : 0
        }
    }, {
        update : function(ctx){
            var gradient = ctx.createRadialGradient(this.start.x, this.start.y, this.startRadius, this.end.x, this.end.y, this.endRadius);
            for (var i = 0; i < this.stops.length; i++) {
                var stop = this.stops[i];
                gradient.addColorStop(stop[0], stop[1]);
            }
            this.cache.put('gradient', gradient);
        }
    });

    return RadialGradient;
})