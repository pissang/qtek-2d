/**
 * 
 * @export{class} SVGPath
 */
define(function(require) {

    var Node = require("../Node");
    var util = require("../util");
    var Vector2 = require("qtek/math/Vector2");

    var availableCommands = {'m':1,'M':1,'z':1,'Z':1,'l':1,'L':1,'h':1,'H':1,'v':1,'V':1,'c':1,'C':1,'s':1,'S':1,'q':1,'Q':1,'t':1,'T':1,'a':1,'A':1}

    var SVGPath = Node.derive(function() {
        return {
            description : '',
            _ops : []
        }
    }, {
        draw : function(ctx) {
            if (!this._ops.length) {
                this.parse();
            }
            ctx.beginPath();
            for (var i = 0; i < this._ops.length; i++) {
                var op = this._ops[i];
                switch(op[0]) {
                    case 'm':
                        ctx.moveTo(op[1] || 0, op[2] || 0);
                        break;
                    case 'l':
                        ctx.lineTo(op[1] || 0, op[2] || 0);
                        break;
                    case 'c':
                        ctx.bezierCurveTo(op[1] || 0, op[2] || 0, op[3] || 0, op[4] || 0, op[5] || 0, op[6] || 0);
                        break;
                    case 'q':
                        ctx.quadraticCurveTo(op[1] || 0, op[2] || 0, op[3] || 0, op[4] || 0);
                        break;
                    case 'z':
                        ctx.closePath();
                        break;
                }
            }
            if (this.fill) {
                ctx.fill();
            }
            if (this.stroke) {
                ctx.stroke();
            }
        },

        computeBoundingBox : (function() {
            // Temp variables
            var current = new Vector2();
            var p1 = new Vector2();
            var p2 = new Vector2();
            var p3 = new Vector2();

            var minTmp = new Vector2();
            var maxTmp = new Vector2();

            return function() {
                if (!this._ops.length) {
                    this.parse();
                }
                var min = new Vector2(999999, 999999);
                var max = new Vector2(-999999, -999999);

                for (var i = 0; i < this._ops.length; i++) {
                    var op = this._ops[i];
                    switch(op[0]) {
                        case 'm':
                            current.set(op[1], op[2]);
                            break;
                        case 'l':
                            p1.set(op[1], op[2]);
                            current.copy(p1);
                            min.min(current).min(p1);
                            max.max(current).max(p1);
                            break;
                        case 'c':
                            p1.set(op[1], op[2]);
                            p2.set(op[3], op[4]);
                            p3.set(op[5], op[6]);
                            util.computeCubeBezierBoundingBox(current, p1, p2, p3, minTmp, maxTmp);
                            current.copy(p3);
                            min.min(minTmp);
                            max.max(maxTmp);
                            break;
                        case 'q':
                            p1.set(op[1], op[2]);
                            p2.set(op[3], op[4]);
                            var bb = util.computeQuadraticBezierBoundingBox(current, p1, p2, minTmp, maxTmp);
                            current.copy(p2);
                            min.min(minTmp);
                            min.max(maxTmp);
                            break;
                        case 'z':
                            break;
                    }
                }

                this.boundingBox = {
                    min : min,
                    max : max
                }
            }
        })(),

        parse : function(description) {
            // point x, y
            var x = 0;
            var y = 0;
            // control point 1(in cube bezier curve and quadratic bezier curve)
            var x1 = 0;
            var y1 = 0;
            // control point 2(in cube bezier curve)
            var x2 = 0;
            var y2 = 0;

            // pre process
            description = description || this.description;
            var d = description.replace(/\s*,\s*/g, ' ');
            d = d.replace(/(-)/g, ' $1');
            d = d.replace(/([mMzZlLhHvVcCsSqQtTaA])/g, ' $1 ');
            d = d.split(/\s+/);

            var command = "";
            // Save the previous command specially for shorthand/smooth curveto(s/S, t/T)
            var prevCommand = "";
            var offset = 0;
            var len = d.length;
            var next = d[0];

            while (offset <= len) {
                // Skip empty
                if(!next) {
                    next = d[++offset];
                    continue;
                }
                if (availableCommands[next]) {
                    prevCommand = command;
                    command = next;
                    offset++;
                }
                // http://www.w3.org/TR/SVG/paths.html
                switch (command) {
                    case "m":
                        x = pickValue() + x;
                        y = pickValue() + y;
                        this._ops.push(['m', x, y]);
                        break;
                    case "M":
                        x = pickValue();
                        y = pickValue();
                        this._ops.push(['m', x, y]);
                        break;
                    case "z":
                    case "Z":
                        next = d[offset];
                        this._ops.push(['z']);
                        break;
                    case "l":
                        x = pickValue() + x;
                        y = pickValue() + y;
                        this._ops.push(['l', x, y]);
                        break;
                    case "L":
                        x = pickValue();
                        y = pickValue();
                        this._ops.push(['l', x, y]);
                        break;
                    case "h":
                        x = pickValue() + x;
                        this._ops.push(['l', x, y]);
                        break;
                    case "H":
                        x = pickValue();
                        this._ops.push(['l', x, y]);
                        break;
                    case "v":
                        y = pickValue() + y;
                        this._ops.push(['l', x, y]);
                        break;
                    case "V":
                        y = pickValue();
                        this._ops.push(['l', x, y]);
                        break;
                    case "c":
                        x1 = pickValue() + x;
                        y1 = pickValue() + y;
                        x2 = pickValue() + x;
                        y2 = pickValue() + y;
                        x = pickValue() + x;
                        y = pickValue() + y;
                        this._ops.push(['c', x1, y1, x2, y2, x, y]);
                        break;
                    case "C":
                        x1 = pickValue();
                        y1 = pickValue();
                        x2 = pickValue();
                        y2 = pickValue();
                        x = pickValue();
                        y = pickValue();
                        this._ops.push(['c', x1, y1, x2, y2, x, y]);
                        break;
                    case "s":
                        if (prevCommand === "c" || prevCommand === "C" ||
                            prevCommand === "s" || prevCommand === "S") {
                            // Reflection of the second control point on the previous command
                            x1 = x * 2 - x2;
                            y1 = y * 2 - y2;
                        } else {
                            x1 = x;
                            y1 = y;
                        }
                        x2 = pickValue() + x;
                        y2 = pickValue() + y;
                        x = pickValue() + x;
                        y = pickValue() + y;
                        this._ops.push(['c', x1, y1, x2, y2, x, y]);
                        break;
                    case "S":
                        if (prevCommand === "c" || prevCommand === "C" ||
                            prevCommand === "s" || prevCommand === "S") {
                            // Reflection of the second control point on the previous command
                            x1 = x * 2 - x2; 
                            y1 = y * 2 - y2;
                        } else {
                            x1 = x;
                            y1 = y;
                        }
                        x2 = pickValue();
                        y2 = pickValue();
                        x = pickValue();
                        y = pickValue();
                        this._ops.push(['c', x1, y1, x2, y2, x, y]);
                        break;
                    case "q":
                        x1 = pickValue() + x;
                        y1 = pickValue() + y;
                        x = pickValue() + x;
                        y = pickValue() + y;
                        this._ops.push(['q', x1, y1, x, y]);
                        break;
                    case "Q":
                        x1 = pickValue();
                        y1 = pickValue();
                        x = pickValue();
                        y = pickValue();
                        this._ops.push(['q', x1, y1, x, y]);
                        break;
                    case "t":
                        if (prevCommand === "q" || prevCommand === "Q" ||
                            prevCommand === "t" || prevCommand === "T") {
                            // Reflection of the second control point on the previous command
                            x1 = x * 2 - x1; 
                            y1 = y * 2 - y1;
                        } else {
                            x1 = x;
                            y1 = y;
                        }
                        x = pickValue() + x;
                        y = pickValue() + y;
                        this._ops.push(['q', x1, y1, x, y]);
                        break;
                    case "T":
                        if (prevCommand === "q" || prevCommand === "Q" ||
                            prevCommand === "t" || prevCommand === "T") {
                            // Reflection of the second control point on the previous command
                            x1 = x * 2 - x1; 
                            y1 = y * 2 - y1;
                        } else {
                            x1 = x;
                            y1 = y;
                        }
                        x = pickValue();
                        y = pickValue();
                        this._ops.push(['q', x1, y1, x, y]);
                        break;
                    case "a":
                    case "A":
                        pickValue();
                        pickValue();
                        pickValue();
                        pickValue();
                        pickValue();
                        pickValue();
                        pickValue();
                        console.warn("Elliptical arc is not supported yet");
                        break;
                    default:
                        pick();
                        continue;
                }
            }
            
            function pick() {
                next = d[offset+1];
                return d[offset++];
            }

            var _val;
            function pickValue() {
                next = d[offset+1];
                _val = d[offset++];
                return parseFloat(_val);
            }
        }
    });

    return SVGPath;
})