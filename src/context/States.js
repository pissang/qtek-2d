define(function (require) {
     
    var glMatrix = require('glmatrix');
    var mat2d = glMatrix.mat2d;

    var States = function() {

        this._matrix = mat2d.create();
    }

    States.prototype = {

        constructor : States,

        load : function(ctx) {

            ctx.strokeStyle = this.strokeStyle;

            ctx.fillStyle = this.fillStyle;

            ctx.lineWidth = this.lineWidth;

            mat2d.copy(ctx._transform._array, this._matrix);
        },

        save : function(ctx) {

            this.strokeStyle = ctx.strokeStyle;

            this.fillStyle = ctx.fillStyle;

            this.lineWidth = ctx.lineWidth;

            mat2d.copy(this._matrix, ctx._transform._array);
        }
    }

    return States;
});