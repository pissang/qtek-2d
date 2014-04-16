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
            
            _images : [],

            _inDescendantOrder: false
        };
    }, {

        addElement : function(image) {
            this._images.push(image);
        },

        clearElements : function() {
            this._images.length = 0;
            this._inDescendantOrder = false;
        },

        updateElements : function(disableBlending) {
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

            var t0Arr = geo.attributes.t0.value;
            var t1Arr = geo.attributes.t1.value;

            // Reverse images list from near to far
            // Simply do reverse not sort because the elements will be always add by painters in 
            // far to near order
            // 
            // TODO
            // If image is transparent and overlapped, the result will wrong, many pixels that should be
            // drawn will be discarded
            if (disableBlending && !this._inDescendantOrder) {
                for (var i = 0, len = this._images.length; i < Math.floor(len / 2); i++) {
                    var i2 = len - 1;
                    var tmp = this._images[i];
                    this._images[i] = this._images[i2];
                    this._images[i2] = tmp;
                }
                this._inDescendantOrder = true;
            }

            for (var i = 0; i < this._images.length; i++) {
                var image = this._images[i];
                var mat = image.transform._array;
                var data = image.getVertices();
                geo.attributes.position.value.set(data.position, offset3);
                geo.attributes.texcoord.value.set(data.texcoord, offset2);

                for (var k = 0; k < 6; k++) {
                    // Set t0
                    t0Arr[offset3] = mat[0];
                    t0Arr[offset3 + 1] = mat[2];
                    t0Arr[offset3 + 2] = mat[4];
                    // Set t1
                    t1Arr[offset3] = mat[1];
                    t1Arr[offset3 + 1] = mat[3];
                    t1Arr[offset3 + 2] = mat[5];

                    offset3 += 3;
                    offset2 += 2;
                }
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