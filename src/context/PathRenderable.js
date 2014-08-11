define(function(require) {
    
    'use strict';

    var Geometry = require('qtek/Geometry');
    var Material = require('qtek/Material');
    var Shader = require('qtek/Shader');
    var Geometry2D = require('./Geometry2D');
    var CanvasPath = require('./CanvasPath');
    var CanvasElement = require('./CanvasElement');
    var Renderable2D = require('./Renderable2D');
    
    Shader.import(require('text!./shader/path.essl'));

    var pathShader = new Shader({
        vertex : Shader.source('buildin.2d.path.vertex'),
        fragment : Shader.source('buildin.2d.path.fragment')
    });
    pathShader.define('fragment', 'ANTIALIASING');

    var PathRenderable = Renderable2D.derive(function() {
        return {
            geometry : new Geometry2D({
                attributes : {
                    position : new Geometry.Attribute('position', 'float', 3, null, false),
                    // Fill color
                    color : new Geometry.Attribute('position', 'float', 4, null, false),
                    // Transform
                    t0 : new Geometry.Attribute('t0', 'float', 3, null, false),
                    t1 : new Geometry.Attribute('t1', 'float', 3, null, false),
                    // Curve coords of texture space
                    coord : new Geometry.Attribute('coord', 'float', 3, null, false)
                }
            }),
            material : new Material({
                shader : pathShader,
                transparent : true,
                // TODO
                // depthTest should not enabled (Or self intersected path will not drawn properly)
                // But if depth test is disabled, depthMask will also be force disabled
                depthMask : true,
                depthTest : true
            }),
            _paths : [],

            _needsUpdateAll: false
        };
    }, {

        addElement : function(path) {
            this._paths.push(path);
            this._needsUpdateAll = true;
        },

        clearElements : function() {
            this._paths.length = 0;
        },

        updateElements : function() {
            var geo = this.geometry;

            var nVertices = 0;
            for (var i = 0; i < this._paths.length; i++) {
                var path = this._paths[i];
                if (path.hasFill()) {
                    nVertices += this._paths[i].getFillVertexNumber();
                }
                if (path.hasStroke()) {
                    nVertices += this._paths[i].getStrokeVertexNumber();
                }
            }

            var needsUpdateAll = this._needsUpdateAll;
            if (!geo.attributes.position.value || (geo.getVertexNumber() !== nVertices)) {
                // Re allocate
                geo.attributes.position.value = new Float32Array(nVertices * 3);
                geo.attributes.color.value = new Float32Array(nVertices * 4);
                geo.attributes.t0.value = new Float32Array(nVertices * 3);
                geo.attributes.t1.value = new Float32Array(nVertices * 3);
                geo.attributes.coord.value = new Float32Array(nVertices * 3);

                needsUpdateAll = true;
            }

            var offset3 = 0;
            var offset4 = 0;

            var t0Arr = geo.attributes.t0.value;
            var t1Arr = geo.attributes.t1.value;
            var colorArr = geo.attributes.color.value;
            var positionArr = geo.attributes.position.value;
            var coordArr = geo.attributes.coord.value;

            for (var i = 0; i < this._paths.length; i++) {
                var path = this._paths[i];
                var mat = path.transform._array;
                var z = path.depth;
                var alpha = path.drawingStyle.globalAlpha;

                var nFillVertices = 0;
                var nStrokeVertices = 0;
                // -------
                // Fill
                if (path.hasFill()) {
                    nFillVertices = path.getFillVertexNumber();
                    var data = path.getFillVertices();
                    if (data.dirty || needsUpdateAll) {
                        coordArr.set(data.coord, offset3);
                        positionArr.set(data.position, offset3);
                    }
                    // Update z
                    for (var k = offset3 + 2; k < nFillVertices * 3 + offset3; k += 3) {
                        positionArr[k] = z;
                    }

                    if (path._fillColorChanged || needsUpdateAll) {
                        var color = path.drawingStyle.fillStyle;
                        for (var k = 0; k < nFillVertices; k++) {
                            // Set fill style
                            colorArr[offset4++] = color[0];
                            colorArr[offset4++] = color[1];
                            colorArr[offset4++] = color[2];
                            colorArr[offset4++] = color[3] * alpha;
                        }
                    } else {
                        offset4 += nFillVertices * 4;
                    }

                    offset3 += nFillVertices * 3;
                }

                // -------
                // Stroke
                if (path.hasStroke()) {
                    nStrokeVertices = path.getStrokeVertexNumber();
                    var data = path.getStrokeVertices();
                    if (data.dirty || needsUpdateAll) {
                        positionArr.set(data.position, offset3);
                    }
                    if (needsUpdateAll) {
                        for (var k = offset3; k < offset3 + nStrokeVertices * 3;) {
                            coordArr[k++] = 0;
                            coordArr[k++] = 1;
                            coordArr[k++] = 1;
                        }
                    }
                    // Update z
                    for (var k = offset3 + 2; k < offset3 + nStrokeVertices * 3; k += 3) {
                        positionArr[k] = z + 0.002;
                    }

                    if (path._strokeColorChanged || needsUpdateAll) {
                        var color = path.drawingStyle.strokeStyle;
                        for (var k = 0; k < nStrokeVertices; k++) {
                            // Set fill style
                            colorArr[offset4++] = color[0];
                            colorArr[offset4++] = color[1];
                            colorArr[offset4++] = color[2];
                            colorArr[offset4++] = color[3] * alpha;
                        }
                    } else {
                        offset4 += nStrokeVertices * 4;
                    }
                }
                
                offset3 -= nFillVertices * 3;
                // -----
                // Transform
                if (path.transform._dirty || needsUpdateAll) {
                    for (var k = 0; k < nFillVertices + nStrokeVertices; k++) {
                        // Set t0
                        t0Arr[offset3] = mat[0];
                        t0Arr[offset3 + 1] = mat[2];
                        t0Arr[offset3 + 2] = mat[4];
                        // Set t1
                        t1Arr[offset3] = mat[1];
                        t1Arr[offset3 + 1] = mat[3];
                        t1Arr[offset3 + 2] = mat[5];

                        offset3 += 3;
                    }
                } else {
                    offset3 += (nFillVertices + nStrokeVertices) * 3;
                }
            }

            this._needsUpdateAll = false;

            geo.dirty();
        }
    });

    CanvasElement.setRenderableClass(CanvasPath.eType, PathRenderable);

    return PathRenderable;
});