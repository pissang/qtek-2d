define(function(require) {

    var Geometry = require('qtek/Geometry');
    var StaticGeometry = require('qtek/StaticGeometry');

    var Geometry2D = Geometry.derive({

        _enabledAttributes : null,
        
        hint : Geometry.DYNAMIC_DRAW
    }, {

        dirty : function() {
            this.cache.dirtyAll("chunks");
        },

        getVertexNumber : StaticGeometry.prototype.getVertexNumber,

        getFaceNumber : StaticGeometry.prototype.getFaceNumber,

        isUseFace : StaticGeometry.prototype.isUseFace,

        getEnabledAttributes : StaticGeometry.prototype.getEnabledAttributes,

        getBufferChunks : StaticGeometry.prototype.getBufferChunks,

        _updateBuffer : StaticGeometry.prototype._updateBuffer
    });

    return Geometry2D;
});