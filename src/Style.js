/**
 * Style
 * @config  fillStyle | fill,
 * @config  strokeStyle | stroke,
 * @config  lineWidth,
 * @config  lineCap,
 * @config  lineJoin,
 * @config  lineDash,
 * @config  lineDashOffset,
 * @config  miterLimit,
 * @config  shadowColor,
 * @config  shadowOffsetX,
 * @config  shadowOffsetY,
 * @config  shadowBlur,
 * @config  globalAlpha | alpha,
 * @config  globalCompositeOperation,
 * @config  alpha,
 * @config  shadow
 */
define(function(require) {
    
    var Base = require('qtek/core/Base');

    var shadowSyntaxRegex = /([0-9\-]+)\s+([0-9\-]+)\s+([0-9]+)\s+(.+)/;
    
    var Style = Base.derive({}, {

        bind : function(ctx) {
            // Alias
            var fillStyle = this.fillStyle || this.fill;
            var strokeStyle = this.strokeStyle || this.stroke;
            var globalAlpha = this.globalAlpha || this.alpha;
            var globalCompositeOperation = this.globalCompositeOperation || this.composite;
            // parse shadow string
            if (this.shadow) {
                var res = shadowSyntaxRegex.exec(trim(this.shadow));
                if (res) {
                    var shadowOffsetX = parseInt(res[1]);
                    var shadowOffsetY = parseInt(res[2]);
                    var shadowBlur = res[3];
                    var shadowColor = res[4];
                }
            }
            shadowOffsetX = this.shadowOffsetX || shadowOffsetX;
            shadowOffsetY = this.shadowOffsetY || shadowOffsetY;
            shadowBlur = this.shadowBlur || shadowBlur;
            shadowColor = this.shadowColor || shadowColor;

            (globalAlpha !== undefined) &&
                (ctx.globalAlpha = globalAlpha);
            globalCompositeOperation &&
                (ctx.globalCompositeOperation = globalCompositeOperation);
            (this.lineWidth !== undefined) &&
                (ctx.lineWidth = this.lineWidth);
            (this.lineCap !== undefined) && 
                (ctx.lineCap = this.lineCap);
            (this.lineJoin !== undefined) &&
                (ctx.lineJoin = this.lineJoin);
            (this.miterLimit !== undefined) &&
                (ctx.miterLimit = this.miterLimit);
            (shadowOffsetX !== undefined) &&
                (ctx.shadowOffsetX = shadowOffsetX);
            (shadowOffsetY !== undefined) &&
                (ctx.shadowOffsetY = shadowOffsetY);
            (shadowBlur !== undefined) &&
                (ctx.shadowBlur = shadowBlur);
            (shadowColor !== undefined) &&
                (ctx.shadowColor = shadowColor);
            this.font &&
                (ctx.font = this.font);
            this.textAlign &&
                (ctx.textAlign = this.textAlign);
            this.textBaseline &&
                (ctx.textBaseline = this.textBaseline);

            if (fillStyle) {
                // Fill style is gradient or pattern
                if (fillStyle.getInstance) {
                    ctx.fillStyle = fillStyle.getInstance(ctx);
                } else {
                    ctx.fillStyle = fillStyle;
                }
            }
            if (strokeStyle) {
                // Stroke style is gradient or pattern
                if (strokeStyle.getInstance) {
                    ctx.strokeStyle = strokeStyle.getInstance(ctx);
                } else {
                    ctx.strokeStyle = strokeStyle;
                }
            }
            // Set line dash individually
            if (this.lineDash) {
                if (ctx.setLineDash) {
                    ctx.setLineDash(this.lineDash);
                    if (typeof(this.lineDashOffset) === 'number') {
                        ctx.lineDashOffset = this.lineDashOffset;
                    }
                } else {
                    console.warn("Browser does not support setLineDash method");
                }
            }
        }
    })

    function trim(str) {
        return (str || '').replace(/^(\s|\u00A0)+|(\s|\u00A0)+$/g, '');
    }

    return Style;
})