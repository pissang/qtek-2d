define(function(require) {

    var mathTool = require('./tool/math');
    var glMatrix = require('qtek/dep/glmatrix');
    var vec3 = glMatrix.vec3;
    var vec2 = glMatrix.vec2;
    var mat4 = glMatrix.mat4;

    var epsilon = 5e-5;

    var GJKContext = require('./tool/GJK');

    var GJK = new GJKContext();


    var roundToZero = function(val) {
        if (val < epsilon && val > -epsilon) {
            return 0;
        }
        return val;
    }

    var BezierCurveSegment = function(x0, y0, x1, y1, x2, y2, x3, y3) {

        this.type = BezierCurveSegment.type;
        
        this.points = [x0, y0, x1, y1, x2, y2, x3, y3];

        this.thickness = 0;

        this.coords = [];

        // Two sub curves after subdivision
        this.subCurveA = null;

        this.subCurveB = null;

        this.subdivisionLevel = 0;

        this.triangles = [];
    }

    // Number of segments of bezier curve stroking
    BezierCurveSegment.prototype.strokeSteps = 0;

    // Precalculated parameters for incremental interpolation
    // http://antigrain.com/research/bezier_interpolation/index.html#PAGE_BEZIER_INTERPOLATION
    BezierCurveSegment.prototype.fx = 0;
    BezierCurveSegment.prototype.fy = 0;
    BezierCurveSegment.prototype.dfx = 0;
    BezierCurveSegment.prototype.dfy = 0;
    BezierCurveSegment.prototype.ddfx = 0;
    BezierCurveSegment.prototype.ddfy = 0;
    BezierCurveSegment.prototype.dddfx = 0;
    BezierCurveSegment.prototype.dddfy = 0;

    BezierCurveSegment.prototype.updateStrokeSegments = function(sx, sy) {
        var cps = this.points;
        var x0 = cps[0];
        var y0 = cps[1];
        var x1 = cps[2];
        var y1 = cps[3];
        var x2 = cps[4];
        var y2 = cps[5];
        var x3 = cps[6];
        var y3 = cps[7];

        var dx0 = (x1 - x0) * sx;
        var dy0 = (y1 - y0) * sy;
        var dx1 = (x2 - x1) * sx;
        var dy1 = (y2 - y1) * sy;
        var dx2 = (x3 - x2) * sx;
        var dy2 = (y3 - y2) * sy;

        var len = Math.sqrt(dx0 * dx0 + dy0 * dy0) + Math.sqrt(dx1 * dx1 + dy1 * dy1) + Math.sqrt(dx2 * dx2 + dy2 * dy2);

        // PENDING
        // Reduce steps ?
        this.strokeSteps = Math.ceil(len * 0.25);
        var step = 1.0 / (this.strokeSteps + 1.0);
        var step2 = step * step;
        var step3 = step2 * step;

        var pre1 = 3.0 * step;
        var pre2 = 3.0 * step2;
        var pre4 = 6.0 * step2;
        var pre5 = 6.0 * step3;

        var tmp1x = x0 - x1 * 2.0 + x2;
        var tmp1y = y0 - y1 * 2.0 + y2;

        var tmp2x = (x1 - x2) * 3.0 - x0 + x3;
        var tmp2y = (y1 - y2) * 3.0 - y0 + y3;

        this.fx = cps[0];
        this.fy = cps[1];

        this.dfx = (x1 - x0) * pre1 + tmp1x * pre2 + tmp2x * step3;
        this.dfy = (y1 - y0) * pre1 + tmp1y * pre2 + tmp2y * step3;

        this.ddfx = tmp1x * pre4 + tmp2x * pre5;
        this.ddfy = tmp1y * pre4 + tmp2y * pre5;

        this.dddfx = tmp2x * pre5;
        this.dddfy = tmp2y * pre5;
    }

    BezierCurveSegment.prototype.reverse = function() {
        mathTool.reverse(this.points, 4, 2);
        if (this.coords.length === 12) {
            mathTool.reverse(this.coords, 4, 3);
        }
        for (var i = 0; i < this.triangles.length; i++) {
            this.triangles[i] = 4 - this.triangles[i];
        }

        var cps = this.points;
        this.fx = cps[0];
        this.fy = cps[1];

        this.dfx = -this.dfx;
        this.dfy = -this.dfy;

        this.ddfx = -this.ddfx;
        this.ddfy = -this.ddfy;

        this.dddfx = -this.dddfx;
        this.dddfy = -this.dddfy;
    }

    BezierCurveSegment.prototype.subdivide = function(p) {

        var cps = this.points;
        var x0 = cps[0];
        var y0 = cps[1];
        var x1 = cps[2];
        var y1 = cps[3];
        var x2 = cps[4];
        var y2 = cps[5];
        var x3 = cps[6];
        var y3 = cps[7];

        var x01 = (x1 - x0) * p + x0;
        var y01 = (y1 - y0) * p + y0;

        var x12 = (x2 - x1) * p + x1;
        var y12 = (y2 - y1) * p + y1;

        var x23 = (x3 - x2) * p + x2;
        var y23 = (y3 - y2) * p + y2;

        var x012 = (x12 - x01) * p + x01;
        var y012 = (y12 - y01) * p + y01;

        var x123 = (x23 - x12) * p + x12;
        var y123 = (y23 - y12) * p + y12;

        var x0123 = (x123 - x012) * p + x012;
        var y0123 = (y123 - y012) * p + y012;

        var subCurveA = new BezierCurveSegment(x0, y0, x01, y01, x012, y012, x0123, y0123);
        var subCurveB = new BezierCurveSegment(x0123, y0123, x123, y123, x23, y23, x3, y3);

        subCurveA.subdivisionLevel = this.subdivisionLevel + 1;
        subCurveB.subdivisionLevel = this.subdivisionLevel + 1;

        this.subCurveA = subCurveA;
        this.subCurveB = subCurveB;
    }

    BezierCurveSegment.prototype.intersectCurve = function(curve) {
        if (this.subCurveA) {
            if (curve.subCurveA) {
                return this.subCurveA.intersectCurve(curve.subCurveA)
                    || this.subCurveA.intersectCurve(curve.subCurveB)
                    || this.subCurveB.intersectCurve(curve.subCurveA)
                    || this.subCurveB.intersectCurve(curve.subCurveB);
            } else {
                return this.subCurveA.intersectCurve(curve)
                    || this.subCurveB.intersectCurve(curve);
            }
        } else {
            return GJK.intersect(this.points, curve.points);
        }
    }

    BezierCurveSegment.prototype.updateTriangles = function() {
        var triangles = this._getTriangles();
        for (var i = 0; i < triangles.length; i++) {
            this.triangles[i] = triangles[i];
        }
        this.triangles.length = triangles.length;
    }

    // Procedure texture coords klm for cubic bezier curve drawing
    // http://http.developer.nvidia.com/GPUGems3/gpugems3_ch25.html
    // http://www.opensource.apple.com/source/WebCore/WebCore-1298.39/platform/graphics/gpu/LoopBlinnTextureCoords.cpp
    BezierCurveSegment.prototype.updateTextureCoords = (function() {
        // Homogeneous coords
        var b0 = vec3.fromValues(0, 0, 1);
        var b1 = vec3.fromValues(0, 0, 1);
        var b2 = vec3.fromValues(0, 0, 1);
        var b3 = vec3.fromValues(0, 0, 1);
        var tmpv3 = vec3.create();

        var a1, a2, a3, d1, d2, d3,
            ls, lt, ms, mt,
            ql, qm,
            tmp, discr,
            lt_ls, mt_ms,
            sign, k1,
            len;
        var oneThird = 1 / 3;
        var subdivision = -1;

        return function(force) {
            var coords = this.coords;
            var cps = this.points;
            var x0 = cps[0];
            var y0 = cps[1];
            var x1 = cps[2];
            var y1 = cps[3];
            var x2 = cps[4];
            var y2 = cps[5];
            var x3 = cps[6];
            var y3 = cps[7];

            vec2.set(b0, x0, y0);
            vec2.set(b1, x1, y1);
            vec2.set(b2, x2, y2);
            vec2.set(b3, x3, y3);

            // Discriminant
            vec3.cross(tmpv3, b3, b2);
            a1 = vec3.dot(b0, tmpv3);
            vec3.cross(tmpv3, b0, b3);
            a2 = vec3.dot(b1, tmpv3);
            vec3.cross(tmpv3, b1, b0);
            a3 = vec3.dot(b2, tmpv3);

            d1 = a1 - 2 * a2 + 3 * a3;
            d2 = -a2 + 3 * a3;
            d3 = 3 * a3;

            d1 = roundToZero(d1);
            d2 = roundToZero(d2);
            d3 = roundToZero(d3);

            sign = 1;
            // Is a line
            if (d1 == 0 && d2 == 0 && d3 == 0) {
                return;
            }
            // Is quadratic
            else if (d1 == 0 && d2 == 0) {
                sign = d3 < 0 ? -sign : sign;
                // cp0
                coords[0] = coords[1] = coords[2] = 0;
                // cp1
                coords[3] = oneThird * sign;
                coords[4] = 0;
                coords[5] = oneThird;
                // cp2
                coords[6] = 2 / 3 * sign;
                coords[7] = oneThird * sign;
                coords[8] = oneThird;
                // cp3
                coords[9] = coords[10] = sign;
                coords[11] = 1;

            } else {
                
                discr = 3 * d2 * d2 - 4 * d1 * d3;
                discr = roundToZero(discr);

                if (discr == 0 && d1 == 0) { // Cusp
                    ls = d3;
                    lt = 3 * d2;

                    lt_ls = lt - ls;

                     // cp0
                    coords[0] = ls;
                    coords[1] = ls * ls * ls;
                    coords[2] = 1.0;
                    // cp1
                    coords[3] = ls - oneThird * lt;
                    coords[4] = ls * ls * -lt_ls;
                    coords[5] = 1.0;
                    // cp2
                    coords[6] = ls - 2 * oneThird * lt;
                    coords[7] = lt_ls * lt_ls * ls;
                    coords[8] = 1.0;
                    // cp3
                    coords[9] = -lt_ls;
                    coords[10] = - lt_ls * lt_ls * lt_ls;
                    coords[11] = 1.0;

                } else if (discr >= 0) {   //Serpentine

                    tmp = Math.sqrt(discr * 3);
                    ls = 3 * d2 - tmp;
                    lt = 6 * d1;
                    ms = 3 * d2 + tmp;
                    mt = lt;

                    // Normalize
                    len = Math.sqrt(ls * ls + lt * lt);
                    ls /= len;
                    lt /= len;
                    len = Math.sqrt(ms * ms + mt * mt);
                    ms /= len;
                    mt /= len;

                    lt_ls = lt - ls;
                    mt_ms = mt - ms;

                    sign = d1 < 0 ? -sign : sign;
                    // cp0
                    coords[0] = ls * ms * sign;
                    coords[1] = ls * ls * ls * sign;
                    coords[2] = ms * ms * ms;
                    // cp1
                    coords[3] = oneThird * (3 * ls * ms -  ls * mt - lt * ms) * sign;
                    coords[4] = ls * ls * -lt_ls * sign;
                    coords[5] = ms * ms * -mt_ms;
                    // cp2
                    coords[6] = oneThird * (lt * (mt - 2 * ms) + ls * (3 * ms - 2 * mt)) * sign;
                    coords[7] = lt_ls * lt_ls * ls * sign;
                    coords[8] = mt_ms * mt_ms * ms;
                    // cp3
                    coords[9] = lt_ls * mt_ms * sign;
                    coords[10] = - lt_ls * lt_ls * lt_ls * sign;
                    coords[11] = - mt_ms * mt_ms * mt_ms;

                } else {    // Loop
                    tmp = Math.sqrt(-discr);
                    ls = d2 - tmp;
                    lt = 2 * d1;
                    ms = d2 + tmp;
                    mt = lt;

                    // Normalize
                    len = Math.sqrt(ls * ls + lt * lt);
                    ls /= len;
                    lt /= len;
                    len = Math.sqrt(ms * ms + mt * mt);
                    ms /= len;
                    mt /= len;

                    // Figure coords whether there is a rendering artifact requiring
                    // the curve to be subdivided by the caller.
                    ql = ls / lt;
                    qm = ms / mt;

                    if (ql > 0.0 && ql < 1.0) {
                        subdivision = ql;
                    } else if (qm > 0.0 && qm < 1.0) {
                        subdivision = qm;
                    } else {
                        subdivision = -1;
                    }
                    
                    // Use force to make sure only recursive once, dirty trick
                    // Because of numerical error
                    // http://stackoverflow.com/questions/20970673/how-to-solve-rendering-artifact-in-blinn-loops-resolution-independent-curve-ren
                    if (subdivision < 0 || force) {
                        lt_ls = lt - ls;
                        mt_ms = mt - ms;

                        k1 = roundToZero(ls * ms);
                        sign = (d1 > 0 && k1 < 0) || (d1 < 0 && k1 > 0) ? -sign : sign;

                        // cp0
                        coords[0] = k1 * sign;
                        coords[1] = ls * ls * ms * sign;
                        coords[2] = ls * ms * ms;
                        // cp1
                        coords[3] = oneThird * (-ls * mt - lt * ms + 3 * ls * ms) * sign;
                        coords[4] = - oneThird * ls * (ls * (mt - 3 * ms) + 2 * lt * ms) * sign;
                        coords[5] = - oneThird * ms * (ls * (2 * mt - 3 * ms) + lt * ms);
                        // cp2
                        coords[6] = oneThird * (lt * (mt - 2 * ms) + ls * (3 * ms - 2 * mt)) * sign;
                        coords[7] = oneThird * lt_ls * (ls * (2 * mt -  3 * ms) + lt * ms) * sign;
                        coords[8] = oneThird * mt_ms * (ls * (mt - 3 * ms) + 2 * lt * ms);
                        // cp3
                        coords[9] = lt_ls * mt_ms * sign;
                        coords[10] = - lt_ls * lt_ls * mt_ms * sign;
                        coords[11] = - lt_ls * mt_ms * mt_ms;

                    } else { // Do subdivide

                        this.subdivide(subdivision);

                        this.subCurveA.updateTextureCoords(true);

                        this.subCurveB.updateTextureCoords(true);
                    }
                }
            }

            this.updateTriangles();
        }
    })()

    BezierCurveSegment.prototype._getTriangles = (function() {
        // Last two item is the type of triangle
        // 1 is convex and -1 is concave
        var triangles1 = [0, 1, 3, 0, 2, 3];
        var triangles2 = [1, 0, 3, 1, 2, 3];
        var triangles3 = [1, 0, 2, 1, 2, 3];
        var triangles4 = [0, 1, 3];
        var triangles5 = [0, 2, 3];
        return function() {
            var cps = this.points;
            var x0 = cps[0];
            var y0 = cps[1];
            var x1 = cps[2];
            var y1 = cps[3];
            var x2 = cps[4];
            var y2 = cps[5];
            var x3 = cps[6];
            var y3 = cps[7];

            var isConvex = mathTool.isTriangleConvex(x0, y0, x1, y1, x3, y3);
            if (isConvex != mathTool.isTriangleConvex(x0, y0, x2, y2, x3, y3)) {
                return triangles1;
            } else {
                if (mathTool.isTriangleConvex(x0, y0, x1, y1, x2, y2) ^ !isConvex) { // cp2 is on the left side of edge01(right side if concave)
                    // cp2 is in the triangle013
                    if (mathTool.isTriangleConvex(x2, y2, x1, y1, x3, y3) ^ !isConvex) {
                        return triangles4;
                    } else {
                        return triangles2;
                    }
                } else {   // cp2 is on the right side of edge01
                    // cp1 is in the triangle023
                    if (mathTool.isTriangleConvex(x1, y1, x2, y2, x3, y3) ^ !isConvex) {
                        return triangles5;
                    } else {
                        return triangles3;
                    }
                }
            }
        }
    })();

    BezierCurveSegment.type = 2;

    return BezierCurveSegment;
});