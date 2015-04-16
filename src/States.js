define(function (require) {
     
    var glMatrix = require('qtek/dep/glmatrix');
    var mat2d = glMatrix.mat2d;

    var States = function() {

        this._matrix = mat2d.create();
    }

    States.prototype = {

        constructor : States,

        load : function(ctx) {

            ctx.strokeStyle = this.strokeStyle;

            ctx.fillStyle = this.fillStyle;

            ctx.globalAlpha = this.globalAlpha;

            ctx.lineWidth = this.lineWidth;

            ctx.font = this.font;

            ctx.textBaseline = this.textBaseline;

            ctx.textAlign = this.textAlign;

            mat2d.copy(ctx.currentTransform._array, this._matrix);
        },

        save : function(ctx) {

            this.strokeStyle = ctx.strokeStyle;

            this.fillStyle = ctx.fillStyle;

            this.globalAlpha = ctx.globalAlpha;

            this.lineWidth = ctx.lineWidth;

            this.font = ctx.font;

            this.textBaseline = ctx.textBaseline;

            this.textAlign = ctx.textAlign;

            mat2d.copy(this._matrix, ctx.currentTransform._array);
        }
    }

    return States;
});