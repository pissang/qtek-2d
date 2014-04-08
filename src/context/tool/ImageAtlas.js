define(function(require) {

    var CanvasImage = require('../CanvasImage');

    var BLOCK_SIZE = 1024;

    var ImageAtlas = function() {

        this._canvas = document.createElement('canvas');
        this._ctx2d = this._canvas.getContext('2d');

        this._canvas.width = BLOCK_SIZE;
        this._canvas.height = BLOCK_SIZE;

        this._offsetX = 0;
        this._offsetY = 0;

        // Each block is BLOCK_SIZE x BLOCK_SIZE
        this._currentBlock = 0;

        this._nBlockSqrt = 1;

        this._texture = null;

        // document.body.appendChild(this._canvas);
    }

    ImageAtlas.prototype.clear = function() {
        this._canvas.width = BLOCK_SIZE;
        this._canvas.height = BLOCK_SIZE;
        this._offsetX = this._offsetY = this._currentBlock = 0;
        this._nBlockSqrt = 1;
        this._ctx2d.clearRect(0, 0, this._canvas.width, this._canvas.height);
    }

    ImageAtlas.prototype.addText = function(text, type, tx, ty, maxWidth, _ctx) {
        var ctx = this._ctx2d;
        
        ctx.fillStyle = _ctx.fillStyle;
        ctx.strokeStyle = _ctx.strokeStyle;

        var sx = this._offsetX;
        var sy = this._offsetY;
        
        var width = ctx.measureText(text).width;
        if (typeof(maxWidth) != 'undefined') {
            width = Math.min(width, maxWidth);
        }
        // http://stackoverflow.com/questions/1134586/how-can-you-find-the-height-of-text-on-an-html-canvas
        // TODO rendering cn
        var height = ctx.measureText('m').width;

        if (width > this._canvas.width) {
            console.warn('Text width no longer than ' + this._canvas.width);
        }

        if (sx + width > this._canvas.width) {
            sx = 0;
            if (sy + height > this._canvas.height) {
                return null;
            } else {
                sy += height;
            }
        }

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

        var cImage = new CanvasImage(this._canvas, sx, sy, width, height * 1.5, tx, ty, width, height * 1.5);

        if (cImage) {
            this._texture = cImage.getTexture();
        }

        return cImage;
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