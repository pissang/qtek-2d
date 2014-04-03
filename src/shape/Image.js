define(function(require) {

    var Node = require('../Node');
    var Vector2 = require("qtek/math/Vector2");

    var _imageCache = {};
    
    var QTImage = Node.derive(function() {
        return {
            image     : null,
            start   : new Vector2(),
            size    : null
        }
    }, {
        computeBoundingBox : function() {
            if (this.size){
                this.boundingBox = {
                    min : this.start.clone(),
                    max : this.start.clone().add(this.size)
                }   
            }
        },
        draw : function(ctx, isPicker) {
            if (this.image && ! isPicker) {
                this.size ? 
                    ctx.drawImage(this.image, this.start.x, this.start.y, this.size.x, this.size.y) :
                    ctx.drawImage(this.image, this.start.x, this.start.y);
            }
        },
        intersect : function(x, y) {
            return this.intersectBoundingBox(x, y);
        }
    });

    QTImage.load = function(src, callback){
        if (_imageCache[src]) {
            var img = _imageCache[src];
            if (img.constructor == Array) {
                img.push(callback);
            } else {
                callback(img);
            }
        } else {
            _imageCache[src] = [callback];
            var img = new Image();
            img.onload = function() {
                _imageCache[src].forEach(function(cb) {
                    cb(img);
                });
                _imageCache[src] = img;

                img.onload = null;
            }
            img.src = src;
        }
    }
    
    return QTImage;
});