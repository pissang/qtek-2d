define(function(require) {

    var Base = require('qtek/core/Base');

    var Renderer = Base.derive(function() {
        return {
            canvas : null,

            ctx : null,
            
            width : 0,
            
            height : 0,
            
        }
    }, function() {
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
        }

        if (this.width) {
            this.canvas.width = this.width;
        } else {
            this.width = this.canvas.width;
        }
        if (this.height) {
            this.canvas.height = this.height;
        } else {
            this.height = this.canvas.height;
        }

        this.ctx = this.canvas.getContext('2d');

        this.ctx.__GUID__ = this.__GUID__;
    }, {

        resize : function(width, height) {
            this.canvas.width = width;
            this.canvas.height = height;

            this.width = width;
            this.height = height;
        },

        render : function(scene, camera) {
            if (this.clearColor) {
                this.ctx.fillStyle = this.clearColor;
                this.ctx.fillRect(0, 0, this.width, this.height);
            } else {
                this.ctx.clearRect(0, 0, this.width, this.height);
            }
            if (camera) {
                var vm = camera.getViewMatrix()._array;
                this.ctx.transform(vm[0], vm[1], vm[2], vm[3], vm[4], vm[5]);   
            }
            scene.render(this.ctx);
        }
    });

    return Renderer;
});