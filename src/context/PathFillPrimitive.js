define(function(require) {
    
    'use strict';

    var Geometry = require('qtek/Geometry');
    var Material = require('qtek/Material');
    var Shader = require('qtek/Shader');
    var Geometry2D = require('./Geometry2D');
    var CanvasPath = require('./CanvasPath');
    var CanvasElement = require('./CanvasElement');
    var Primitive = require('./Primitive');
    
    Shader.import(require('text!./shader/path.essl'));

    var pathShader = new Shader({
        vertex : Shader.source('buildin.2d.path.fill.vertex'),
        fragment : Shader.source('buildin.2d.path.fill.fragment')
    });
    pathShader.define('fragment', 'ANTIALIASING');

    var PathFillPrimitive = Primitive.derive(function() {
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
            for (var i = 0; i < this._paths.length; i++) {
                nVertices += this._paths[i].getFillVertexNumber();
            }

            var forceUpdateAll = false;
            if (!geo.attributes.position.value || (geo.getVertexNumber() !== nVertices)) {
                // Re allocate
                geo.attributes.position.value = new Float32Array(nVertices * 3);
                geo.attributes.color.value = new Float32Array(nVertices * 4);
                geo.attributes.t0.value = new Float32Array(nVertices * 3);
                geo.attributes.t1.value = new Float32Array(nVertices * 3);
                geo.attributes.coord.value = new Float32Array(nVertices * 3);

                forceUpdateAll = true;
            }

            var offset3 = 0;
            var offset4 = 0;

            var t0Arr = geo.attributes.t0.value;
            var t1Arr = geo.attributes.t1.value;
            var colorArr = geo.attributes.color.value;

            for (var i = 0; i < this._paths.length; i++) {
                var path = this._paths[i];
                var nPathVertices = path.getFillVertexNumber();
                var mat = path.transform._array;
                var color = path.drawingStyle.fillStyle;
                var alpha = path.drawingStyle.globalAlpha;

                var data = path.getFillVertices();
                geo.attributes.position.value.set(data.position, offset3);
                geo.attributes.coord.value.set(data.coord, offset3);

                for (var k = 0; k < nPathVertices; k++) {
                    // Set t0
                    t0Arr[offset3] = mat[0];
                    t0Arr[offset3 + 1] = mat[2];
                    t0Arr[offset3 + 2] = mat[4];
                    // Set t1
                    t1Arr[offset3] = mat[1];
                    t1Arr[offset3 + 1] = mat[3];
                    t1Arr[offset3 + 2] = mat[5];
                    // Set fill style
                    colorArr[offset4++] = color[0];
                    colorArr[offset4++] = color[1];
                    colorArr[offset4++] = color[2];
                    colorArr[offset4++] = color[3] * alpha;

                    offset3 += 3;
                }
            }

            geo.dirty();
        }
    });

    CanvasElement.setFillPrimitiveClass(CanvasPath.eType, PathFillPrimitive);

    return PathFillPrimitive;
});