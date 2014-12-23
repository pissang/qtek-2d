define(function(require) {

    var Geometry = require('qtek/Geometry');
    var StaticGeometry = require('qtek/StaticGeometry');

    var Geometry2D = Geometry.derive({

        _enabledAttributes : null,

        dynamic: true,

        hint: Geometry.STATIC_DRAW
    }, {

        dirty : function() {
            this._cache.dirtyAll();
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