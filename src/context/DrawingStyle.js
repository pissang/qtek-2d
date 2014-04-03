define(function(require) {

    'use strict'

    // TODO replace it
    var color = require('./tool/color');

    var DrawingStyle = function() {

        this.strokeStyle = [0, 0, 0, 1];

        this.fillStyle = [0, 0, 0, 1];
    }
    
    // Line Styles
    DrawingStyle.prototype.lineWidth = 1;
    DrawingStyle.prototype.lineCap = '';
    DrawingStyle.prototype.lineJoin = '';

    // Text styles
    // 


    DrawingStyle.prototype.globalAlpha = 1;

    // Shadows
    DrawingStyle.prototype.shadowOffsetX = 0;
    DrawingStyle.prototype.shadowOffsetY = 0;
    DrawingStyle.prototype.shadowBlur = 0;
    DrawingStyle.prototype.shadowColor = [0, 0, 0];


    DrawingStyle.prototype.setStrokeStyle = function(str) {
        var c = color.parse(str);
        if (c) {
            this.strokeStyle[0] = c[0] / 255;
            this.strokeStyle[1] = c[1] / 255;
            this.strokeStyle[2] = c[2] / 255;
            this.strokeStyle[3] = c[3];
        } else {
            this.strokeStyle[0] = 0;
            this.strokeStyle[1] = 0;
            this.strokeStyle[2] = 0;
            this.strokeStyle[3] = 1;
        }
    }

    DrawingStyle.prototype.setFillStyle = function(str) {
        var c = color.parse(str);
        if (c) {
            this.fillStyle[0] = c[0] / 255;
            this.fillStyle[1] = c[1] / 255;
            this.fillStyle[2] = c[2] / 255;
            this.fillStyle[3] = c[3];
        } else {
            this.fillStyle[0] = 0;
            this.fillStyle[1] = 0;
            this.fillStyle[2] = 0;
            this.fillStyle[3] = 1;
        }
    }


    return DrawingStyle;
});