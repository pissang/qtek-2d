define(function(require){

    var Node = require('../Node');
    var Vector2 = require("qtek/math/Vector2");

    var Circle = Node.derive(function() {
        return {
            center : new Vector2(),
            radius : 0   
        }

    }, {
        computeBoundingBox : function() {
            this.boundingBox = {
                min : new Vector2(this.center.x-this.radius, this.center.y-this.radius),
                max : new Vector2(this.center.x+this.radius, this.center.y+this.radius)
            }
        },
        draw : function(ctx) {

            ctx.beginPath();
            ctx.arc(this.center.x, this.center.y, this.radius, 0, 2*Math.PI, false);
            
            if (this.stroke) {
                ctx.stroke();
            }
            if (this.fill) {
                ctx.fill();
            }
        },
        intersect : function() {

            return vec2.len([this.center[0]-x, this.center[1]-y]) < this.radius;
        }
    } )

    return Circle;
});