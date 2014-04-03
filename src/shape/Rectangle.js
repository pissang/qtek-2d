define(function(require){

    var Node = require('../Node');
    var util = require('../util');
    var Vector2 = require("qtek/math/Vector2");

    var Rectangle = Node.derive( function() {
        return {
            start : new Vector2(0, 0),
            size : new Vector2(0, 0)
        }
    }, {
        computeBoundingBox : function() {
            return {
                min : this.start.clone(),
                max : this.size.clone().add(this.start)
            }
        },
        draw : function(ctx) {

            var start = this.start;

            ctx.beginPath();
            ctx.rect(start.x, start.y, this.size.x, this.size.y);
            if (this.stroke){
                ctx.stroke();
            }
            if (this.fill){
                ctx.fill();
            }
        },
        intersect : function(x, y) {
            return this.intersectBoundingBox(x, y);
        }
    })

    return Rectangle;
})