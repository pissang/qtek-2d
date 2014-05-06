define(function(require) {
    
    'use strict'
    
    var Matrix2d = require('qtek/math/Matrix2d');
    var glMatrix = require('glmatrix');
    var vec2 = glMatrix.vec2;
    var mat2d = glMatrix.mat2d;

    var Base = require('qtek/core/Base');
    var Renderer = require('qtek/Renderer');
    var OrthoCamera = require('qtek/camera/Orthographic');

    var Painter = require('./Painter');
    var DeferredPainter = require('./DeferredPainter');

    // Canvas Element
    var CanvasPath = require('./CanvasPath');
    var CanvasImage = require('./CanvasImage');

    var States = require('./States');

    var tmpV2 = vec2.create();

    var Context2D = Base.derive({

        canvas : null,

        renderer : null,

        camera : null,

        depthChannelGap : 0.01,

        _path : null,

        _polygon : null,

        _painter : null,

        _textAtlas : null,

        _depth : 1
        
    }, function() {
        var width = this.canvas.width;
        var height = this.canvas.height;

        if (this.canvas && !this.renderer) {
            this.renderer = new Renderer({
                canvas : this.canvas,
                // TODO
                // devicePixelRatio : 1
            });
        }

        if (!this.camera) {
            this.camera = new OrthoCamera({
                left : -width / 2,
                right : width / 2,
                top : height / 2,
                bottom : -height / 2,
                far : 50,
                near : 0
            });
            this.camera.scale.y = -1;
            this.camera.position.x = width / 2;
            this.camera.position.y = height / 2;
            this.camera.position.z = this.camera.far;
            this.camera.update(true);
        }

        this.currentTransform = new Matrix2d();

        this._statesStack = [];

    }, {

        /******************
         * Styles
         *****************/
        strokeStyle : '#000000',

        fillStyle : '#000000',

        globalAlpha : 1,

        shadowOffsetX : 0,

        shadowOffsetY : 0,

        shadowBlur : 0,

        shadowColor : 0,
        
        /******************
         * Fonts
         *****************/
        font : '10px sans-serif',

        textAlign : 'start',

        textBaseline : 'alphabetic',

        /******************
         * Line styles
         *****************/
        lineWidth : 1,

        lineCap : '',

        lineJoin : '',

        save : function() {
            var states = new States();
            states.save(this);
            this._statesStack.push(states);
        },

        restore : function() {
            if (this._statesStack.length > 0) {
                var states = this._statesStack.pop();
                states.load(this);
            }
        },

        /******************
         * Transformation
         *****************/
        scale : function(x, y) {
            tmpV2[0] = x;
            tmpV2[1] = y;
            var m = this.currentTransform._array;
            mat2d.scale(m, m, tmpV2);
        },
        rotate : function(radius) {
            var m = this.currentTransform._array;
            mat2d.rotate(m, m, radius);
        },
        translate : function(x, y) {
            tmpV2[0] = x;
            tmpV2[1] = y;
            var m = this.currentTransform._array;
            mat2d.translate(m, m, tmpV2);
        },

        transform : function(aa, ab, ac, ad, atx, aty) {
            var m = this.currentTransform._array;
            var ba = m[0], bb = m[1], bc = m[2], bd = m[3],
                btx = m[4], bty = m[5];
            m[0] = aa*ba + ab*bc;
            m[1] = aa*bb + ab*bd;
            m[2] = ac*ba + ad*bc;
            m[3] = ac*bb + ad*bd;
            m[4] = ba*atx + bc*aty + btx;
            m[5] = bb*atx + bd*aty + bty;
        },

        setTransform : function(aa, ab, ac, ad, atx, aty) {
            var m = this.currentTransform._array;
            m[0] = aa;
            m[1] = ab;
            m[2] = ac;
            m[3] = ad;
            m[4] = atx;
            m[5] = aty;
        },

        /******************
         * Image drawing
         *****************/
        drawImage : function(image, sx, sy, sw, sh, dx, dy, dw, dh) {
            if (!this._painter) {
                return;
            }
            // End previous path
            if (this._path) {
                this.endPath();
            }
            // drawImage(image, dx, dy)
            if (arguments.length == 3) {
                dx = sx;
                dy = sy;

                sx = 0;
                sy = 0;
                dw = sw = image.width;
                dh = sh = image.height;
            }
            // drawImage(image, dx, dy, dw, dh)
            else if(arguments.length == 5) {
                dx = sx;
                dy = sy;
                dw = sw;
                dh = sh;

                sx = 0;
                sy = 0;
                sw = image.height;
                sh = image.height;
            }

            var cImage = new CanvasImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
            cImage.end(this);

            this._painter.addElement(cImage);

            return cImage;
        },

        /******************
         * Gradient and pattern
         *****************/
        createLinearGradient : function() {},

        createRadialGradient : function() {},
        createPattern : function() {},

        /******************
         * Texts
         *****************/
        strokeText : function(text, x, y, maxWidth) {
            return this._drawText(text, 'stroke', x, y, maxWidth);
        },

        fillText : function(text, x, y, maxWidth) {
            return this._drawText(text, 'fill', x, y, maxWidth);
        },

        _drawText : function(text, type, x, y, maxWidth) {
            if (!this._painter) {
                return;
            }
            // End previous path
            if (this._path) {
                this.endPath();
            }

            if (!this._textAtlas) {
                this._textAtlas = this._painter.getNewTextAtlas();
            }
            var cImage = this._textAtlas.addText(text, type, x, y, maxWidth, this);
            if (!cImage) {
                this._textAtlas = this._painter.getNewTextAtlas();
                cImage = this._textAtlas.addText(text, type, x, y, maxWidth, this);
            }

            cImage.end(this);
            this._painter.addElement(cImage);

            return cImage;
        },

        measureText : function(text) {
            if (!this._textAtlas) {
                this._textAtlas = this._painter.getNewTextAtlas();
            }
            return this._textAtlas.measureText(text);
        },

        /******************
         * Rectangles
         *****************/
        clearRect : function() {},
        fillRect : function() {},
        strokeRect : function() {},

        /******************
         * Paths
         *****************/
        beginPath : function(path) {
            // End previous path
            if (this._path) {
                this.endPath();
            }
            if (!path) {
                path = new CanvasPath();
            }
            path.begin(this);
            this._path = path;

            return path;
        },
        closePath : function() {
            if (this._path) {
                this._path.close(this.lineWidth);
            }
        },
        fill : function() {
            if (this._path) {
                this._path.fill(this);
            }
        },
        stroke : function() {
            if (this._path) {
                this._path.stroke(this);
            }
        },
        clip : function() {
            console.warn('TODO')
        },
        moveTo : function(x, y) {
            if (this._path) {
                this._path.moveTo(x, y);
            }
        },
        lineTo : function(x, y) {
            if (this._path) {
                this._path.lineTo(x, y, this.lineWidth);
            }
        },
        quadraticCurveTo : function(cpx, cpy, x, y) {
            if (this._path) {
                this._path.quadraticCurveTo(cpx, cpy, x, y, this.lineWidth);
            }
        },
        bezierCurveTo : function(cp1x, cp1y, cp2x, cp2y, x, y) {
            if (this._path) {
                this._path.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y, this.lineWidth);
            }
        },
        arc : function(x, y, radius, startAngle, endAngle, anticlockwise) {
            if (this._path) {
                this._path.arc(x, y, radius, startAngle, endAngle, anticlockwise, this.lineWidth);
            }
        },
        arcTo : function() {},
        rect : function(x, y, w, h) {
            if (this._path) {
                this._path.rect(x, y, w, h, this.lineWidth);
            }
        },
        isPointInPath : function() {},

        /******************
         * Image data
         *****************/
        createImageData : function() {},
        getImageData : function() {},
        putImageData : function() {},

        /******************
         * Extend methods
         *****************/
        beginDraw : function(painter, painterType) {
            if (!painter) {
                if (painterType == 'deferred') {
                    painter = new DeferredPainter();
                } else {
                    painter = new Painter();
                }
            }
            this.setPainter(painter);

            return painter;
        },

        setPainter : function(painter) {
            if (this._painter !== painter) {
                if (this._painter) {
                    this._painter.end();
                }
                painter.ctx = this;
                this._textAtlas = null;
                this._painter = painter;
                painter.begin();   
            }
        },

        addPath : function(path) {
            if (this._painter) {
                this._painter.addElement(path);
            }
        },
        addImage: function(image) {
            if (this._painter) {
                this._painter.addElement(image);
            }
        },
        clearColor : function(color) {
            var _gl = this.renderer.gl;
            if (color) {
                _gl.clearColor(color[0], color[1], color[2], color[3]);
            }
            _gl.clear(_gl.COLOR_BUFFER_BIT);
        },
        clearDepth : function() {
            var _gl = this.renderer.gl;
            _gl.clear(_gl.DEPTH_BUFFER_BIT);
            this._depth = 1;
        },
        clear : function(color) {
            var _gl = this.renderer.gl;
            if (color) {
                _gl.clearColor(color[0], color[1], color[2], color[3]);
            }
            _gl.clear(_gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT);
            this._depth = 1;
        },
        endDraw : function() {
            if (this._painter) {
                if (this._path) {
                    this.endPath();
                }
                this._painter.end();
                // Do thre draw ?
                this._painter.draw();
                this._painter = null;
            }
        },
        repaint : function(painter) {
            var els = painter.getElements();
            var lastEl = els[els.length - 1];
            if (lastEl) {
                this.setDepthChannel(lastEl.depth);
            }
            painter.repaint();
        },
        draw : function(painter) {
            var els = painter.getElements();
            var lastEl = els[els.length - 1];
            if (lastEl) {
                this.setDepthChannel(lastEl.depth);
            }
            painter.draw();
        },
        // Force to end current path
        endPath : function() {
            if (this._path) {
                this._path.end(this);
                if (this._painter) {
                    this._painter.addElement(this._path);
                }
                this._path = null;
            }
        },
        // Get current depth channel
        requestDepthChannel : function() {
            this.setDepthChannel(this._depth + this.depthChannelGap);
            return this._depth;
        },
        setDepthChannel : function(depth) {
            this._depth = depth;
            if (this._depth > this.camera.far) {
                this.camera.far *= 2;
                this.camera.position.z = this.camera.far;
                this.camera.update(true);
            }
        },
        identity : function() {
            mat2d.identity(this.currentTransform._array);
        },
        resize: function(width, height) {
            this.renderer.resize(width, height);
            width = this.renderer.width;
            height = this.renderer.height;

            this.camera.left = -width / 2;
            this.camera.right = width / 2;
            this.camera.top = height / 2;
            this.camera.bottom = -height / 2;

            this.camera.position.x = width / 2;
            this.camera.position.y = height / 2;

            this.camera.update(true);
        }
    });

    return Context2D;
});