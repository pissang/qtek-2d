define(function(require) {
    
    'use strict';

    var Geometry = require('qtek/Geometry');
    var Material = require('qtek/Material');
    var Shader = require('qtek/Shader');
    var Mesh = require('qtek/Mesh');
    var Geometry2D = require('./Geometry2D');
    var CanvasPath = require('./CanvasPath');
    var CanvasElement = require('./CanvasElement');
    var LineSegment = require('./LineSegment');
    var BezierCurveSegment = require('./BezierCurveSegment');
    var Renderable2D = require('./Renderable2D');
    
    Shader.import(require('text!./shader/path.essl'));

    var pathShader = new Shader({
        vertex : Shader.source('buildin.2d.path.stroke.vertex'),
        fragment : Shader.source('buildin.2d.path.stroke.fragment')
    });

    var PathStrokeRenderable = Renderable2D.derive(function() {
        return {
            geometry : new Geometry2D({
                attributes : {
                    position : new Geometry.Attribute('position', 'float', 3, null, false),
                    // Fill color
                    color : new Geometry.Attribute('position', 'float', 4, null, false),
                    // Transform
                    t0 : new Geometry.Attribute('t0', 'float', 3, null, false),
                    t1 : new Geometry.Attribute('t1', 'float', 3, null, false)
                }
            }),
            material : new Material({
                shader : pathShader,
                transparent : true,
                depthMask : true,
                depthTest : true
            }),
            lineWidth : 2,
            mode : Mesh.LINE_STRIP,
            _paths : []
        };
    }, {

        addElement : function(path) {
            this._paths.push(path);
        },

        clearElements : function() {
            this._paths.length = 0;
        },

        updateElements : function() {
            var geo = this.geometry;
            var nVertices = 0;
            for (var p = 0; p < this._paths.length; p++) {
                var path = this._paths[p];
                var subpaths = path.subpaths.data();
                for (var s = 0; s < path.subpaths.size(); s++) {
                    var subpath = subpaths[s];
                    if (!subpath._stroke) {
                        continue;
                    }
                    for (var k = 0; k < subpath.strokeSegments.length; k++) {
                        var seg = subpath.strokeSegments[k];
                        nVertices += seg.strokeSteps;
                    }
                    // Add the hidden line to connect subpaths
                    // Add the end vertex of each subpath
                    nVertices += 3;
                }
            }

            if (!(geo.attributes.position.value) || (geo.getVertexNumber() !== nVertices)) {
                // Re allocate
                geo.attributes.position.value = new Float32Array(nVertices * 3);
                geo.attributes.color.value = new Float32Array(nVertices * 4);
                geo.attributes.t0.value = new Float32Array(nVertices * 3);
                geo.attributes.t1.value = new Float32Array(nVertices * 3);
            }

            var positionArr = geo.attributes.position.value;
            var colorArr = geo.attributes.color.value;
            var t0Arr = geo.attributes.t0.value;
            var t1Arr = geo.attributes.t1.value;

            var offset3 = 0;
            var offset4 = 0;

            var x0 = 0, y0 = 0, z0 = 0;
            for (var p = 0; p < this._paths.length; p++) {
                var path = this._paths[p];
                var color = path.drawingStyle.strokeStyle;
                var alpha = path.drawingStyle.globalAlpha;
                var mat = path.transform._array;
                var z = path.depth;

                var subpaths = path.subpaths.data();

                for (var s = 0; s < path.subpaths.size(); s++) {
                    var subpath = subpaths[s];
                    if (!subpath._stroke || subpath.strokeSegments.length == 0) {
                        continue;
                    }
                    var seg = subpath.strokeSegments[0];
                    // Add a hidden line between subpaths
                    // p0
                    positionArr[offset3] = x0;
                    positionArr[offset3 + 1] = y0;
                    positionArr[offset3 + 2] = z0;
                    // p1
                    positionArr[offset3 + 3] = seg.points[0];
                    positionArr[offset3 + 4] = seg.points[1];
                    positionArr[offset3 + 5] = z;
                    for (var k = 0; k < 2; k++) {
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

                    // Add interior triangles
                    var len = subpath.strokeSegments.length;
                    for (var i = 0; i < len; i++) {
                        seg = subpath.strokeSegments[i];
                        switch(seg.type) {
                            case LineSegment.type:
                                // Set position
                                positionArr[offset3] = seg.points[0];
                                positionArr[offset3 + 1] = seg.points[1];
                                // Add a small offset in z to avoid depth conflict
                                positionArr[offset3 + 2] = z + 0.0001;
                                // Set stroke style
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

                                x0 = seg.points[2];
                                y0 = seg.points[3];

                                offset3 += 3;
                                offset4 += 4;
                                break;
                            case BezierCurveSegment.type:
                                // http://antigrain.com/research/bezier_interpolation/index.html#PAGE_BEZIER_INTERPOLATION
                                var fx = seg.fx, fy = seg.fy;
                                var dfx = seg.dfx, dfy = seg.dfy;
                                var ddfx = seg.ddfx, ddfy = seg.ddfy;
                                var dddfx = seg.dddfx, dddfy = seg.dddfy;

                                x0 = fx, y0 = fy;
                                for (var k = 0; k < seg.strokeSteps; k++) {
                                    fx += dfx;
                                    fy += dfy;
                                    dfx += ddfx;
                                    dfy += ddfy;
                                    ddfx += dddfx;
                                    ddfy += dddfy;

                                    // Set position
                                    positionArr[offset3] = x0;
                                    positionArr[offset3 + 1] = y0;
                                    positionArr[offset3 + 2] = z + 0.0001;

                                    // Set stroke style
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

                                    x0 = fx;
                                    y0 = fy;
                                }
                                break;
                            default:
                                break;
                        }
                    } // End of segments loop

                    // Add last point
                    seg = subpath.strokeSegments[len-1];
                    if (seg.type == LineSegment.type) {
                        x0 = seg.points[2];
                        y0 = seg.points[3];
                    } else {
                        x0 = seg.points[6];
                        y0 = seg.points[7];
                    }
                    // Set position
                    positionArr[offset3] = x0;
                    positionArr[offset3 + 1] = y0;
                    positionArr[offset3 + 2] = z;
                    // Set stroke style
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

                } // End of subpath loop

                z0 = z;
            } // End of path loop

            geo.dirty();
        }
    });

    CanvasElement.setStrokeRenderableFactory(CanvasPath.eType, PathStrokeRenderable);

    return PathStrokeRenderable;
});