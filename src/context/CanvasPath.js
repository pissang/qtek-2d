define(function(require) {

    'use strict';

    var Matrix2d = require('qtek/math/Matrix2d');

    var DrawingStyle = require('./DrawingStyle');
    var CanvasSubpath = require('./CanvasSubpath');
    var CachedList = require('./tool/CachedList');
    var CanvasElement = require('./CanvasElement');
    var mathTool = require('./tool/math');

    var util = require('../util');

    //
    var ARC_SEG_RADIAN = Math.PI / 4;
    var PI2 = Math.PI * 2;

    var CanvasPath = function() {

        // Element type
        this.eType = CanvasPath.eType;

        // A path has a list of zero or more subpaths.
        // Each subpath consists of a list of one or more points.
        // connected by straight or curved lines.
        // and a flag indicating whether the subpath is closed or not
        // A closed subpath is one where the last point of the subpath
        // is connected to the first point of the subpath by a straight line
        this.subpaths = new CachedList(CanvasSubpath);

        this.drawingStyle = new DrawingStyle();
        this.transform = new Matrix2d();

        // Depth in z
        this.depth = 0;

        this._verticesData = null;

        // Current subpath
        this._subpath = null;

        this._fill = false;
        this._stroke = false;

        this._xi = 0;
        this._yi = 0;
    }
    CanvasPath.prototype = {

        constructor : CanvasPath,

        getHashKey : function() {
            return this.eType;
        },

        moveTo : function(x, y) {
            if (this._subpath) {
                this._endSubpath();
            }
            this._subpath = this._beginSubpath(x, y);

            this._xi = x;
            this._yi = y;
        },

        lineTo : function(x, y, thickness) {
            if (!this._subpath) {
                this._subpath = this._beginSubpath(x, y);
            } else {
                var isClosed = this._subpath.addLine(this._xi, this._yi, x, y, thickness);
                if (isClosed) {
                    // Close the current subpath and begin a new one
                    this._endSubpath();
                }
            }

            this._xi = x;
            this._yi = y;
        },

        bezierCurveTo : function(cp1x, cp1y, cp2x, cp2y, x, y, thickness) {
            if (!this._subpath) {
                this._subpath = this._beginSubpath(x, y);
            } else {
                var isClosed = this._subpath.addCubicBezierCurve(this._xi, this._yi, cp1x, cp1y, cp2x, cp2y, x, y, thickness);
                if (isClosed) {
                    // Close the current subpath and begin a new one
                    this._endSubpath();
                }
            }
            this._xi = x;
            this._yi = y;
        },

        quadraticCurveTo : function(cpx, cpy, x, y, thickness) {
            if (!this._subpath) {
                this._subpath = this._beginSubpath(x, y);
            } else {
                var isClosed = this._subpath.addQuadraticBezierCurve(this._xi, this._yi, cpx, cpy, x, y, thickness);
                if (isClosed) {
                    // Close the current subpath and begin a new one
                    this._endSubpath();
                }
            }
            this._xi = x;
            this._yi = y;
        },

        // PENDING
        arc : function(x, y, r, startAngle, endAngle, anticlockwise, thickness) {
            if (typeof(anticlockwise) == 'undefined') {
                anticlockwise = false;
            }
            // Add a connect line between current point to start point of circle
            var x0 = Math.cos(startAngle);
            var y0 = Math.sin(startAngle);
            var sx = x + r * x0;
            var sy = y + r * y0;
            if (!this._subpath) {
                this._subpath = this._beginSubpath(sx, sy);
                this._xi = sx;
                this._yi = sy;
            }

            if (!(mathTool.approxEqualInt(sx, this._xi) && mathTool.approxEqualInt(sy, this._yi))) {
                this._subpath.addLine(this._xi, this._yi, sx, sy, thickness);
            }
            if (mathTool.approxEqual(startAngle, endAngle)) {
                return;
            }

            // Thresh to [0, 360]
            startAngle = startAngle % PI2;
            endAngle = endAngle % PI2;
            if (startAngle < 0) {
                startAngle = startAngle + PI2;
            }
            if (endAngle < 0) {
                endAngle = endAngle + PI2;
            }
            if (anticlockwise) {
                // Make sure start angle is larger than end angle
                if (startAngle <= endAngle) {
                    endAngle = endAngle - PI2;
                }
            } else {
                // Make sure start angle is smaller than end angle
                if (startAngle >= endAngle) {
                    endAngle = endAngle + PI2;
                }
            }

            // Simulate arc with bezier curve
            // "APPROXIMATION OF A CUBIC BEZIER CURVE BY CIRCULAR ARCS AND VICE VERSA"
            var tmp = endAngle - startAngle;
            var nSeg = Math.ceil(Math.abs(tmp) / ARC_SEG_RADIAN * r / 100);
            if (nSeg < 4) {
                nSeg = 4;
            }
            var gap = tmp / nSeg;

            var start = startAngle;
            var end, x1, y1, x2, y2, x3, y3;
            // tangent x, y
            var tx, ty;
            var tanPhi;
            var k = 0.5522847498;
            for (var i = 0; i < nSeg; i++) {
                end = start + gap;
                if (anticlockwise) {
                    if (end < endAngle) {
                        end = endAngle;
                        gap = end - start;
                    }
                } else {
                    if (end > endAngle) {
                        end = endAngle;
                        gap = end - start;
                    }
                }
                x3 = Math.cos(end);
                y3 = Math.sin(end);

                tanPhi = Math.tan(gap / 2);
                x1 = x0 - k * y0 * tanPhi;
                y1 = y0 + k * x0 * tanPhi;
                x2 = x3 + k * y3 * tanPhi;
                y2 = y3 - k * x3 * tanPhi;

                this._subpath.addCubicBezierCurve(
                    x0 * r + x, y0 * r + y,
                    x1 * r + x, y1 * r + y,
                    x2 * r + x, y2 * r + y,
                    x3 * r + x, y3 * r + y,
                    thickness
                );
                // this._subpath.addLine(x0 * r + x, y0 * r + y, x3 * r + x, y3 * r + y, thickness);

                x0 = x3;
                y0 = y3;
                start = end;
            }

            this._xi = x3 * r + x;
            this._yi = y3 * r + x;
        },

        arcTo : function() {

        },

        begin : function(ctx) {
            this.subpaths.clear();
            this.depth = ctx.requestDepthChannel();
            this._subpath = null;

            this._stroke = this._fill = false;
        },

        end : function(ctx) {
            
            this.drawingStyle.setStrokeStyle(ctx.strokeStyle);
            this.drawingStyle.setFillStyle(ctx.fillStyle);
            
            this.drawingStyle.lineWidth = ctx.lineWidth;

            Matrix2d.copy(this.transform, ctx._transform);

            this._endSubpath();

            this.updateVertices();
        },

        // The stroke() method will trace the intended path, using the CanvasRenderingContext2D object for the line styles.
        stroke : function(ctx) {
            if (this._subpath) {
                // PENDING
                this._endSubpath();
            }
            // TODO
            // The stroke style is affected by the transformation during painting, even if the intended path is the current default path.
            
            // Extract scale
            var m = ctx._transform._array;
            var sx = Math.sqrt(m[0] * m[0] + m[1] * m[1]);
            var sy = Math.sqrt(m[2] * m[2] + m[3] * m[3]);
            var subpaths = this.subpaths.data();
            for (var i = 0; i < this.subpaths.size(); i++) {
                subpaths[i].stroke(sx, sy);
            }

            this._stroke = true;
        },

        // The fill() method will fill all the subpaths of the intended path
        // using fillStyle, and using the non-zero winding number rule. 
        fill : function(ctx) {
            if (this._subpath) {
                this._endSubpath();
            }
            var subpaths = this.subpaths.data();
            for (var i = 0; i < this.subpaths.size(); i++) {
                subpaths[i].fill();
            }

            this._fill = true;
        },

        hasFill : function() {
            return this._fill;
        },

        hasStroke : function() {
            return this._stroke;
        },

        close : function() {
            if (this._subpath) {
                this._subpath.close();
            }
        },

        // Update attributes data
        updateVertices : function() {
            if (!this._verticesData) {
                this._verticesData = {}
            }
            if (this._fill) {
                this._updateFillVertices();
            }
            if (this._stroke) {
                this._updateStrokeVertices();
            }
        },

        _updateFillVertices : function() {
            if (!this._verticesData.fill) {
                this._verticesData.fill = {
                    position : null,
                    color : null,
                    t0 : null,
                    t1 : null,
                    coord : null
                }
            }
            var fillData = this._verticesData.fill;

            var nVertices = 0;
            var subpaths = this.subpaths.data();
            var nSubpaths = this.subpaths.size();
            for (var s = 0; s < this.subpaths.size(); s++) {
                var subpath = subpaths[s];
                if (!subpath._fill) {
                    continue;
                }
                nVertices += subpath.interiorPolygon.triangles.length;
                for (var k = 0; k < subpath.fillCurveSegments.length; k++) {
                    nVertices += subpath.fillCurveSegments[k].triangles.length;
                }
            }

            if (!fillData.position || fillData.position.length !== nVertices * 3) {
                // Re allocate
                fillData.position = new Float32Array(nVertices * 3);
                fillData.color = new Float32Array(nVertices * 4);
                fillData.t0 = new Float32Array(nVertices * 3);
                fillData.t1 = new Float32Array(nVertices * 3);
                fillData.coord = new Float32Array(nVertices * 3);
            }

            var positionArr = fillData.position;
            var colorArr = fillData.color;
            var t0Arr = fillData.t0;
            var t1Arr = fillData.t1;
            var coordArr = fillData.coord;

            var color = this.drawingStyle.fillStyle;
            var alpha = this.drawingStyle.globalAlpha;
            var mat = this.transform._array;
            var z = this.depth;

            var offset3 = 0;
            var offset4 = 0;

            for (var s = 0; s < nSubpaths; s++) {
                var subpath = subpaths[s];
                if (!subpath._fill) {
                    continue;
                }
                var interiorPoly = subpath.interiorPolygon;
                // Add interior triangles
                for (var i = 0; i < interiorPoly.triangles.length; i++) {
                    var idx = interiorPoly.triangles[i];
                    // Set position
                    positionArr[offset3] = interiorPoly.points[idx * 2];
                    positionArr[offset3 + 1] = interiorPoly.points[idx * 2 + 1];
                    positionArr[offset3 + 2] = z;
                    // Set fill style
                    colorArr[offset4] = color[0];
                    colorArr[offset4 + 1] = color[1];
                    colorArr[offset4 + 2] = color[2];
                    colorArr[offset4 + 3] = color[3] * alpha;
                    // Set t0
                    t0Arr[offset3] = mat[0];
                    t0Arr[offset3 + 1] = mat[2];
                    t0Arr[offset3 + 2] = mat[4];
                    // Set t1
                    t1Arr[offset3] = mat[1];
                    t1Arr[offset3 + 1] = mat[3];
                    t1Arr[offset3 + 2] = mat[5];
                    // Coord
                    coordArr[offset3] = 0;
                    coordArr[offset3 + 1] = 1;
                    coordArr[offset3 + 2] = 1;

                    offset3 += 3;
                    offset4 += 4;
                }
                // Add cubic bezier curve triangles
                var curves = subpath.fillCurveSegments;
                for (var i = 0; i < curves.length; i++) {
                    var curve = curves[i];
                    for (var j = 0; j < curve.triangles.length; j++) {
                        var idx = curve.triangles[j];
                        var cps = curve.points;
                        var coords = curve.coords;

                        coordArr[offset3] = coords[idx * 3];
                        coordArr[offset3 + 1] = coords[idx * 3 + 1];
                        coordArr[offset3 + 2] = coords[idx * 3 + 2];

                        // Set position
                        positionArr[offset3] = cps[idx * 2];
                        positionArr[offset3 + 1] = cps[idx * 2 + 1];
                        positionArr[offset3 + 2] = z;
                        // Set fill stylet
                        colorArr[offset4] = color[0];
                        colorArr[offset4 + 1] = color[1];
                        colorArr[offset4 + 2] = color[2];
                        colorArr[offset4 + 3] = color[3] * alpha;
                        // Set t0
                        t0Arr[offset3] = mat[0];
                        t0Arr[offset3 + 1] = mat[2];
                        t0Arr[offset3 + 2] = mat[4];
                        // Set t1
                        t1Arr[offset3] = mat[1];
                        t1Arr[offset3 + 1] = mat[3];
                        t1Arr[offset3 + 2] = mat[5];

                        offset3 += 3;
                        offset4 += 4;
                    }
                }
            }
        },

        _updateStrokeVertices : function() {
            if (!this._verticesData.stroke) {
                this._verticesData.stroke = {
                    position : null,
                    color : null,
                    t0 : null,
                    t1 : null
                }
            }
            var strokeData = this._verticesData.stroke;

            var nVertices = 0;
            var nSubpaths = this.subpaths.size();
            var subpaths = this.subpaths.data();
            for (var s = 0; s < nSubpaths; s++) {
                var subpath = subpaths[s];
                if (!subpath._stroke) {
                    continue;
                }
                nVertices += subpath.strokeVerticesArray.length / 2;
            }

            if (!strokeData.position || strokeData.position.length !== nVertices * 3) {
                // Re allocate
                strokeData.position = new Float32Array(nVertices * 3);
                strokeData.color = new Float32Array(nVertices * 4);
                strokeData.t0 = new Float32Array(nVertices * 3);
                strokeData.t1 = new Float32Array(nVertices * 3);
            }
            var positionArr = strokeData.position;
            var colorArr = strokeData.color;
            var t0Arr = strokeData.t0;
            var t1Arr = strokeData.t1;

            var offset3 = 0;
            var offset4 = 0;

            var color = this.drawingStyle.strokeStyle;
            var alpha = this.drawingStyle.globalAlpha;
            var mat = this.transform._array;
            var z = this.depth;

            var nSubpaths = this.subpaths.size();
            var subpaths = this.subpaths.data();

            for (var s = 0; s < nSubpaths; s++) {
                var subpath = subpaths[s];
                var vertices = subpath.strokeVerticesArray;
                if (!subpath._stroke) {
                    continue;
                }
                for (var i = 0; i < vertices.length / 2; i++) {
                    // Set position
                    positionArr[offset3] = vertices[i * 2];
                    positionArr[offset3 + 1] = vertices[i * 2 + 1];
                    // Add a offset to avoid z conflict
                    positionArr[offset3 + 2] = z + 0.001;
                    // Set fill style
                    colorArr[offset4] = color[0];
                    colorArr[offset4 + 1] = color[1];
                    colorArr[offset4 + 2] = color[2];
                    colorArr[offset4 + 3] = color[3] * alpha;
                    // Set t0
                    t0Arr[offset3] = mat[0];
                    t0Arr[offset3 + 1] = mat[2];
                    t0Arr[offset3 + 2] = mat[4];
                    // Set t1
                    t1Arr[offset3] = mat[1];
                    t1Arr[offset3 + 1] = mat[3];
                    t1Arr[offset3 + 2] = mat[5];

                    offset3 += 3;
                    offset4 += 4;
                }
            }
        },

        getFillVertices : function() {
            return this._verticesData.fill;
        },

        getFillVertexNumber : function() {
            return this._verticesData.fill.position.length / 3;
        },

        getStrokeVertices : function() {
            return this._verticesData.stroke;
        },

        getStrokeVertexNumber : function() {
            return this._verticesData.stroke.position.length / 3;
        },

        _endSubpath : function() {
            // Use current subpath if it is valid
            if (this._subpath) {
                if (this._subpath.isValid()) {
                    this._subpath.end();
                } else {
                    this.subpaths.decrease();
                }
                this._subpath = null;
            }
        },

        _beginSubpath : function(x, y) {
            // Begin a new sub path
            var subpath = this.subpaths.increase();
            subpath.begin(x, y);
            return subpath;
        }
    };

    CanvasPath.eType = CanvasElement.register(CanvasPath, null, null);

    return CanvasPath;
});
