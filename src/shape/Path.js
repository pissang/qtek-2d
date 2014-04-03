/**
 *
 * Inspired by path in paper.js
 */
define(function(require) {

    var Node = require('../Node');
    var util = require('../util');
    var Vector2 = require("qtek/math/Vector2");

    var minTmp = new Vector2();
    var maxTmp = new Vector2();

    var Path = Node.derive(function() {
        return {
            segments : [],
            closePath : false
        }
    }, {
        computeBoundingBox : function() {
            var l = this.segments.length;
            var segs = this.segments;

            var min = this.boundingBox.min;
            var max = this.boundingBox.max;
            min.set(999999, 999999);
            max.set(-999999, -999999);
            
            for (var i = 1; i < l; i++) {
                if (segs[i-1].handleOut || segs[i].handleIn) {
                    var bb = util.computeCubeBezierBoundingBox(
                                segs[i-1].point,
                                segs[i-1].handleOut || segs[i-1].point,
                                segs[i].handleIn || segs[i].point,
                                segs[i].point,
                                minTmp, maxTmp
                            );
                    min.min(minTmp);
                    max.max(maxTmp);
                } else {
                    min.min(segs[i-1].point);
                    min.min(segs[i].point);

                    max.max(segs[i-1].point);
                    max.max(segs[i].point);
                }
            }
        },
        draw : function(ctx) {
            
            var l = this.segments.length;
            var segs = this.segments;
            
            ctx.beginPath();
            ctx.moveTo(segs[0].point.x, segs[0].point.y);
            for (var i = 1; i < l; i++) {
                if (segs[i-1].handleOut || segs[i].handleIn) {
                    var prevHandleOut = segs[i-1].handleOut || segs[i-1].point;
                    var handleIn = segs[i].handleIn || segs[i].point;
                    ctx.bezierCurveTo(prevHandleOut.x, prevHandleOut.y,
                            handleIn.x, handleIn.y, segs[i].point.x, segs[i].point.y);
                } else {
                    ctx.lineTo(segs[i].point.x, segs[i].point.y);
                }
            }
            if (this.closePath) {
                if (segs[l-1].handleOut || segs[0].handleIn) {
                    var prevHandleOut = segs[l-1].handleOut || segs[l-1].point;
                    var handleIn = segs[0].handleIn || segs[0].point;
                    ctx.bezierCurveTo(prevHandleOut.x, prevHandleOut.y,
                            handleIn.x, handleIn.y, segs[0].point.x, segs[0].point.y);
                } else {
                    ctx.lineTo(segs[0].point.x, segs[0].point.y);
                }
            }
            if (this.fill) {
                ctx.fill();
            }
            if (this.stroke) {
                ctx.stroke();
            }
        },
        smooth : function(degree) {

            var len = this.segments.length;
            var segs = this.segments;

            var v = new Vector2();
            for (var i = 0; i < len; i++) {
                var point = segs[i].point;
                var prevPoint = (i == 0) ? segs[len-1].point : segs[i-1].point;
                var nextPoint = (i == len-1) ? segs[0].point : segs[i+1].point;
                var degree = segs[i].smoothLevel || degree || 1;

                v.copy(nextPoint).sub(prevPoint).scale(0.25);

                //use degree to scale the handle length
                v.scale(degree);
                if (!segs[i].handleIn) {
                    segs[i].handleIn = point.clone().sub(v);
                } else {
                    segs[i].handleIn.copy(point).sub(v);
                }
                if (!segs[i].handleOut) {
                    segs[i].handleOut = point.clone().add(v);
                } else {
                    segs[i].handleOut.copy(point).add(v);
                }
            }
        },
        pushPoints : function(points) {
            for (var i = 0; i < points.length; i++) {
                this.segments.push({
                    point : points[i],
                    handleIn : null,
                    handleOut : null
                })
            }
        }
    })

    return Path;
})