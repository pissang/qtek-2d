define(function (require) {

    var mathTool = require('./tool/math');

    var TriangulationTool = require('./tool/Triangulation2');
    var triangulation = new TriangulationTool();

    // var ClipperLib = require('ClipperLib');

    var Polygon = function() {

        this.points = [];

        this.triangles = [];

        this._nPoints = 0;

        this._isClosed = false;

        this._isEnded = false;

        // Start point
        this._x0 = 0;
        this._y0 = 0;
        // Current point
        this._xi = 1;
        this._yi = 1;
    }

    Polygon.prototype.begin = function(x, y) {
        
        this._nPoints = 0;
        this._isClosed = false;
        this._isEnded = false;

        this.addPoint(x, y);

        this._x0 = this._xi = x;
        this._y0 = this._yi = y;
    }

    Polygon.prototype.end = function() {
        if (this._isEnded) {
            return;
        }

        this.points.length = this._nPoints * 2;

        this._isEnded = true;
    }


    Polygon.prototype.addPoint = function(x, y) {

        var n = this._nPoints * 2;

        this.points[n] = x;
        this.points[n + 1] = y;

        this._xi = x;
        this._yi = y;

        this._nPoints++;
    }

    // TODO Clipping performance
    Polygon.prototype.triangulate = function() {
        // var path = [];
        // for (var i = 0; i < this._nPoints * 2;) {
        //     path.push(new ClipperLib.IntPoint(this.points[i++], this.points[i++]));
        // }
        // var paths = ClipperLib.Clipper.SimplifyPolygon(path, ClipperLib.PolyFillType.pftNonZero);
        
        // if (paths.length > 1) {
        //     var triangles = [];
        //     var points = [];
        //     var nPoint = 0;
        //     var offset = 0;
        //     this._nPoints = 0;
        //     this.triangles.length = 0;
        //     for (var p = 0; p < paths.length; p ++) {
        //         var path = paths[p];
        //         var len = path.length;
        //         n = 0;
        //         for (var i = 0; i < len; i++) {
        //             points[n++] = path[i].X;
        //             points[n++] = path[i].Y;
        //         }
        //         points.length = n;

        //         if (!mathTool.isCCW(points)) {
        //             mathTool.reverse(points, len, 2);
        //         }
        //         triangulation.triangles = triangles;
        //         triangulation.triangulate(points);

        //         for (var k = 0; k < len; k++) {
        //             this.points[this._nPoints * 2] = points[k * 2];
        //             this.points[this._nPoints * 2 + 1] = points[k * 2 + 1];
        //             this._nPoints++;
        //         }

        //         for (var k = 0; k < triangles.length; k++) {
        //             this.triangles.push(triangles[k] + offset);
        //         }
        //         offset += len;
        //     }

        //     this.points.length = this._nPoints * 2;
            
        // } else {
        // 
        if (this._nPoints < 3) {
            return;
        } else if (this._nPoints == 3) {
            this.triangles[0] = 0;
            this.triangles[1] = 1;
            this.triangles[2] = 2;
            this.triangles.length = 3;
        } else {
            triangulation.triangles = this.triangles;
            triangulation.triangulate(this.points);

            this.points = triangulation.points;
            this._nPoints = this.points.length / 2; 
        }
        // }
    }

    Polygon.prototype.checkClose = function(x, y) {
        if (this._nPoints >= 1 && mathTool.approxEqualInt(x, this._x0) && mathTool.approxEqualInt(y, this._y0)) {
            this._isClosed = true;
            return true;
        }
        return false;
    }

    Polygon.prototype.isCCW = function() {
        return mathTool.area(this.points) < 0;
    }

    Polygon.prototype.area = function() {
        return mathTool.area(this.points);
    }

    // Make sure not having duplicate neighbour points
    Polygon.prototype.removeDuplicate = function() {
        var points = this.points;
        var n = this._nPoints * 2;
        for (var i = 0; i < n;) {
            x0 = points[i], y0 = points[i + 1];
            x1 = points[(i + 2) % n], y1 = points[(i + 3) % n];
            if(mathTool.approxEqualInt(x0, x1) && mathTool.approxEqualInt(y0, y1)) {
                points.splice(i, 2);
                this._nPoints --;
                n -= 2;
            } else {
                i += 2;
            }
        }

    }

    // Reverse the orientation
    Polygon.prototype.reverse = function() {
        mathTool.reverse(this.points, this._nPoints, 2);
    }

    return Polygon;
});