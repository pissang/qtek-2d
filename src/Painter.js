define(function(require) {
    
    'use strict'

    var Base = require('qtek/core/Base');
    var Shader = require('qtek/Shader');
    var Matrix2d = require('qtek/math/Matrix2d');
    var Matrix4 = require('qtek/math/Matrix4');

    var CachedList = require('./tool/CachedList');
    var CanvasElement = require('./CanvasElement');
    var PathRenderable = require('./PathRenderable');
    var ImageRenderable = require('./ImageRenderable');
    var CanvasPath  = require('./CanvasPath');
    var CanvasImage = require('./CanvasImage');
    var ImageAtlas = require('./tool/ImageAtlas');

    var Painter = Base.derive(function() {
        return {
            transform : new Matrix2d(),

            ctx : null,

            _elements : [],

            _renderables : [],

            _renderableLists : [],

            _textAtlas : new CachedList(ImageAtlas, 2),

            _blending : true,

            _blendFunc : null
        }
    }, function() {
        
        var nFactory = CanvasElement.getClassNumber();

        for (var i = 0; i < nFactory; i++) {
            var Renderable = CanvasElement.getRenderableClass(i);
            if (Renderable) {
                this._renderableLists.push(new CachedList(Renderable, 5));
            } else {
                this._renderableLists.push(null);
            }
        } 

        this._disposeRenderable = this._disposeRenderable.bind(this);
        this._disposeImageAtlas = this._disposeImageAtlas.bind(this);
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

            if (this._blending) {
                _gl.enable(_gl.BLEND);
            } else {
                _gl.disable(_gl.BLEND);
            }

            for (var i = 0; i < this._renderables.length; i++) {
                Matrix4.fromMat2d(this._renderables[i].worldTransform, this.transform);

                if (this._blending && this._blendFunc) {
                    this._renderables[i].material.blend = this._blendFunc;
                } else {
                    this._renderables[i].material.blend = null;
                }
            }

            ctx.renderer.renderQueue(this._renderables, ctx.camera);

            // FRESH all elements after draw
            for (var i = 0; i < this._elements.length; i++) {
                this._elements[i].afterDraw();
            }
        },

        repaint : function() {
            for (var i = 0; i < this._renderables.length; i++) {
                this._renderables[i].updateElements();
            }

            this.draw();
        },

        enableBlending : function() {
            this._blending = true;
        },

        disableBlending : function() {
            this._blending = false;
        },

        setBlendFunc : function(func) {
            this._blendFunc = func;
        },

        begin : function() {

            this.beginTextAtlas();

            for (var i = 0; i < this._renderables.length; i++) {
                this._renderables[i].clearElements();
            }
            this._renderables.length = 0;
            this._elements.length = 0;
            for (var i = 0; i < this._renderableLists.length; i++) {
                if (this._renderableLists[i]) {
                    this._renderableLists[i].clear(this._disposeRenderable);
                }
            }
        },

        end : function() {
            if (this._blending) {
                // this._elements.sort(this._eleDepthSortFunc);
                var hashKey = null;
                var renderable;
                for (var i = 0; i < this._elements.length; i++) {
                    var el = this._elements[i];
                    var elHashKey = el.getHashKey();
                    if (el.getHashKey() != hashKey) {
                        // Begin a new renderable
                        var list = this._renderableLists[el.eType];
                        if (list) {
                            renderable = list.increase();
                            renderable.clearElements();   
                        }
                        if (renderable) {
                            this._renderables.push(renderable);
                        }

                        hashKey = elHashKey;
                    }
                    if (renderable) {
                        renderable.addElement(el);
                    }
                }
                for (var i = 0; i < this._renderables.length; i++) {
                    this._renderables[i].updateElements();
                }
            } else {
                // TODO
                for (var i = 0; i < this._renderableLists.length; i++) {
                    if (this._renderableLists[i]) {
                        var renderable = this._renderableLists[i].increase();
                        renderable.clearElements();
                        this._renderables.push(renderable);
                    }
                }
                for (var i = 0; i < this._elements.length; i++) {
                    var el = this._elements[i];
                    var renderable = this._renderableLists[el.eType].get(0);
                    renderable.addElement(el);
                }
                for (var i = 0; i < this._renderables.length; i++) {
                    this._renderables[i].updateElements(true);
                }
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

        endTextAtlas : function() {
            
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

    return Painter;
});