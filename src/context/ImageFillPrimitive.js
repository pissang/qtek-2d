define(function(require) {
    
    'use strict';

    var Geometry = require('qtek/Geometry');
    var Material = require('qtek/Material');
    var Shader = require('qtek/Shader');
    var Geometry2D = require('./Geometry2D');
    var CanvasImage = require('./CanvasImage');
    var CanvasElement = require('./CanvasElement');
    var Primitive = require('./Primitive');

    var glMatrix = require('glmatrix');
    var vec2 = glMatrix.vec2;

    Shader.import(require('text!./shader/image.essl'));

    var imageShader = new Shader({
        vertex : Shader.source('buildin.2d.image.vertex'),
        fragment : Shader.source('buildin.2d.image.fragment')
    });
    imageShader.enableTexture('sprite');

    var ImageFillPrimitive = Primitive.derive(function() {
        return {
            geometry : new Geometry2D({
                attributes : {
                    position : new Geometry.Attribute('position', 'float', 3, null, false),
                    texcoord : new Geometry.Attribute('texcoord', 'float', 2, null, false),
                    t0 : new Geometry.Attribute('t0', 'float', 3, null, false),
                    t1 : new Geometry.Attribute('t1', 'float', 3, null, false)
                }
            }),
            material : new Material({
                shader : imageShader,
                transparent : true,
                depthMask : true,
                depthTest : true
            }),
            _images : []
        };
    }, {

        addElement : function(image) {
            this._images.push(image);
        },

        clearElements : function() {
            this._images.length = 0;
        },

        updateElements : function() {
            if (this._images.length == 0) {
                return;
            }
            var geo = this.geometry;
            var nVertices = this._images.length * 6;

            if (!(geo.attributes.position.value) || (geo.getVertexNumber() !== nVertices)) {
                // Re allocate
                geo.attributes.position.value = new Float32Array(nVertices * 3);
                geo.attributes.texcoord.value = new Float32Array(nVertices * 2);
                geo.attributes.t0.value = new Float32Array(nVertices * 3);
                geo.attributes.t1.value = new Float32Array(nVertices * 3);
            }

            var texture = this._images[0].getTexture();
            this.material.set('sprite', texture);

            var offset3 = 0;
            var offset2 = 0;

            // Sort images from near to far, reduce pixel to draw
            // TODO
            // If image is transparent and overlapped, the result will wrong, many pixels that should be
            // drawn will be discarded
            // this._images.sort(this._sortFunc);

            for (var i = 0; i < this._images.length; i++) {
                var data = this._images[i].getVertices();
                geo.attributes.position.value.set(data.position, offset3);
                geo.attributes.texcoord.value.set(data.texcoord, offset2);
                geo.attributes.t0.value.set(data.t0, offset3);
                geo.attributes.t1.value.set(data.t1, offset3);

                offset3 += data.position.length;
                offset2 += data.texcoord.length;
            }

            geo.dirty();
        },

        _sortFunc : function(a, b) {
            return b.depth - a.depth;
        }
    });

    CanvasElement.setFillPrimitiveClass(CanvasImage.eType, ImageFillPrimitive);

    return ImageFillPrimitive;
})