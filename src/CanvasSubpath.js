define(function(require) {
    
    'use strict';

    var mathTool = require('./tool/math');

    var LineSegment = require('./LineSegment');
    var BezierCurveSegment = require('./BezierCurveSegment');

    var Polygon = require('./Polygon');

    var glMatrix = require('qtek/dep/glmatrix');
    var vec3 = glMatrix.vec3;
    var vec2 = glMatrix.vec2;
    var mat4 = glMatrix.mat4;

    var SEG_TYPE_LINE = 1;
    var SEG_TYPE_QUADRATIC = 2;
    var SEG_TYPE_CUBIC = 3;

    var CanvasSubpath = function() {

        this.basePolygon = new Polygon(true);

        this.interiorPolygon = new Polygon(true);

        // Seperate the fill segments and stroke segments
        // because curve segment may be subdivided
        this.fillSegments = [];

        this.fillCurveSegments = [];

        this.strokeSegments = [];

        this.strokeVerticesArray = null;

        this._nFillSegments = 0;

        this._nStrokeSegments = 0;

        this._nFillCurveSegements = 0;

        this._isClosed = false;

        this._isEnded = false;

        this._fill = true;
        this._stroke = false;
    }

    CanvasSubpath.prototype.begin = function(x, y) {
        // Reset the states
        this._nFillSegments = 0;
        this._nStrokeSegments = 0;
        this._nFillCurveSegements = 0;

        this._isEnded = false;
        this._isClosed = false;
        this._fill = false;
        this._stroke = false;

        this.basePolygon.begin(x, y);
    }

    CanvasSubpath.prototype.end = function() {
        if (this._isEnded) {
            return;
        }

        this.strokeSegments.length = this._nStrokeSegments;
        this.fillSegments.length = this._nFillSegments;
        this.fillCurveSegments.length = this._nFillCurveSegements;

        this._isEnded = true;

        this.basePolygon.end();
        var area = this.basePolygon.area();
        if (area > 0) {
            this.reverse();
        } else if (area == 0) {
            // TODO
            // Simple hack when there is only one curve or multiple collinear curve
            // Of cource there are still some bad case
            if (this._nFillCurveSegements > 0) {
                if(!mathTool.isCCW(this.fillCurveSegments[0].points)) {
                    this.reverse();
                }
            }
        }
    }

    CanvasSubpath.prototype.close = function(thickness) {
        if (this._isClosed) {
            return;
        }
        // Add close line
        var poly = this.basePolygon;
        if (poly._nPoints > 1) {
            var seg = new LineSegment(poly._xi, poly._yi, poly._x0, poly._y0);
            seg.thickness = thickness;
            this.strokeSegments[this._nStrokeSegments++] = seg;
        }
        this._isClosed = true;
    }

    CanvasSubpath.prototype.stroke = function(sx, sy) {
        if (!this._stroke) {
            // Assume the subpath is ended
            this._stroke = true;

            for (var i = 0; i < this.strokeSegments.length; i++) {
                var seg = this.strokeSegments[i];
                if (seg.type == BezierCurveSegment.type) {
                    seg.updateStrokeSegments(sx, sy);
                }
            }

            this._convertLineToPolygon();
        }
    }

    CanvasSubpath.prototype.updateStrokeThickness = function(thickness) {
        if (this._stroke) {
            for (var i = 0; i < this.segments.length; i++) {
                var seg = this.strokeSegments[i];
                seg.thickness = thickness;
            }

            this._convertLineToPolygon();
        }
    }

    CanvasSubpath.prototype.fill = function() {
        if (!this._fill) {
            // Assume the subpath is ended
            this._fill = true;
            
            this._checkOverlap();

            this._updateCurveTextureCoords();

            this._updateSegments();

            this._updateInteriorPolygon();

            this.interiorPolygon.triangulate();

        }
    }

    CanvasSubpath.prototype.addLine = function(x0, y0, x1, y1, thickness) {
        
        var isClosed = this._checkClose(x1, y1);
        if (!isClosed) {
            this.basePolygon.addPoint(x1, y1);
        } else {
            this._isClosed = true;
        }
        
        var seg = new LineSegment(x0, y0, x1, y1);
        seg.thickness = thickness;

        this.strokeSegments[this._nStrokeSegments++] = seg;
        this.fillSegments[this._nFillSegments++] = seg;

        return isClosed;
    }

    CanvasSubpath.prototype.addQuadraticBezierCurve = function(x0, y0, x1, y1, x2, y2, thickness) {
        // Convert quadratic to cubic using degree elevation
        var x3 = x2;
        var y3 = y2;
        x2 = (x2 + 2 * x1) / 3;
        y2 = (y2 + 2 * y1) / 3;
        x1 = (x0 + 2 * x1) / 3;
        y1 = (y0 + 2 * y1) / 3;

        return this.addCubicBezierCurve(x0, y0, x1, y1, x2, y2, x3, y3, thickness);
    }

    CanvasSubpath.prototype.addCubicBezierCurve = function(x0, y0, x1, y1, x2, y2, x3, y3, thickness) {
        
        var isClosed = this._checkClose(x3, y3);
        if (!isClosed) {
            this.basePolygon.addPoint(x3, y3);
        } else {
            this._isClosed = true;
        }

        var seg = new BezierCurveSegment(x0, y0, x1, y1, x2, y2, x3, y3);
        seg.thickness = thickness;

        this.strokeSegments[this._nStrokeSegments++] = seg;
        this.fillSegments[this._nFillSegments++] = seg;

        this.fillCurveSegments[this._nFillCurveSegements++] = seg;

        return isClosed;
    }

    CanvasSubpath.prototype.isPointInSubpath = function(x, y) {
        var bbox = this.interiorPolygon.boundingBox;
        if (bbox[0][0] > x || bbox[1][0] < x || bbox[0][1] > y || bbox[1][1] < y) {
            return false;
        }
        
    }

    // Return true if the subpath is closed
    CanvasSubpath.prototype._checkClose = function(x, y) {
        return this.basePolygon.checkClose(x, y);
    }

    CanvasSubpath.prototype._updateCurveTextureCoords = function() {
        for (var i = 0; i < this.fillSegments.length; i++) {
            var seg = this.fillSegments[i];
            if (seg.type == BezierCurveSegment.type) {
                this._updateLeafCurveTextureCoords(seg);
            }
        }
    }

    CanvasSubpath.prototype._updateLeafCurveTextureCoords = function(seg) {
        if (seg.subCurveA) {
            this._updateLeafCurveTextureCoords(seg.subCurveA);
            this._updateLeafCurveTextureCoords(seg.subCurveB);
        } else {
            seg.updateTextureCoords();
        }
    }

    // Subdivide the cubic bezier curve overlapped
    // Limitation : zig zag curve
    CanvasSubpath.prototype._checkOverlap = function() {

        var candidates = [];
        var nCurves = this.fillCurveSegments.length;

        for (var i = 0; i < nCurves; i++) {
            for (var j = i+1; j < nCurves; j++) {
                var curve1 = this.fillCurveSegments[i];
                var curve2 = this.fillCurveSegments[j];
                if (curve1.intersectCurve(curve2)) {
                    candidates.push(curve1);
                    candidates.push(curve2);
                }
            }
        }

        while(candidates.length) {
            var c1 = candidates.shift();
            var c2 = candidates.shift();

            c1.subdivide(0.5);

            if (c1.subCurveA.intersectCurve(c2)) {
                if (Math.abs(mathTool.area(c1.subCurveA.points)) > 1) {
                    candidates.push(c2);
                    candidates.push(c1.subCurveA);   
                }
            }
            if (c1.subCurveB.intersectCurve(c2)) {
                if (Math.abs(mathTool.area(c1.subCurveB.points)) > 1) {
                    candidates.push(c2);
                    candidates.push(c1.subCurveB);
                }
            }
        }
    }

    CanvasSubpath.prototype._updateSegments = function() {
        this._nFillCurveSegements = 0;
        for (var idx = 0; idx < this._nFillSegments;) {
            var seg = this.fillSegments[idx];
            if (seg.type == BezierCurveSegment.type) {
                if (seg.subCurveA) {
                    this.fillSegments.splice(idx, 1);
                    this._nFillSegments--;
                    idx = this._replaceSubdividedCurve(seg, idx);
                } else {
                    this.fillCurveSegments[this._nFillCurveSegements++] = seg;
                    idx++;
                }
            } else {
                idx++;
            }
        }
        this.fillCurveSegments.length = this._nFillCurveSegements;
    }

    CanvasSubpath.prototype._replaceSubdividedCurve = function(seg, idx) {
        // Pending 
        // Splice performance
        if (seg.subCurveA) {
            idx = this._replaceSubdividedCurve(seg.subCurveA, idx);
            return this._replaceSubdividedCurve(seg.subCurveB, idx);
        } else {
            this.fillSegments.splice(idx, 0, seg);
            this._nFillSegments++;
            this.fillCurveSegments[this._nFillCurveSegements++] = seg;
            return idx + 1;
        }
    }

    CanvasSubpath.prototype._updateInteriorPolygon= function() {

        var x0, y0, x1, y1, x2, y2, x3, y3;
        if (this._nFillSegments < 2) {
            return;
        }

        var poly = this.interiorPolygon;
        var seg0 = this.fillSegments[0];

        poly.begin(seg0.points[0], seg0.points[1]);

        for (var i = 0; i < this._nFillSegments; i++) {
            var seg = this.fillSegments[i];
            switch(seg.type) {
                case LineSegment.type:
                    poly.addPoint(seg.points[2], seg.points[3]);
                    break;
                case BezierCurveSegment.type:
                    x0 = seg.points[0], y0 = seg.points[1];
                    x1 = seg.points[2], y1 = seg.points[3];
                    x2 = seg.points[4], y2 = seg.points[5];
                    x3 = seg.points[6], y3 = seg.points[7];

                    var isConvex = mathTool.isTriangleConvex(x0, y0, x1, y1, x3, y3);
                    if (isConvex != mathTool.isTriangleConvex(x0, y0, x2, y2, x3, y3)) {
                        // cp1 and cp2 is not on the same side of edge03
                        if (isConvex) {
                            // remove cp1
                            poly.addPoint(x2, y2);
                            poly.addPoint(x3, y3);
                        } else {
                            // remove cp2
                            poly.addPoint(x1, y1);
                            poly.addPoint(x3, y3);
                        }
                    } else { //cp1 and cp2 is on the same side of edge03
                        if (isConvex) {
                            // Remove cp1 and cp2
                            poly.addPoint(x3, y3);
                        } else {
                            if (mathTool.isTriangleConvex(x0, y0, x2, y2, x1, y1)) { // cp2 is on the right side of edge01
                                // cp2 is in the triangle013
                                if (mathTool.isTriangleConvex(x1, y1, x2, y2, x3, y3)) {
                                    // remove cp2
                                    poly.addPoint(x1, y1);
                                    poly.addPoint(x3, y3);
                                } else {
                                    // Add all
                                    poly.addPoint(x1, y1);
                                    poly.addPoint(x2, y2);
                                    poly.addPoint(x3, y3);
                                }
                            } else {   // cp2 is on the left side of edge01
                                // cp1 is in the triangle023
                                if (mathTool.isTriangleConvex(x2, y2, x1, y1, x3, y3)) {
                                    // remove cp1
                                    poly.addPoint(x2, y2);
                                    poly.addPoint(x3, y3);
                                } else {
                                    // Swap cp1 and cp2 and add all
                                    poly.addPoint(x2, y2);
                                    poly.addPoint(x1, y1);
                                    poly.addPoint(x3, y3);
                                }
                            }
                        }
                    }

                    break;
                default:
                    break;
            }

        }

        poly.end();
        poly.removeDuplicate();
    }

    // https://forum.libcinder.org/topic/smooth-thick-lines-using-geometry-shader#23286000001269127
    // http://www.goodboydigital.com/pixi-webgl-primitives/
    CanvasSubpath.prototype._convertLineToPolygon = (function() {
        var v0 = vec2.create();
        var v1 = vec2.create();
        var v2 = vec2.create();
        var v01 = vec2.create();
        var v12 = vec2.create();
        var normal = vec2.create();
        var tmp = vec2.create();

        var segPoly = [];
        for (var i = 0; i < 4; i++) {
            segPoly[i] = vec2.create();
        }

        return function() {
            var nPoints = 0;
            var len = this.strokeSegments.length;

            for (var i = 0; i < len; i++) {
                var seg = this.strokeSegments[i];
                nPoints += seg.strokeSteps * 6;
            }
            if (
                !this.strokeVerticesArray ||
                this.strokeVerticesArray.length != nPoints * 2
            ) {
                this.strokeVerticesArray = new Float32Array(nPoints * 2);
            }
            var vertices = this.strokeVerticesArray;
            var off = 0;

            var start = this._isClosed ? len - 1 : 0;

            // First segment
            seg = this.strokeSegments[start];
            vec2.set(v0, seg.points[0], seg.points[1]);

            for (var count = 0, i = start; i < len; count++) {

                seg = this.strokeSegments[i];

                switch(seg.type) {
                    case LineSegment.type:
                        if (count == 0) {
                            vec2.set(v1, seg.points[2], seg.points[3]);
                            vec2.copy(v2, v1);
                            vec2.sub(v12, v1, v0);
                            vec2.normalize(v12, v12);
                            if (!this._isClosed) {
                                // Normal of the segment point to the left side
                                vec2.set(normal, v12[1], -v12[0]);
                                var thickness = seg.thickness / 2;
                                vec2.scaleAndAdd(segPoly[0], v0, normal, thickness);
                                vec2.scaleAndAdd(segPoly[1], v0, normal, -thickness);
                            }
                        } else {
                            vec2.set(v2, seg.points[2], seg.points[3]);
                            vec2.copy(v01, v12);
                            vec2.sub(v12, v2, v1);
                            vec2.normalize(v12, v12);
                            // normal of the vertex
                            vec2.set(normal, v01[0] - v12[0], v01[1] - v12[1]);
                            vec2.normalize(normal, normal);
                            // tmp is the normal of v01, point to the left side
                            vec2.set(tmp, v01[1], -v01[0])
                            var cosTheta = vec2.dot(normal, tmp);
                            // Make sure normal is point to the left side of v01
                            if (cosTheta < 0) {
                                vec2.negate(normal, normal);
                                cosTheta = -cosTheta;
                            }
                            var thickness = seg.thickness / cosTheta / 2;
                            vec2.scaleAndAdd(segPoly[2], v1, normal, thickness);
                            vec2.scaleAndAdd(segPoly[3], v1, normal, -thickness);

                            if (i !== 0) {
                                // Construct two triangles of previous segment
                                // 0------2
                                // |  /   |
                                // 1------3
                                vertices[off++] = segPoly[0][0]; vertices[off++] = segPoly[0][1];
                                vertices[off++] = segPoly[1][0]; vertices[off++] = segPoly[1][1];
                                vertices[off++] = segPoly[2][0]; vertices[off++] = segPoly[2][1];

                                vertices[off++] = segPoly[1][0]; vertices[off++] = segPoly[1][1];
                                vertices[off++] = segPoly[3][0]; vertices[off++] = segPoly[3][1];
                                vertices[off++] = segPoly[2][0]; vertices[off++] = segPoly[2][1];
                            }

                            vec2.copy(v0, v1);
                            vec2.copy(v1, v2);
                            vec2.copy(segPoly[0], segPoly[2]);
                            vec2.copy(segPoly[1], segPoly[3]);
                        }

                        break;
                    case BezierCurveSegment.type:
                        var fx = seg.fx, fy = seg.fy;
                        var dfx = seg.dfx, dfy = seg.dfy;
                        var ddfx = seg.ddfx, ddfy = seg.ddfy;
                        var dddfx = seg.dddfx, dddfy = seg.dddfy;

                        var ks = 0;
                        if (count == 0) {
                            fx += dfx; fy += dfy;
                            dfx += ddfx; dfy += ddfy;
                            ddfx += dddfx; ddfy += dddfy;
                            vec2.set(v1, fx, fy);
                            vec2.copy(v2, v1);

                            vec2.sub(v12, v1, v0);
                            vec2.normalize(v12, v12);
                            if (!this._isClosed) {
                                // Normal of the segment point to the left side
                                vec2.set(normal, v12[1], -v12[0]);
                                var thickness = seg.thickness / 2;
                                vec2.scaleAndAdd(segPoly[0], v0, normal, thickness);
                                vec2.scaleAndAdd(segPoly[1], v0, normal, -thickness);
                            }
                            ks = 1;
                        }
                        for (var k = ks; k < seg.strokeSteps; k++) {
                            // normal of the vertex
                            var nx = v01[0] - v12[0];
                            var ny = v01[1] - v12[1];

                            fx += dfx; fy += dfy;
                            dfx += ddfx; dfy += ddfy;
                            ddfx += dddfx; ddfy += dddfy;

                            vec2.set(v2, fx + dfx, fy + dfy);
                            vec2.copy(v01, v12);
                            vec2.sub(v12, v2, v1);
                            vec2.normalize(v12, v12);

                            // Same code with line segment
                            vec2.set(normal, v01[0] - v12[0], v01[1] - v12[1]);
                            vec2.normalize(normal, normal);
                            vec2.set(tmp, v01[1], -v01[0])
                            var cosTheta = vec2.dot(normal, tmp);
                            if (cosTheta < 0) {
                                vec2.negate(normal, normal);
                                cosTheta = -cosTheta;
                            }
                            var thickness = seg.thickness / cosTheta / 2;
                            vec2.scaleAndAdd(segPoly[2], v1, normal, thickness);
                            vec2.scaleAndAdd(segPoly[3], v1, normal, -thickness);

                            if (!((count == 0 && this._isClosed) || (count == 1 && k == ks && this._isClosed))) {
                                vertices[off++] = segPoly[0][0]; vertices[off++] = segPoly[0][1];
                                vertices[off++] = segPoly[1][0]; vertices[off++] = segPoly[1][1];
                                vertices[off++] = segPoly[2][0]; vertices[off++] = segPoly[2][1];

                                vertices[off++] = segPoly[1][0]; vertices[off++] = segPoly[1][1];
                                vertices[off++] = segPoly[3][0]; vertices[off++] = segPoly[3][1];
                                vertices[off++] = segPoly[2][0]; vertices[off++] = segPoly[2][1];
                            }

                            vec2.copy(v0, v1);
                            vec2.copy(v1, v2);
                            vec2.copy(segPoly[0], segPoly[2]);
                            vec2.copy(segPoly[1], segPoly[3]);
                        }
                        break;
                    default:
                        break;
                }
                
                if (this._isClosed) {
                    i = count;
                } else {
                    i++;
                }
            } // end of segments loop

            // Last seg
            if (!this._isClosed) {
                vec2.set(normal, v12[1], -v12[0]);
                vec2.scaleAndAdd(segPoly[2], v2, normal, seg.thickness / 2);
                vec2.scaleAndAdd(segPoly[3], v2, normal, -seg.thickness / 2);
            } else {
                vec2.set(segPoly[2], vertices[0], vertices[1]);
                vec2.set(segPoly[3], vertices[2], vertices[3]);
            }
            vertices[off++] = segPoly[0][0]; vertices[off++] = segPoly[0][1];
            vertices[off++] = segPoly[1][0]; vertices[off++] = segPoly[1][1];
            vertices[off++] = segPoly[2][0]; vertices[off++] = segPoly[2][1];

            vertices[off++] = segPoly[1][0]; vertices[off++] = segPoly[1][1];
            vertices[off++] = segPoly[3][0]; vertices[off++] = segPoly[3][1];
            vertices[off++] = segPoly[2][0]; vertices[off++] = segPoly[2][1];
        }
    })()

    CanvasSubpath.prototype.isValid = function() {
        if (this._nFillSegments > 1) {
            return true;
        } else if (this._nFillSegments == 1) {
            if (this._nFillCurveSegements > 0) {
                return true;
            } else {
                if (this.basePolygon.points.length > 2) {
                    return true;
                }
            }
        }
    }

    // Reverse the orientation
    CanvasSubpath.prototype.reverse = function() {
        mathTool.reverse(this.fillSegments, this._nFillSegments, 1);
        mathTool.reverse(this.strokeSegments, this._nStrokeSegments, 1);

        for (var i = 0; i < this._nStrokeSegments; i++) {
            this.strokeSegments[i].reverse();
        }
    }

    CanvasSubpath.prototype.toStatic = function() {
        this.basePolygon.toStatic();
        this.interiorPolygon.toStatic();

        // Clear segements
        this.fillSegments.length = 0;
        this.strokeSegments.length = 0;
        this.fillCurveSegments.length = 0;
    }


    return CanvasSubpath;
});