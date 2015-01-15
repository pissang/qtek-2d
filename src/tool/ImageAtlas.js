define(function(require) {

    var CanvasImage = require('../CanvasImage');
    var Texture = require('qtek/Texture');

    var BLOCK_SIZE = 1024;

    var windowsDevicePixelRatio = window.devicePixelRatio || 1.0; 

    var ImageAtlas = function() {

        this._canvas = document.createElement('canvas');
        this._ctx2d = this._canvas.getContext('2d');

        this._offsetX = 0;
        this._offsetY = 0;

        this._texture = null;

        this._rowHeight = 0;

        // document.body.appendChild(this._canvas);
    }

    ImageAtlas.prototype.clear = function() {
        this._canvas.width = BLOCK_SIZE * windowsDevicePixelRatio;
        this._canvas.height = BLOCK_SIZE * windowsDevicePixelRatio;
        this._offsetX = this._offsetY = 0;
        this._nBlockSqrt = 1;
        this._ctx2d.clearRect(0, 0, this._canvas.width, this._canvas.height);

        this._ctx2d.scale(windowsDevicePixelRatio, windowsDevicePixelRatio);

        if (this._texture) {
            this._texture.dirty();
        }
    }

    var pxRegex = /([0-9]+)px/;
    ImageAtlas.prototype.addText = function(text, type, tx, ty, maxWidth, _ctx) {
        var ctx = this._ctx2d;
        
        ctx.fillStyle = _ctx.fillStyle;
        ctx.strokeStyle = _ctx.strokeStyle;
        ctx.font = _ctx.font;

        var sx = this._offsetX;
        var sy = this._offsetY;
        
        var width = ctx.measureText(text).width;
        if (typeof(maxWidth) != 'undefined') {
            width = Math.min(width, maxWidth);
        }
        // http://stackoverflow.com/questions/1134586/how-can-you-find-the-height-of-text-on-an-html-canvas
        // TODO Height!!!! rendering cn
        // var height = ctx.measureText('m').width;
        var height = Math.max(+pxRegex.exec(ctx.font)[1], ctx.measureText('m').width);
        var lineHeight = height * 1.5;

        if (width > this._canvas.width / windowsDevicePixelRatio) {
            console.warn('Text width no longer than ' + this._canvas.width);
        }

        if (sx + width > this._canvas.width / windowsDevicePixelRatio) {
            sx = 0;
            if (sy + this._rowHeight > this._canvas.height / windowsDevicePixelRatio) {
                return null;
            } else {
                sy += this._rowHeight;
                this._rowHeight = 0;
            }
        }

        this._rowHeight = Math.max(lineHeight, this._rowHeight);

        this._offsetY = sy;
        this._offsetX = sx + width;

        if (type == 'fill') {
            if (typeof(maxWidth) != 'undefined') {
                ctx.fillText(text, sx, sy + height, maxWidth);
            } else {
                ctx.fillText(text, sx, sy + height);
            }
        } else {
            if (typeof(maxWidth) != 'undefined') {
                ctx.strokeText(text, sx, sy + height, maxWidth);
            } else {
                ctx.strokeText(text, sx, sy + height);
            }
        }

        // TODO
        switch(_ctx.textAlign) {
            case "start":
                break;
            case "left":
                break;
            case "end":
            case "right":
                tx -= width;
                break;
            case "center":
                tx -= width / 2;
                break;
            default:
                break;
        }
        // TODO
        switch(_ctx.textBaseline) {
            case "alphabetic":
            case "ideographic":
            case "bottom":
                ty -= height;
                break;
            case "top":
            case "hanging":
                break;
            case "middle":
                ty -= height / 2;
                break;
            default:
                break;
        }

        var cImage = new CanvasImage(
            this._canvas, 
            sx * windowsDevicePixelRatio, sy * windowsDevicePixelRatio, width * windowsDevicePixelRatio, lineHeight * windowsDevicePixelRatio,
            tx, ty, width, lineHeight
        );

        if (cImage) {
            this._texture = cImage.getTexture();
            this._texture.minFilter = Texture.NEAREST;
            this._texture.magFilter = Texture.NEAREST;
            this._texture.useMipmap = false;
        }

        return cImage;
    }

    ImageAtlas.prototype.measureText = function(ctx, text) {
        var ctx = this._ctx2d;
        ctx.font = _ctx.font;

        return ctx.measureText(text);
    }

    ImageAtlas.prototype.addImage = function() {

    }

    ImageAtlas.prototype.getTexture = function() {
        return this._texture;
    }

    ImageAtlas.prototype.dispose = function(_gl) {
        this._texture.dispose(_gl);
    }

    return ImageAtlas;
});