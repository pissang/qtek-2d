define(function(require) {

    var Node = require('../Node');
    var util = require('../util');
    var Vector2 = require("qtek/math/Vector2");

    var Text = Node.derive( function() {
        return {
            text : '',
            start : new Vector2(),
            size : new Vector2()
        }
    }, {
        computeBoundingBox : function() {
            this.boundingBox = {
                min : this.start.clone(),
                max : this.start.clone().add(this.size)
            }
        },
        draw : function(ctx) {
            var start = this.start;
            if (this.fill) {
                this.size.length && this.size.x ?
                    ctx.fillText(this.text, start.x, start.y, this.size.x) :
                    ctx.fillText(this.text, start.x, start.y);
            }
            if (this.stroke) {
                this.size.length && this.size.x ?
                    ctx.strokeText(this.text, start.x, start.y, this.size.x) :
                    ctx.strokeText(this.text, start.x, start.y);
            }
        },
        resize : function(ctx) {
            if (! this.size.x || this.needResize) {
                this.size.x = ctx.measureText(this.text).width;
                this.size.y = ctx.measureText('m').width;
            }
        },
        intersect : function(x, y) {
            return this.intersectBoundingBox(x, y);
        }
    })

    return Text;
})