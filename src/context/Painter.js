define(function(require) {
    
    'use strict'

    var Base = require('qtek/core/Base');
    var Shader = require('qtek/Shader');

    var CachedList = require('./tool/CachedList');
    var CanvasElement = require('./CanvasElement');
    var PathFillPrimitive = require('./PathFillPrimitive');
    var PathStrokePrimitive = require('./PathStrokePrimitive');
    var ImageFillPrimitive = require('./ImageFillPrimitive');
    var CanvasPath  = require('./CanvasPath');
    var CanvasImage = require('./CanvasImage');
    var ImageAtlas = require('./tool/ImageAtlas');

    var Painter = Base.derive(function() {
        
        return {
        
            _elements : [],

            _primitives : [],

            _fillPrimitiveLists : [],
            _strokePrimitiveLists : [],

            _textAtlas : new CachedList(ImageAtlas, 2),

            _blending : true,

            _gl : null
        }
        
    }, function() {
        
        var nFactory = CanvasElement.getClassNumber();

        for (var i = 0; i < nFactory; i++) {
            var FillPrimitive = CanvasElement.getFillPrimitiveClass(i);
            var StrokePrimitive = CanvasElement.getStrokePrimitiveClass(i);
            if (FillPrimitive) {
                this._fillPrimitiveLists.push(new CachedList(FillPrimitive, 5));
            } else {
                this._fillPrimitiveLists.push(null);
            }
            if (StrokePrimitive) {
                this._strokePrimitiveLists.push(new CachedList(StrokePrimitive, 5));
            } else {
                this._strokePrimitiveLists.push(null);
            }
        } 

        this._disposePrimitive = this._disposePrimitive.bind(this);
        this._disposeImageAtlas = this._disposeImageAtlas.bind(this);
    }, {

        addElement : function(el) {
            this._elements.push(el);
        },

        draw : function(ctx) {
            var _gl = this._gl = ctx.renderer.gl;
            if (this._blending) {
                _gl.enable(_gl.BLEND);
            } else {
                _gl.disable(_gl.BLEND);
            }
            ctx.renderer.renderQueue(this._primitives, ctx.camera);

            // FRESH all elements after draw
            for (var i = 0; i < this._elements.length; i++) {
                this._elements[i].afterDraw();
            }
        },

        repaint : function(ctx) {
            for (var i = 0; i < this._primitives.length; i++) {
                this._primitives[i].updateElements();
            }

            this.draw(ctx);
        },

        enableBlending : function() {
            this._blending = true;
        },

        disableBlending : function() {
            this._blending = false;
        },

        begin : function() {

            this.beginTextAtlas();

            for (var i = 0; i < this._primitives.length; i++) {
                this._primitives[i].clearElements();
            }
            this._primitives.length = 0;
            this._elements.length = 0;
            for (var i = 0; i < this._fillPrimitiveLists.length; i++) {
                if (this._fillPrimitiveLists[i]) {
                    this._fillPrimitiveLists[i].clear(this._disposePrimitive);
                }
            }
            for (var i = 0; i < this._strokePrimitiveLists.length; i++) {
                if (this._strokePrimitiveLists[i]) {
                    this._strokePrimitiveLists[i].clear(this._disposePrimitive);
                }
            }
        },

        end : function() {
            if (this._blending) {
                this._elements.sort(this._eleDepthSortFunc);
                var hashKey = null;
                var fillPrimitive;
                var strokePrimitive;
                for (var i = 0; i < this._elements.length; i++) {
                    var el = this._elements[i];
                    var elHashKey = el.getHashKey();
                    if (el.getHashKey() != hashKey) {
                        // Begin a new fillPrimitive
                        var list = this._fillPrimitiveLists[el.eType];
                        if (list) {
                            fillPrimitive = list.increase();
                            fillPrimitive.clearElements();   
                        }
                        list = this._strokePrimitiveLists[el.eType];
                        if (list) {
                            strokePrimitive = list.increase();
                            strokePrimitive.clearElements();   
                        }
                        // TODO 
                        // If there is a transparent filled path upon the stroke
                        // The stroked line still will be discarded because of depth test
                        if (fillPrimitive) {
                            this._primitives.push(fillPrimitive);
                        }
                        if (strokePrimitive) {
                            this._primitives.push(strokePrimitive);
                        }

                        hashKey = elHashKey;
                    }
                    // If element is a path, add the path to the fill(stroke) primitive
                    // if any of its subpath is filled(stroked)
                    // Any detailed validation will be done in the primitive
                    if (el.hasFill() && fillPrimitive) {
                        fillPrimitive.addElement(el);
                    }
                    if (el.hasStroke() && strokePrimitive) {
                        strokePrimitive.addElement(el);
                    }
                }
                for (var i = 0; i < this._primitives.length; i++) {
                    this._primitives[i].updateElements();
                }
            } else {
                // TODO
                for (var i = 0; i < this._fillPrimitiveLists.length; i++) {
                    if (this._fillPrimitiveLists[i]) {
                        var primitive = this._fillPrimitiveLists[i].increase();
                        primitive.clearElements();
                        this._primitives.push(primitive);
                    }
                }
                for (var i = 0; i < this._strokePrimitiveLists.length; i++) {
                    if (this._strokePrimitiveLists[i]) {
                        var primitive = this._strokePrimitiveLists[i].increase();
                        primitive.clearElements();
                        this._primitives.push(primitive);
                    }
                }
                for (var i = 0; i < this._elements.length; i++) {
                    var el = this._elements[i];
                    if (el.hasFill()) {
                        var primitive = this._fillPrimitiveLists[el.eType].get(0);
                        primitive.addElement(el);
                    }
                    if (el.hasStroke()) {
                        var primitive = this._strokePrimitiveLists[el.eType].get(0);
                        primitive.addElement(el);
                    }
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

    return Painter;
});