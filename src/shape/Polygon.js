define(function(require) {

    var Node = require('../Node');
    var util = require('../util');
    var Vector2 = require("qtek/math/Vector2");

    var Polygon = Node.derive(function() {
        return {
            points : []
        }
    }, {
        computeBoundingBox : function() {
            this.boundingBox = util.computeBoundingBox(
                                    this.points,
                                    this.boundingBox.min,
                                    this.boundingBox.max
                                );
        },
        draw : function(ctx) {

            var points = this.points;

            ctx.beginPath();
            
            ctx.moveTo(points[0].x, points[0].y);
            for (var i =1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }
            ctx.closePath();
            if (this.stroke) {
                ctx.stroke();
            }
            if (this.fill) {
                ctx.fill();
            }
        },
        intersect : function(x, y) {
    
            if (!this.intersectBoundingBox(x, y)) {
                return false;
            }

            var len = this.points.length;
            var angle = 0;
            var points = this.points;
            var vec1 = new Vector2();
            var vec2 = new Vector2();
            for (var i =0; i < len; i++) {
                vec1.set(x, y).sub(points[i]).normalize().negate();
                var j = (i+1)%len;
                vec2.set(x, y).sub(points[j]).normalize().negate();
                var piece = Math.acos(vec1.dot(vec2));
                angle += piece;
            }
            return Math.length(angle - 2*Math.PI) < 0.001;
        }
    })

    return Polygon;
})