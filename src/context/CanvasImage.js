define(function(require) {

    var Texture2D = require('qtek/texture/Texture2D');
    var Matrix2d = require('qtek/math/Matrix2d');
    var CanvasElement = require('./CanvasElement');
    var glMatrix = require('glmatrix');
    var vec2 = glMatrix.vec2;

    var _textureCache = [];

    var CacheEntry = function(data) {
        this._data = data;
        this._ref = 0;
    }

    CacheEntry.prototype.reference = function() {
        this._ref++;
        return this._data;
    }

    CacheEntry.prototype.removeReference = function() {
        if (this._ref > 0) {
            this._ref--;
        }
        return this._ref == 0;   
    }

    CacheEntry.prototype.getData = function() {
        return this._data;
    }

    var quadTriangles = [0, 1, 2, 1, 3, 2];

    var CanvasImage = function(image, sx, sy, sw, sh, dx, dy, dw, dh) {
        
        // Element type
        this.eType = CanvasImage.eType;

        this.image = image;

        // Depth in z
        this.depth = 0;

        // WebGL Texture
        this._texture = CanvasImage.getTexture(image);

        this.transform = new Matrix2d();

        // Use two triangles to render image
        // 0-----2
        // |  /  |
        // 1-----3
        var iw = 1 / image.width;
        var ih = 1 / image.height;

        this.quadPositions = [
            vec2.fromValues(dx, dy),
            vec2.fromValues(dx, dy + dh),
            vec2.fromValues(dx + dw, dy),
            vec2.fromValues(dx + dw, dy + dh)
        ];
        this.quadTexcoords = [
            vec2.fromValues(sx * iw, sy * ih),
            vec2.fromValues(sx * iw, (sy + sh) * ih),
            vec2.fromValues((sx + sw) * iw, sy * ih),
            vec2.fromValues((sx + sw) * iw, (sy + sh) * ih)
        ];

        this._verticesData = null;
    }

    CanvasImage.prototype = {

        constructor : CanvasImage,

        begin : function(){},

        end : function(ctx) {
            this.depth = ctx.requestDepthChannel();
            Matrix2d.copy(this.transform, ctx.currentTransform);

            this.updateVertices();
        },

        getTexture : function() {
            return this._texture;
        },

        hasFill : function() {
            return true;
        },

        hasStroke : function() {
            return false;
        },

        dispose : function(ctx) {
            CanvasImage.disposeImage(this.image, ctx.renderer.gl);   
        },

        getHashKey : function() {
            return this.eType + '_' + this.image.__IID__ ;
        },

        updateVertices : function() {

            if (!this._verticesData) {
                this._verticesData = {
                    position : new Float32Array(18),
                    texcoord : new Float32Array(12)
                }
            }

            var positionArr = this._verticesData.position;
            var texcoordArr = this._verticesData.texcoord;

            var z = this.depth;

            var offset3 = 0;
            var offset2 = 0;
            for (var k = 0; k < 6; k++) {
                var idx = quadTriangles[k];
                // Set position
                positionArr[offset3] = this.quadPositions[idx][0];
                positionArr[offset3 + 1] = this.quadPositions[idx][1];
                positionArr[offset3 + 2] = z;
                // Set texcoord
                texcoordArr[offset2] = this.quadTexcoords[idx][0];
                texcoordArr[offset2 + 1] = this.quadTexcoords[idx][1];
                
                offset3 += 3;
                offset2 += 2;
            }
        },

        getVertices : function() {
            return this._verticesData;
        },

        clone : function() {
            
        }
    }

    // Static methods
    CanvasImage.getTexture = function(image) {
        if (
            typeof(image.__IID__) == 'undefined'
            || typeof(_textureCache[image.__IID__]) == 'undefined'
        ) {
            var id = _textureCache.length;
            var texture = new Texture2D();
            texture.image = image;
            texture.flipY = false;
            image.__IID__ = id;

            _textureCache.push(new CacheEntry(texture));
        }

        return _textureCache[image.__IID__].reference();
    }

    CanvasImage.disposeImage = function(image, _gl) {
        if (!image.__IID__) {
            var id = image.__IID__;
            var entry = _textureCache[id];
            if (entry) {
                var isEmpty = entry.removeReference();

                if (isEmpty) {
                    entry.getData().dispose(_gl);

                    // Pop the last entry and put it in the removed position
                    var lastEntry = _textureCache[_textureCache.length - 1];
                    _textureCache[id] = lastEntry;
                    _textureCache.pop();
                    image.__IID__ = id; 
                }
            }
        }
    }

    CanvasImage.eType = CanvasElement.register(CanvasImage, null, null);

    return CanvasImage;
});