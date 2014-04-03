define(function(require){

    var Node = require('../Node');
    var Vector2 = require("qtek/math/Vector2");

    var Ellipse = Node.derive(function() {
        return {
            center : new Vector2(),
            radius : new Vector2()   
        }

    }, {
        computeBoundingBox : function() {
            this.boundingBox = {
                min : this.center.clone().sub(this.radius),
                max : this.center.clone().add(this.radius)
            }
        },
        draw : function(ctx) {
            ctx.save();
            ctx.translate(this.center.x, this.center.y);
            ctx.scale(1, this.radius.y / this.radius.x);
            ctx.beginPath();
            ctx.arc(0, 0, this.radius.x, 0, 2*Math.PI, false);
            
            if (this.stroke) {
                ctx.stroke();
            }
            if (this.fill) {
                ctx.fill();
            }
            ctx.restore();
        },
        intersect : function() {

            return vec2.len([this.center[0]-x, this.center[1]-y]) < this.radius;
        }
    } )

    return Ellipse;
});