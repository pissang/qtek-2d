define(function(require) {

    var Geometry = require('qtek/Geometry');
    var StaticGeometry = require('qtek/StaticGeometry');

    var Geometry2D = Geometry.derive({

        _enabledAttributes : null,

        _isDirty : true,
        
        hint : Geometry.DYNAMIC_DRAW
    }, {

        dirty : function() {
            this._isDirty = true;
            this.cache.dirtyAll("chunks");
        },

        isDirty : function() {
            return this._isDirty;
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