define(function(require) {
    
    'use strict'
    
    var Node3D = require('qtek/Node');
    var Geometry2D = require('./Geometry2D');
    var Material = require('qtek/Material');
    var Shader = require('qtek/Shader');
    var Mesh = require('qtek/Mesh');

    var Primitive = Node3D.derive({

        geometry : null,
        
        material : null,
        
        culling : false,

        mode : Mesh.TRIANGLES,

        _renderInfo : new Mesh.RenderInfo(),
        
        _drawCache : {}
    }, {
        isRenderable : function() {
            return true;
        },
        updateElements : function() {},
        addElement : function() {},
        clearElements : function() {},

        render : Mesh.prototype.render
    });

    return Primitive;
});