define(function(require) {
    
    'use strict'

    var Base = require('qtek/core/Base');
    var Shader = require('qtek/Shader');
    var Matrix2d = require('qtek/math/Matrix2d');
    var Matrix4 = require('qtek/math/Matrix4');

    var CachedList = require('./tool/CachedList');
    var CanvasElement = require('./CanvasElement');
    var PathPrimitive = require('./PathPrimitive');
    var ImagePrimitive = require('./ImagePrimitive');
    var CanvasPath  = require('./CanvasPath');
    var CanvasImage = require('./CanvasImage');
    var ImageAtlas = require('./tool/ImageAtlas');

    var Painter = Base.derive(function() {
        return {
            transform : new Matrix2d(),

            ctx : null,

            _elements : [],

            _primitives : [],

            _primitiveLists : [],

            _textAtlas : new CachedList(ImageAtlas, 2),

            _blending : true,

            _blendFunc : null
        }
    }, function() {
        
        var nFactory = CanvasElement.getClassNumber();

        for (var i = 0; i < nFactory; i++) {
            var Primitive = CanvasElement.getPrimitiveClass(i);
            if (Primitive) {
                this._primitiveLists.push(new CachedList(Primitive, 5));
            } else {
                this._primitiveLists.push(null);
            }
        } 

        this._disposePrimitive = this._disposePrimitive.bind(this);
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

            for (var i = 0; i < this._primitives.length; i++) {
                Matrix4.fromMat2d(this._primitives[i].worldTransform, this.transform);

                if (this._blending && this._blendFunc) {
                    this._primitives[i].material.blend = this._blendFunc;
                } else {
                    this._primitives[i].material.blend = null;
                }
            }

            ctx.renderer.renderQueue(this._primitives, ctx.camera);

            // FRESH all elements after draw
            for (var i = 0; i < this._elements.length; i++) {
                this._elements[i].afterDraw();
            }
        },

        repaint : function() {
            for (var i = 0; i < this._primitives.length; i++) {
                this._primitives[i].updateElements();
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

            for (var i = 0; i < this._primitives.length; i++) {
                this._primitives[i].clearElements();
            }
            this._primitives.length = 0;
            this._elements.length = 0;
            for (var i = 0; i < this._primitiveLists.length; i++) {
                if (this._primitiveLists[i]) {
                    this._primitiveLists[i].clear(this._disposePrimitive);
                }
            }
        },

        end : function() {
            if (this._blending) {
                // this._elements.sort(this._eleDepthSortFunc);
                var hashKey = null;
                var primitive;
                for (var i = 0; i < this._elements.length; i++) {
                    var el = this._elements[i];
                    var elHashKey = el.getHashKey();
                    if (el.getHashKey() != hashKey) {
                        // Begin a new primitive
                        var list = this._primitiveLists[el.eType];
                        if (list) {
                            primitive = list.increase();
                            primitive.clearElements();   
                        }
                        if (primitive) {
                            this._primitives.push(primitive);
                        }

                        hashKey = elHashKey;
                    }
                    if (primitive) {
                        primitive.addElement(el);
                    }
                }
                for (var i = 0; i < this._primitives.length; i++) {
                    this._primitives[i].updateElements();
                }
            } else {
                // TODO
                for (var i = 0; i < this._primitiveLists.length; i++) {
                    if (this._primitiveLists[i]) {
                        var primitive = this._primitiveLists[i].increase();
                        primitive.clearElements();
                        this._primitives.push(primitive);
                    }
                }
                for (var i = 0; i < this._elements.length; i++) {
                    var el = this._elements[i];
                    var primitive = this._primitiveLists[el.eType].get(0);
                    primitive.addElement(el);
                }
                for (var i = 0; i < this._primitives.length; i++) {
                    this._primitives[i].updateElements(true);
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

        _disposePrimitive : function(primitive) {
            primitive.geometry.dispose(this.ctx.renderer.gl);
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