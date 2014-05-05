// Polygon triangulation
// TODO Complex shape (edge intersect)
// TODO Hole
define(function(require) {
        
    'use strict'

    var SplayTree = require('./SplayTree');
    var LinkedList = require('qtek/core/LinkedList');
    /****************************
     * Monotone polygon triangulate
     * js port of Poly2Tri(http://sites-final.uclouvain.be/mema/Poly2Tri/)
     * @author pissang(https://github.com/pissang)
     *****************************/

    var REGULAR_DOWN = 1;
    var REGULAR_UP = 2;
    var START = 3;
    var END = 4;
    var MERGE = 5;
    var SPLIT = 6;

    function Edge(p0, p1, points) {
        this.helper = -1;

        this.key = 0;

        this.p0 = p0;
        this.p1 = p1;

        // Cache the x, y instead lookup in the setKey methods
        this.x0 = points[p0 * 2];
        this.y0 = points[p0 * 2 + 1];

        // Vector from p0 to p1
        this.vx = points[p1 * 2] - this.x0;
        this.vy = points[p1 * 2 + 1] - this.y0;

        this.len = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    }

    Edge.prototype.isDiagonal = false;

    Edge.prototype.setKey = function(y) {
        var x0 = this.x0;
        var y0 = this.y0;
        var vx = this.vx;
        var vy = this.vy;

        // TODO
        if (vy == 0) {
            this.key = vx < 0 ? x0 : (x0 + vx);
        } else {
            this.key = (y - y0) * vx / vy + x0;
        }
    }

    Edge.prototype.reverse = function() {
        var tmp = this.p0;
        this.p0 = this.p1;
        this.p1 = tmp;

        this.x0 = this.x0 + this.vx;
        this.y0 = this.y0 + this.vy;
        this.vx = -this.vx;
        this.vy = -this.vy;
    }

    var TriangulationContext = function () {
        // Points is a flatterned array, like [x0, y0, x1, y1]
        this.points = [];
        this.indices = [];
        this.edges = [];

        // Result triangles, [1,2,3, 3,4,5]
        this.triangles = [];

        this._edgeList = new LinkedList();
        this._edgeTree = new SplayTree();
        this._diagonals = [];
        this._pointTypes = [];
        this._nPoints = 0;
        this._startAdjEdgeMap = [];
        this._monoPolygons = [];

        this._nTriangles = 0;

        var self = this;
        // return positive value if i0 > i1
        this.compare = function(i0, i1) {
            // Compare in y axis, if y axis is equal then compare the x axis
            return self.points[i0 * 2 + 1] - self.points[i1 * 2 + 1] || self.points[i0 * 2] - self.points[i1 * 2];
        }

    }

    TriangulationContext.prototype.triangulate = function(_points) {
        this._nPoints = _points.length / 2;
        if (this._nPoints <= 3) {
            return;
        }
        this.points = _points;

        // Linked list of edge is used in searching monotone
        this.edges = [];

        this._diagonals.length = 0;
        this._edgeList.clear();
        this._edgeTree.clear();
        this._startAdjEdgeMap.length = 0;
        this._nTriangles = 0;
        
        var isMonotone = this._preparePoints();

        if (!isMonotone) {
            this._prepareEdges();

            this._partition2Monotone();

            this._searchMonotones();
        } else {
            var polygon = [];
            for (var i = 0; i < this._nPoints; i++) {
                polygon.push(i);
            }
            this._monoPolygons = [polygon];
        }

        this._triangulateMonotones();
        this.triangles.length = this._nTriangles;
    }

    TriangulationContext.prototype._preparePoints = function() {
        var pointType;
        var isMonotone = true;
        var compare = this.compare;
        for (var i = 0; i < this._nPoints; i++) {
            var prev = i > 0 ? i - 1 : this._nPoints - 1;
            var next = i < this._nPoints - 1 ?  i + 1 : 0;

            if (compare(next, i) > 0 && compare(i, prev) > 0) {
                pointType = REGULAR_DOWN;
            } else if (compare(i, prev) < 0 && compare(next, i) < 0) {
                pointType = REGULAR_UP;
            } else {
                var orient = this._isCCW(prev, i, next);
                // Y Axis Down
                if (compare(i, prev) < 0 && compare(i, next) < 0) {
                    pointType = orient ? START : SPLIT;
                } else if (compare(i, prev) > 0 && compare(i, next) > 0) {
                    pointType = orient ? END : MERGE;
                }
                if (pointType == SPLIT || pointType == MERGE) {
                    isMonotone = false;
                }
            }
            this.indices[i] = i;
            this._pointTypes[i] = pointType;
        }

        this.indices.length = this._nPoints;
        this._pointTypes.length = this._nPoints;

        this.indices.sort(compare);

        return isMonotone;
    }

    TriangulationContext.prototype._prepareEdges = function() {
        for (var i = 0; i < this._nPoints-1; i++) {
            var edge = new Edge(i, i+1, this.points);
            this._startAdjEdgeMap[i] = [edge];
            this._addEdge(edge);
        }
        edge = new Edge(i, 0, this.points);
        this._addEdge(edge);
        this._startAdjEdgeMap[i] = [edge];
    }

    TriangulationContext.prototype._partition2Monotone = function() {
        var curr = this.indices[0];
        if (this._pointTypes[curr] != START) {
            throw new Error(errorMsg());
        }

        for (var i = 0; i < this.indices.length; i++) {
            curr = this.indices[i];
            var type = this._pointTypes[curr];
            switch(type) {
                case START:
                    this._handleStart(curr);
                    break;
                case END:
                    this._handleEnd(curr);
                    break;
                case MERGE:
                    this._handleMerge(curr);
                    break;
                case SPLIT:
                    this._handleSplit(curr);
                    break;
                case REGULAR_UP:
                    this._handleRegularUp(curr);
                    break;
                case REGULAR_DOWN:
                    this._handleRegularDown(curr);
                    break;
                default:
                    throw new Error(errorMsg());
            }
        }
    }

    TriangulationContext.prototype._searchMonotones = function() {
        this._monoPolygons.length = 0;
        var len = this._diagonals.length;
        var self = this;

        while(this._edgeList._length > len) {
            this._monoPolygons.push(this._searchMonotone(this._edgeList.head.value));
        }
    }

    TriangulationContext.prototype._searchMonotone = function(edge) {
        var polygon = [];
        var start = edge.p0;
        polygon.push(start);
        var p1 = edge.p1;
        while (true) {
            if (!edge.isDiagonal) {
                this._edgeList.remove(edge.__linkedListItem);
                this._startAdjEdgeMap[edge.p0].splice(this._startAdjEdgeMap[edge.p0].indexOf(edge), 1);
            }
            if (p1 == start) {
                break;
            }
            polygon.push(p1);
            edge = this._findNextEdge(p1, edge);
            if (!edge) {
                throw new Error(errorMsg);
            }
            if (edge.p0 != p1) {
                edge.reverse();
            }
            p1 = edge.p1;
        }

        return polygon
    }

    TriangulationContext.prototype._findNextEdge = function(p1, prevEdge) {
        // Find next edge
        var edges = this._startAdjEdgeMap[p1];
        if (edges.length == 1) {
            return edges[0];
        } else {
            var nextEdgeCCW = null;
            var nextEdgeCW = null;
            var max = -2.0;
            var min = 2.0;
            for (var i = 0; i < edges.length; i++) {
                var edge = edges[i];
                // Its a diagonal
                if (edge == prevEdge) {
                    continue;
                }
                if (edge.p0 != p1) {
                    edge.reverse();
                }
                var orient = this._isCCW2(prevEdge, edge);
                var cosb = this._angleCos(prevEdge, edge);
                if (orient && cosb > max) {
                    nextEdgeCCW = edge;
                    max = cosb;
                } else if (min > cosb) {
                    nextEdgeCW = edge;
                    min = cosb;
                }
            }

            return nextEdgeCCW || nextEdgeCW;
        }
    }

    TriangulationContext.prototype._triangulateMonotones = function() {
        var nPoly = this._monoPolygons.length;
        var triangles = this.triangles;
        var isLeft = [];
        for (var i = 0; i < this._nPoints; i++) {
            isLeft.push(false);
        }

        for (var j = 0; j < nPoly; j++) {
            var polygon = this._monoPolygons[j];
            var stack = [];
            for (var i = 0; i < polygon.length - 1; i++) {
                var p0 = polygon[i];
                var p1 = polygon[i+1];
                isLeft[p0] = this.compare(p1, p0) > 0;
            }
            p0 = polygon[i];
            p1 = polygon[0];
            isLeft[p0] = this.compare(p1, p0) > 0;

            if (nPoly == 1) {
                var indices = this.indices;
            } else {
                // PENDING slice ?
                indices = polygon.slice();
                indices.sort(this.compare);
            }
            stack.push(indices[0])
            stack.push(indices[1]);
            for (var i = 2; i < indices.length - 1; i++) {
                var encounter = indices[i];
                var stackTop = stack[stack.length - 1];
                if (isLeft[encounter] !== isLeft[stackTop]) {
                    while(stack.length > 1) {
                        var p1 = stack.pop();
                        var p2 = stack[stack.length - 1];
                        triangles[this._nTriangles++] = encounter;
                        triangles[this._nTriangles++] = p1;
                        triangles[this._nTriangles++] = p2;
                    }
                    stack.pop();
                    // http://jsperf.com/push-multi-vs-multi-push
                    stack.push(stackTop);
                    stack.push(encounter);
                } else {
                    // PENDING
                    while(stack.length > 1) {
                        var p1 = stack[stack.length - 1];
                        var p2 = stack[stack.length - 2];

                        var isCCW = this._isCCW(encounter, p2, p1);
                        if ((isCCW && isLeft[p1]) || (!isCCW && !isLeft[p1])) {
                            triangles[this._nTriangles++] = encounter;
                            triangles[this._nTriangles++] = p2;
                            triangles[this._nTriangles++] = p1;
                            stack.pop();
                        } else {
                            break;
                        }
                    }

                    stack.push(encounter);
                }
            }
            // Last point
            var lastPoint = indices[i];
            while(stack.length > 1) {
                var p1 = stack.pop();
                var p2 = stack[stack.length-1];
                triangles[this._nTriangles++] = lastPoint;
                triangles[this._nTriangles++] = p1;
                triangles[this._nTriangles++] = p2;
            }
        }
    }

    TriangulationContext.prototype._handleStart = function(idx) {
        var y = this.points[idx * 2 + 1];
        // PENDING
        this._updateEdgeKey(this._edgeTree.root_, y);

        var edge = this.edges[idx];
        edge.helper = idx;
        edge.setKey(y);
        this._edgeTree.insert(edge.key, edge);
    }

    TriangulationContext.prototype._handleEnd = function(idx) {
        var y = this.points[idx * 2 + 1];
        // PENDING
        this._updateEdgeKey(this._edgeTree.root_, y);

        var prev = idx > 0 ? idx - 1 : this._nPoints - 1;
        var edge = this.edges[prev];
        var helper = edge.helper;
        if (this._pointTypes[helper] == MERGE) {
            this._addDiagonal(idx, helper);
        }

        this._edgeTree.remove(edge.key);
    }

    TriangulationContext.prototype._handleSplit = function(idx) {
        var x = this.points[idx * 2];
        var y = this.points[idx * 2 + 1];

        // PENDING
        this._updateEdgeKey(this._edgeTree.root_, y);

        var leftEdge = this._edgeTree.findGreatestLessThan(x).value;
        var helper = leftEdge.helper;

        this._addDiagonal(idx, helper);

        leftEdge.helper = idx;
        var edge = this.edges[idx];
        edge.helper = idx;
        edge.setKey(y);
        this._edgeTree.insert(edge.key, edge);
    }


    TriangulationContext.prototype._handleMerge = function(idx) {
        var x = this.points[idx * 2];
        var y = this.points[idx * 2 + 1];

        // PENDING
        this._updateEdgeKey(this._edgeTree.root_, y);

        var prev = idx > 0 ? idx - 1 : this._nPoints - 1;
        var edge = this.edges[prev];
        var helper = edge.helper;
        if (this._pointTypes[helper] == MERGE) {
            this._addDiagonal(idx, helper);
        }
        this._edgeTree.remove(edge.key);

        var leftEdge = this._edgeTree.findGreatestLessThan(x).value;
        helper = leftEdge.helper;
        if (this._pointTypes[helper] == MERGE) {
            this._addDiagonal(idx, helper);
        }
        leftEdge.helper = idx;
    }

    TriangulationContext.prototype._handleRegularUp = function(idx) {
        var x = this.points[idx * 2];
        var y = this.points[idx * 2 + 1];

        // PENDING
        this._updateEdgeKey(this._edgeTree.root_, y);

        var leftEdge = this._edgeTree.findGreatestLessThan(x).value;
        var helper = leftEdge.helper;
        if (this._pointTypes[helper] == MERGE) {
            this._addDiagonal(idx, helper);
        }

        leftEdge.helper = idx;
    }

    TriangulationContext.prototype._handleRegularDown = function(idx) {
        var y = this.points[idx * 2 + 1];

        // PENDING
        this._updateEdgeKey(this._edgeTree.root_, y);

        var prev = idx > 0 ? idx - 1 : this._nPoints - 1;
        var edge = this.edges[prev];
        var helper = edge.helper;

        if (this._pointTypes[helper] == MERGE) {
            this._addDiagonal(idx, helper);
        }

        this._edgeTree.remove(edge.key);

        var edge = this.edges[idx];
        edge.helper = idx;
        edge.setKey(y);
        this._edgeTree.insert(edge.key, edge);
    }

    TriangulationContext.prototype._addEdge = function(edge) {
        this.edges.push(edge);
        var item = this._edgeList.insert(edge);
        // Save the item in linked list for fast remove
        edge.__linkedListItem = item;
    }

    TriangulationContext.prototype._addDiagonal = function(p0, p1) {
        var edge = new Edge(p0, p1, this.points);
        this._addEdge(edge);

        edge.isDiagonal = true;
        // For two splitted polygons
        this._startAdjEdgeMap[p0].push(edge);
        this._startAdjEdgeMap[p1].push(edge);

        this._diagonals.push(edge);
    }

    TriangulationContext.prototype._isCCW = function(i0, i1, i2) {
        var ax = this.points[i0 * 2];
        var ay = this.points[i0 * 2 + 1];
        var bx = this.points[i1 * 2];
        var by = this.points[i1 * 2 + 1];
        var cx = this.points[i2 * 2];
        var cy = this.points[i2 * 2 + 1];
        
        return (ay - by) * (cx - bx) + (bx - ax) * (cy - by) < 0;
    }

    TriangulationContext.prototype._isCCW2 = function(e0, e1) {
        // y is inversed
        return e0.vx * e1.vy - e0.vy * e1.vx < 0;
    }

    TriangulationContext.prototype._angleCos = function(e0, e1) {
        return -(e0.vx / e0.len * e1.vx / e1.len + e0.vy / e0.len * e1.vy / e1.len);
    }

    TriangulationContext.prototype._updateEdgeKey = function(current, y) {
        while (current) {
            var left = current.left;
            if (left) {
                this._updateEdgeKey(left, y);
            }
            current.value.setKey(y);
            current.key = current.value.key;
            current = current.right;
        }
    }

    function errorMsg() {
        return [
            'Please check your input polygon:',
            '1)orientations?',
            '2)with duplicated points?',
            '3)is a simple one?'
        ].join('\n');
    }

    return TriangulationContext;
})