// Deferred Painter only support path and image(text) rendering
define(function(require) {

    'use strict';

    var Base = require('qtek/core/Base');
    var Shader = require('qtek/Shader');
    var Material = require('qtek/Material');
    var Pass = require('qtek/compositor/Pass');
    var FrameBuffer = require('qtek/FrameBuffer');
    var glinfo = require('qtek/core/glinfo');
    var Texture2D = require('qtek/texture/Texture2D');
    var Matrix2d = require('qtek/math/Matrix2d');
    var Matrix4 = require('qtek/math/Matrix4');

    var CachedList = require('./tool/CachedList');

    var CachedList = require('./tool/CachedList');
    var CanvasElement = require('./CanvasElement');
    var PathFillPrimitive = require('./PathFillPrimitive');
    var PathStrokePrimitive = require('./PathStrokePrimitive');
    var ImageFillPrimitive = require('./ImageFillPrimitive');
    var CanvasPath  = require('./CanvasPath');
    var CanvasImage = require('./CanvasImage');
    var ImageAtlas = require('./tool/ImageAtlas');

    Shader.import(require('text!./shader/deferred/blend.essl'));
    Shader.import(require('text!./shader/deferred/depth.essl'));

    var depthShader = new Shader({
        vertex : Shader.source('buildin.2d.deferred.depth.vertex'),
        fragment : Shader.source('buildin.2d.deferred.depth.fragment')
    });

    var depthMaterial = new Material({
        shader: depthShader
    });

    var blendPass = new Pass({
        fragment : Shader.source('buildin.2d.deferred.blend')
    });

    var DeferredPainter = Base.derive(function() {
        return {
            transform : new Matrix2d(),

            _gl : null,

            _elements : [],

            _pathPrimitives : [],

            _imagePrimitives : [],

            _textAtlas : new CachedList(ImageAtlas, 2),

            _imageFillPrimitiveList: new CachedList(ImageFillPrimitive),

            _pathFillPrimitiveList: new CachedList(PathFillPrimitive, 2),
            _pathStrokePrimitiveList: new CachedList(PathStrokePrimitive, 2),

            _pathColorTexture : null,
            _pathDepthTexture : null,

            _imageColorTexture : null,
            _imageDepthTexture : null,

            frameBuffer : new FrameBuffer(),

            _blendFunc : null
        }
    }, {

        addElement : function(el) {
            this._elements.push(el);
        },

        draw : function(ctx) {
            var _gl = ctx.renderer.gl;
            this._gl = _gl;

            _gl.depthMask(true);
            _gl.enable(_gl.BLEND);

            for (var i = 0; i < this._pathPrimitives.length; i++) {
                Matrix4.fromMat2d(this._pathPrimitives[i].worldTransform, this.transform);
                this._pathPrimitives[i].material.blend = this._blendFunc;
            }
            for (var i = 0; i < this._imagePrimitives.length; i++) {
                Matrix4.fromMat2d(this._imagePrimitives[i].worldTransform, this.transform);
                this._imagePrimitives[i].material.blend = this._blendFunc;
            }

            if (this._pathPrimitives.length == 0 || this._imagePrimitives.length == 0) {
                if (this._pathPrimitives.length > 0) {
                    ctx.renderer.renderQueue(this._pathPrimitives, ctx.camera);
                }
                if (this._imagePrimitives.length > 0) {
                    ctx.renderer.renderQueue(this._imagePrimitives, ctx.camera);
                }
            } else {
                var useDepthTexture = glinfo.getExtension(_gl, 'WEBGL_depth_texture');
                // var useDepthTexture = false;

                this._pathColorTexture = this._checkTexture(this._pathColorTexture, ctx);
                this._pathDepthTexture = this._checkTexture(this._pathDepthTexture, ctx);
                this._imageColorTexture = this._checkTexture(this._imageColorTexture, ctx);
                this._imageDepthTexture = this._checkTexture(this._imageDepthTexture, ctx);

                if (useDepthTexture) {
                    this._pathDepthTexture.format = _gl.DEPTH_COMPONENT;
                    this._pathDepthTexture.type = _gl.UNSIGNED_SHORT;
                    this._imageDepthTexture.format = _gl.DEPTH_COMPONENT;
                    this._imageDepthTexture.type = _gl.UNSIGNED_SHORT;
                }
                
                // Render path elements
                this.frameBuffer.attach(_gl, this._pathColorTexture);
                if (useDepthTexture) {
                    this.frameBuffer.attach(_gl, this._pathDepthTexture, _gl.DEPTH_ATTACHMENT);
                }
                this.frameBuffer.bind(ctx.renderer);

                _gl.clear(_gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT);
                ctx.renderer.renderQueue(this._pathPrimitives, ctx.camera);
                if (!useDepthTexture) {
                    this.frameBuffer.attach(_gl, this._pathDepthTexture);
                    _gl.clear(_gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT);
                    ctx.renderer.renderQueue(this._pathPrimitives, ctx.camera, depthMaterial);
                }

                // Render image elemnts
                this.frameBuffer.attach(_gl, this._imageColorTexture);
                if (useDepthTexture) {
                    this.frameBuffer.attach(_gl, this._imageDepthTexture, _gl.DEPTH_ATTACHMENT);
                }
                _gl.clear(_gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT);
                ctx.renderer.renderQueue(this._imagePrimitives, ctx.camera);

                if (!useDepthTexture) {
                    this.frameBuffer.attach(_gl, this._imageDepthTexture);
                    _gl.clear(_gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT);
                    ctx.renderer.renderQueue(this._imagePrimitives, ctx.camera, depthMaterial);
                }

                this.frameBuffer.unbind(ctx.renderer);

                _gl.depthMask(false);
                _gl.disable(_gl.DEPTH_TEST)
                blendPass.setUniform('color1', this._pathColorTexture);
                blendPass.setUniform('depth1', this._pathDepthTexture);
                blendPass.setUniform('color2', this._imageColorTexture);
                blendPass.setUniform('depth2', this._imageDepthTexture);
                blendPass.material.depthTest = false;
                blendPass.material.depthMask = false;
                blendPass.material.transparent = true;
                if (useDepthTexture) {
                    blendPass.material.shader.unDefine('fragment', 'DEPTH_DECODE')
                } else {
                    blendPass.material.shader.define('fragment', 'DEPTH_DECODE')
                }
                ctx.renderer.clear = 0;
                blendPass.render(ctx.renderer);
                ctx.renderer.clear = _gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT;
            }

            // FRESH all elements after draw
            for (var i = 0; i < this._elements.length; i++) {
                // TODO After draw is strangely slow
                this._elements[i].afterDraw();
            }
        },

        _checkTexture : function(texture, ctx) {
            if (
                !texture 
                || texture.width !== ctx.renderer.width
                || texture.height !== ctx.renderer.height
            ) {
                if (texture) {
                    texture.dispose(ctx.renderer.gl);
                }

                texture = new Texture2D({
                    width : ctx.renderer.width,
                    height : ctx.renderer.height,
                    minFilter : ctx.renderer.gl.NEAREST,
                    magFilter : ctx.renderer.gl.NEAREST
                });
            }
            return texture;
        },

        repaint : function(ctx) {
            for (var i = 0; i < this._pathPrimitives.length; i++) {
                this._pathPrimitives[i].updateElements();
            }
            for (var i = 0; i < this._imagePrimitives.length; i++) {
                this._imagePrimitives[i].updateElements();
            }

            this.draw(ctx);
        },

        setBlendFunc : function(func) {
            this._blendFunc = func;
        },

        begin : function() {
            
            this.beginTextAtlas();

            for (var i = 0; i < this._pathPrimitives.length; i++) {
                this._pathPrimitives[i].clearElements();
            }
            for (var i = 0; i < this._imagePrimitives.length; i++) {
                this._imagePrimitives[i].clearElements();
            }
            this._pathPrimitives.length = 0;
            this._elements.length = 0;

            this._imageFillPrimitiveList.clear(this._disposePrimitive);
            this._pathFillPrimitiveList.clear(this._disposePrimitive);
            this._pathStrokePrimitiveList.clear(this._disposePrimitive);
        },

        end : function() {
            // this._elements.sort(this._eleDepthSortFunc);

            var pathFillPrimitive;
            var pathStrokePrimitive;
            var imageFillPrimitive;
            var imageHashKey = null;
            for (var i = 0; i < this._elements.length; i++) {
                var el = this._elements[i];

                switch(el.eType) {
                    case CanvasImage.eType:
                        var key = el.getHashKey();
                        if (imageHashKey !== key) {
                            imageHashKey = key;
                            imageFillPrimitive = this._imageFillPrimitiveList.increase();
                            this._imagePrimitives.push(imageFillPrimitive);
                        }
                        imageFillPrimitive.addElement(el);
                        break;
                    case CanvasPath.eType:
                        if (el.hasFill()) {
                            if (!pathFillPrimitive) {
                                pathFillPrimitive = this._pathFillPrimitiveList.increase();
                                this._pathPrimitives.push(pathFillPrimitive);
                            }
                            pathFillPrimitive.addElement(el);
                        }
                        if (el.hasStroke()) {
                            if (!pathStrokePrimitive) {
                                pathStrokePrimitive = this._pathStrokePrimitiveList.increase();
                                this._pathPrimitives.push(pathStrokePrimitive);
                            }
                            pathStrokePrimitive.addElement(el);
                        }
                        break;
                    default:
                        console.warn('Deferred painter only support CanvasImage and CanvasPath');
                }
            }

            for (var i = 0; i < this._pathPrimitives.length; i++) {
                this._pathPrimitives[i].updateElements();
            }
            for (var i = 0; i < this._imagePrimitives.length; i++) {
                this._imagePrimitives[i].updateElements();
            }
        },

        beginTextAtlas : function() {
            this._textAtlas.clear(this._disposeImageAtlas);
        },

        getNewTextAtlas : function() {
            var textAtlas = this._textAtlas.increase();
            textAtlas.clear();

            return textAtlas;
        },

        dispose : function() {
            this.begin();
        },

        _disposePrimitive : function(primitive) {
            primitive.geometry.dispose(this._gl);
        },

        _disposeImageAtlas : function(imageAtlas) {
            imageAtlas.dispose(this._gl);
        },

        _eleDepthSortFunc : function(a, b) {
            // Sort in ascendant order
            // Draw from far to near
            return a.depth - b.depth;
        }
    });

    return DeferredPainter;
});