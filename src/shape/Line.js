define(function(require) {

    var Node = require('../Node');
    var util = require('../util');
    var Vector2 = require("qtek/math/Vector2");

    var Line = Node.derive(function() {
        return {
            start : new Vector2(),
            end : new Vector2(),
            width : 0   //virtual width of the line for intersect computation 
        }
    }, {
        computeBoundingBox : function() {

            this.boundingBox = util.computeBoundingBox(
                                    [this.start, this.end],
                                    this.boundingBox.min,
                                    this.boundingBox.max
                                );
            
            if (this.boundingBox.min.x == this.boundingBox.max.x) { //line is vertical
                this.boundingBox.min.x -= this.width/2;
                this.boundingBox.max.x += this.width/2;
            }
            if (this.boundingBox.min.y == this.boundingBox.max.y) { //line is horizontal
                this.boundingBox.min.y -= this.width/2;
                this.boundingBox.max.y += this.width/2;
            }
        },
        draw : function(ctx) {
            
            var start = this.start,
                end = this.end;

            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();

        },
        intersect : function() {
            var a = new Vector2();
            var ba = new Vector2();
            var bc = new Vector2();

            return function(x, y) {
                if (!this.intersectBoundingBox(x, y)) {
                    return false;
                }
                var b = this.start;
                var c = this.end;

                a.set(x, y);
                ba.copy(a).sub(b);
                bc.copy(c).sub(b);

                var bal = ba.length();
                var bcl = bc.length();

                var tmp = bal * ba.scale(1/bal).dot(bcl.scale(1/bcl));

                var distSquare = bal * bal -  tmp * tmp;
                return distSquare < this.width * this.width * 0.25;
            }
        }
    });

    return Line;
})