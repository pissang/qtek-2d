define(function(require) {

    var mathTool = require('./tool/math');

    var LineSegment = function(x0, y0, x1, y1) {

        this.type = LineSegment.type;

        this.thickness = 0;

        this.points = [x0, y0, x1, y1];
    }

    LineSegment.prototype.strokeSteps = 1;

    LineSegment.prototype.reverse = function() {
        mathTool.reverse(this.points, 2, 2);
    }

    LineSegment.type = 1;


    return LineSegment;
});