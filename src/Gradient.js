/**
 * Adapter to CanvasGradient
 * base of linear gradient and radial gradient
 *
 * @export{class} Gradient
 */
define(function(require) {

    var Base = require('qtek/core/Base');
    var Vector2 = require("qtek/math/Vector2");
    var Cache = require("qtek/core/Cache");

    var Gradient = Base.derive(function(){
        return {
            stops : []
        }
    }, function() {
        this.cache = new Cache();
    }, {
        addColorStop : function(offset, color){
            this.stops.push([offset, color]);
            this.dirty();
        },
        removeAt : function(idx){
            this.stops.splice(idx, 1);
            this.dirty();
        },
        dirty : function(){
            for (var contextId in this.cache._caches){
                this.cache._caches[contextId]['dirty'] = true;
            }
        },
        getInstance : function(ctx){
            this.cache.use(ctx.__GUID__);
            if (this.cache.get("dirty") ||
                this.cache.miss("gradient")) {
                this.update(ctx);
            }
            return this.cache.get("gradient");
        },
        update : function(ctx){}
    });

    return Gradient;
})