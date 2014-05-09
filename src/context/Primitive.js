define(function(require) {
    
    'use strict'
    
    var Renderable = require('qtek/Renderable');
    var Geometry2D = require('./Geometry2D');
    var Material = require('qtek/Material');
    var Shader = require('qtek/Shader');

    var Primitive = Renderable.derive({

        culling : false,

        mode : Renderable.TRIANGLES
    }, {

        updateElements : function() {},
        addElement : function() {},
        clearElements : function() {},

        render : Renderable.prototype.render
    });

    return Primitive;
});