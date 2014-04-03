/**
 * @export{class} RoundedRectangle
 */
define(function(require) {

    var Node = require('../Node');
    var util = require('../util');
    var Vector2 = require("qtek/math/Vector2");

    var RoundedRectange = Node.derive(function() {
        return {
            start   : new Vector2(),
            size    : new Vector2(),
            radius  : 0
        }
    }, {
        computeBoundingBox : function() {
            this.boundingBox = {
                min : this.start.clone(),
                max : this.size.clone().add(this.start)
            }
        },
        draw : function(ctx) {

            if (this.radius.constructor == Number) {
                // topleft, topright, bottomright, bottomleft
                var radius = [this.radius, this.radius, this.radius, this.radius];
            } else if (this.radius.length == 2) {
                var radius = [this.radius[0], this.radius[1], this.radius[0], this.radius[1]];
            } else {
                var radius = this.radius;
            }

            var start = this.fixAA ? util.fixPos(this.start.clone()) : this.start;
            var size = this.size;
            var v1 = new Vector2().copy(start).add(new Vector2(radius[0], 0));   //left top
            var v2 = new Vector2().copy(start).add(new Vector2(size.x, 0));     //right top
            var v3 = new Vector2().copy(start).add(size);                        //right bottom
            var v4 = new Vector2().copy(start).add(new Vector2(0, size.y));     //left bottom
            ctx.beginPath();
            ctx.moveTo(v1.x, v1.y);
            radius[1] ? 
                ctx.arcTo(v2.x, v2.y, v3.x, v3.y, radius[1]) :
                ctx.lineTo(v2.x, v2.y);
            radius[2] ?
                ctx.arcTo(v3.x, v3.y, v4.x, v4.y, radius[2]) :
                ctx.lineTo(v3.x, v3.y);
            radius[3] ?
                ctx.arcTo(v4.x, v4.y, start.x, start.y, radius[3]) :
                ctx.lineTo(v4.x, v4.y);
            radius[0] ? 
                ctx.arcTo(start.x, start.y, v2.x, v2.y, radius[0]) :
                ctx.lineTo(start.x, start.y);
            
            if (this.stroke) {
                ctx.stroke();
            }
            if (this.fill) {
                ctx.fill();
            }
        },
        intersect : function(x, y) {
            // TODO
            return false;
        }
    })

    return RoundedRectange;
})