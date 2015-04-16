define(function (require) {

    var mathTool = require('./tool/math');
    var glMatrix = require('qtek/dep/glmatrix');
    var vec2 = glMatrix.vec2;

    var TriangulationTool = require('./tool/Triangulation2');
    var triangulation = new TriangulationTool();

    var Polygon = function(autoUpdateBBox) {

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

        this._autoUpdateBBox = autoUpdateBBox;

        if (autoUpdateBBox) {
            this.boundingBox = [vec2.create(), vec2.create()];
        } else {
            this.boundingBox = null;
        }

        this._isStatic = false;
    }

    Polygon.prototype.begin = function(x, y) {
        if (this._isStatic) {
            this._isStatic = false;
            this.points = [];
            this.triangles = [];
        }

        this._nPoints = 0;
        this._isClosed = false;
        this._isEnded = false;


        this.addPoint(x, y);

        this._x0 = this._xi = x;
        this._y0 = this._yi = y;


        if (this._autoUpdateBBox) {
            var bbox = this.boundingBox;
            vec2.set(bbox[0], x, y);
            vec2.set(bbox[1], x, y);   
        }
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

        // Update bounding box
        if (this._autoUpdateBBox) {
            var bbox = this.boundingBox;
            if (x < bbox[0][0]) bbox[0][0] = x;
            if (y < bbox[0][1]) bbox[0][1] = y;
            if (x > bbox[1][0]) bbox[1][0] = x;
            if (y > bbox[1][1]) bbox[1][1] = y;
        }
    }

    // TODO Clipping performance
    Polygon.prototype.triangulate = function() {
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
    }

    Polygon.prototype.checkClose = function(x, y) {
        if (this._nPoints >= 1 && mathTool.approxEqual(x, this._x0) && mathTool.approxEqual(y, this._y0)) {
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

    Polygon.prototype.updateBoundingBox = function() {
        if (!this.boundingBox) {
            this.boundingBox = [vec2.create(), vec2.create()];
        }
        var bbox = this.boundingBox;
        var points = this.points;
        bbox[0][0] = Infinity; bbox[0][1] = Infinity;
        bbox[1][0] = -Infinity; bbox[1][1] = -Infinity;

        for (var i = 0; i < this._nPoints * 2;) {
            var x = points[i++];
            var y = points[i++];
            if (x < bbox[0][0]) bbox[0][0] = x;
            if (y < bbox[0][1]) bbox[0][1] = y;
            if (x > bbox[1][0]) bbox[1][0] = x;
            if (y > bbox[1][1]) bbox[1][1] = y;
        }
    }

    Polygon.prototype.isPointInPolygon = function(x, y) {
        var bbox = this.boundingBox;
        if (bbox[0][0] > x || bbox[1][0] < x || bbox[0][1] > y || bbox[1][1] < y) {
            return false;
        }
    }

    Polygon.prototype.toStatic = function() {
        if (this._isStatic) {
            return;
        }
        this.points = new Float32Array(this.points);
        this.triangles = new Uint32Array(this.triangles);
        this._isStatic = true;
    }

    // Reverse the orientation
    Polygon.prototype.reverse = function() {
        mathTool.reverse(this.points, this._nPoints, 2);
    }

    return Polygon;
});