/**
 *
 * @export{object}
 */
define(function(require) {
    
    var Vector2 = require("qtek/math/Vector2");
    var glMatrix = require("glmatrix");
    var vec2 = glMatrix.vec2;

    var tmp = new Vector2();

    var util =  {
        fixPos: function(pos) {
            pos.x += 0.5;
            pos.y += 0.5;
            return pos;
        },
        fixPosArray : function(poslist) {
            var len = poslist.length;
            for(var i = 0; i < len; i++) {
                this.fixPos(poslist[i]);
            }
            return poslist;
        },
        computeBoundingBox : function(points, min, max) {
            var left = points[0].x;
            var right = points[0].x;
            var top = points[0].y;
            var bottom = points[0].y;
            
            for (var i = 1; i < points.length; i++) {
                var p = points[i];
                if (p.x < left) {
                    left = p.x;
                }
                if (p.x > right) {
                    right = p.x;
                }
                if (p.y < top) {
                    top = p.y;
                }
                if (p.y > bottom) {
                    bottom = p.y;
                }
            }
            min.set(left, top);
            max.set(right, bottom);
        },

        // http://pomax.github.io/bezierinfo/#extremities
        computeCubeBezierBoundingBox : function(p0, p1, p2, p3, min, max) {
            var xDim = util._computeCubeBezierExtremitiesDim(p0.x, p1.x, p2.x, p3.x);
            var yDim = util._computeCubeBezierExtremitiesDim(p0.y, p1.y, p2.y, p3.y);

            xDim.push(p0.x, p3.x);
            yDim.push(p0.y, p3.y);

            var left = Math.min.apply(null, xDim);
            var right = Math.max.apply(null, xDim);
            var top = Math.min.apply(null, yDim);
            var bottom = Math.max.apply(null, yDim);

            min.set(left, top);
            max.set(right, bottom);
        },

        _computeCubeBezierExtremitiesDim : function(p0, p1, p2, p3) {
            var extremities = [];

            var b = 6 * p2 - 12 * p1 + 6 * p0;
            var a = 9 * p1 + 3 * p3 - 3 * p0 - 9 * p2;
            var c = 3 * p1 - 3 * p0;

            var tmp = b * b - 4 * a * c;
            if (tmp > 0){
                var tmpSqrt = Math.sqrt(tmp);
                var t1 = (-b + tmpSqrt) / (2 * a);
                var t2 = (-b - tmpSqrt) / (2 * a);
                extremities.push(t1, t2);
            } else if(tmp == 0) {
                extremities.push(-b / (2 * a));
            }
            var result = [];
            for (var i = 0; i < extremities.length; i++) {
                var t = extremities[i];
                if (Math.abs(2 * a * t + b) > 0.0001 && t < 1 && t > 0) {
                    var ct = 1 - t;
                    var val = ct * ct * ct * p0 
                            + 3 * ct * ct * t * p1
                            + 3 * ct * t * t * p2
                            + t * t *t * p3;

                    result.push(val);
                }
            }

            return result;
        },

        // http://pomax.github.io/bezierinfo/#extremities
        computeQuadraticBezierBoundingBox : function(p0, p1, p2, min, max) {
            // Find extremities, where derivative in x dim or y dim is zero
            var tmp = (p0.x + p2.x - 2 * p1.x);
            // p1 is center of p0 and p2 in x dim
            if (tmp === 0) {
                var t1 = 0.5;
            } else {
                var t1 = (p0.x - p1.x) / tmp;
            }

            tmp = (p0.y + p2.y - 2 * p1.y);
            // p1 is center of p0 and p2 in y dim
            if (tmp === 0) {
                var t2 = 0.5;
            } else {
                var t2 = (p0.y - p1.y) / tmp;
            }

            t1 = Math.max(Math.min(t1, 1), 0);
            t2 = Math.max(Math.min(t2, 1), 0);

            var ct1 = 1-t1;
            var ct2 = 1-t2;

            var x1 = ct1 * ct1 * p0.x + 2 * ct1 * t1 * p1.x + t1 * t1 * p2.x;
            var y1 = ct1 * ct1 * p0.y + 2 * ct1 * t1 * p1.y + t1 * t1 * p2.y;

            var x2 = ct2 * ct2 * p0.x + 2 * ct2 * t2 * p1.x + t2 * t2 * p2.x;
            var y2 = ct2 * ct2 * p0.y + 2 * ct2 * t2 * p1.y + t2 * t2 * p2.y;

            return util.computeBoundingBox(
                        [p0.clone(), p2.clone(), new Vector2(x1, y1), new Vector2(x2, y2)],
                        min, max
                    );
        },
        // http://stackoverflow.com/questions/1336663/2d-bounding-box-of-a-sector
        computeArcBoundingBox : (function(){
            var start = new Vector2();
            var end = new Vector2();
            // At most 4 extremities
            var extremities = [new Vector2(), new Vector2(), new Vector2(), new Vector2()];
            return function(center, radius, startAngle, endAngle, clockwise, min, max) {
                clockwise = clockwise ? 1 : -1;
                start
                    .set(Math.cos(startAngle), Math.sin(startAngle) * clockwise)
                    .scale(radius)
                    .add(center);
                end
                    .set(Math.cos(endAngle), Math.sin(endAngle) * clockwise)
                    .scale(radius)
                    .add(center);
                
                startAngle = startAngle % (Math.PI * 2);
                if (startAngle < 0) {
                    startAngle = startAngle + Math.PI * 2;
                }
                endAngle = endAngle % (Math.PI * 2);
                if (endAngle < 0) {
                    endAngle = endAngle + Math.PI * 2;
                }

                if (startAngle > endAngle) {
                    endAngle += Math.PI * 2;
                }
                var number = 0;
                for (var angle = 0; angle < endAngle; angle += Math.PI / 2) {
                    if (angle > startAngle) {
                        extremities[number++]
                            .set(Math.cos(angle), Math.sin(angle) * clockwise)
                            .scale(radius)
                            .add(center);
                    }
                }
                var points = extremities.slice(0, number)
                points.push(start, end);
                util.computeBoundingBox(points, min, max);
            }
        })()
    }

    return util;
} )