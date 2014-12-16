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

    var CanvasElement = require('./CanvasElement');
    var PathRenderable = require('./PathRenderable');
    var ImageRenderable = require('./ImageRenderable');
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

            ctx : null,

            _elements : [],

            _pathRenderables : [],

            _imageRenderables : [],

            _textAtlas : new CachedList(ImageAtlas, 2),

            _imageRenderableList: new CachedList(ImageRenderable),

            _pathRenderableList: new CachedList(PathRenderable, 2),

            _pathColorTexture : null,
            _pathDepthTexture : null,

            _imageColorTexture : null,
            _imageDepthTexture : null,

            frameBuffer : new FrameBuffer(),

            _blendFunc : null
        }
    }, {

        addElement : function(el) {
            el.depth = this.ctx.requestDepthChannel();
            this._elements.push(el);
        },

        getElements : function() {
            return this._elements;
        },

        draw : function() {
            var ctx = this.ctx;
            var _gl = ctx.renderer.gl

            _gl.depthMask(true);
            _gl.enable(_gl.BLEND);

            for (var i = 0; i < this._pathRenderables.length; i++) {
                Matrix4.fromMat2d(this._pathRenderables[i].worldTransform, this.transform);
                this._pathRenderables[i].material.blend = this._blendFunc;
            }
            for (var i = 0; i < this._imageRenderables.length; i++) {
                Matrix4.fromMat2d(this._imageRenderables[i].worldTransform, this.transform);
                this._imageRenderables[i].material.blend = this._blendFunc;
            }

            if (this._pathRenderables.length == 0 || this._imageRenderables.length == 0) {
                if (this._pathRenderables.length > 0) {
                    ctx.renderer.renderQueue(this._pathRenderables, ctx.camera);
                }
                if (this._imageRenderables.length > 0) {
                    ctx.renderer.renderQueue(this._imageRenderables, ctx.camera);
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
                ctx.renderer.renderQueue(this._pathRenderables, ctx.camera);
                if (!useDepthTexture) {
                    this.frameBuffer.attach(_gl, this._pathDepthTexture);
                    _gl.clear(_gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT);
                    ctx.renderer.renderQueue(this._pathRenderables, ctx.camera, depthMaterial);
                }

                // Render image elemnts
                this.frameBuffer.attach(_gl, this._imageColorTexture);
                if (useDepthTexture) {
                    this.frameBuffer.attach(_gl, this._imageDepthTexture, _gl.DEPTH_ATTACHMENT);
                }
                _gl.clear(_gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT);
                ctx.renderer.renderQueue(this._imageRenderables, ctx.camera);

                if (!useDepthTexture) {
                    this.frameBuffer.attach(_gl, this._imageDepthTexture);
                    _gl.clear(_gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT);
                    ctx.renderer.renderQueue(this._imageRenderables, ctx.camera, depthMaterial);
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

        repaint : function() {
            for (var i = 0; i < this._pathRenderables.length; i++) {
                this._pathRenderables[i].updateElements();
            }
            for (var i = 0; i < this._imageRenderables.length; i++) {
                this._imageRenderables[i].updateElements();
            }

            this.draw();
        },

        setBlendFunc : function(func) {
            this._blendFunc = func;
        },

        begin : function() {
            
            this.beginTextAtlas();

            for (var i = 0; i < this._pathRenderables.length; i++) {
                this._pathRenderables[i].clearElements();
            }
            for (var i = 0; i < this._imageRenderables.length; i++) {
                this._imageRenderables[i].clearElements();
            }
            this._pathRenderables.length = 0;
            this._elements.length = 0;

            this._imageRenderableList.clear(this._disposeRenderable);
            this._pathRenderableList.clear(this._disposeRenderable);
        },

        end : function() {
            // this._elements.sort(this._eleDepthSortFunc);

            var pathRenderable;
            var imageRenderable;
            var imageHashKey = null;
            for (var i = 0; i < this._elements.length; i++) {
                var el = this._elements[i];

                switch(el.eType) {
                    case CanvasImage.eType:
                        var key = el.getHashKey();
                        if (imageHashKey !== key) {
                            imageHashKey = key;
                            imageRenderable = this._imageRenderableList.increase();
                            this._imageRenderables.push(imageRenderable);
                        }
                        imageRenderable.addElement(el);
                        break;
                    case CanvasPath.eType:
                        if (!pathRenderable) {
                            pathRenderable = this._pathRenderableList.increase();
                            this._pathRenderables.push(pathRenderable);
                        }
                        pathRenderable.addElement(el);
                        break;
                    default:
                        console.warn('Deferred painter only support CanvasImage and CanvasPath');
                }
            }

            for (var i = 0; i < this._pathRenderables.length; i++) {
                this._pathRenderables[i].updateElements();
            }
            for (var i = 0; i < this._imageRenderables.length; i++) {
                this._imageRenderables[i].updateElements();
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

        _disposeRenderable : function(renderable) {
            renderable.geometry.dispose(this.ctx.renderer.gl);
        },

        _disposeImageAtlas : function(imageAtlas) {
            imageAtlas.dispose(this.ctx.renderer.gl);
        },

        _eleDepthSortFunc : function(a, b) {
            // Sort in ascendant order
            // Draw from far to near
            return a.depth - b.depth;
        }
    });

    return DeferredPainter;
});