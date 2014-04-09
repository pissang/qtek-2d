define(function() {

    var mathTool = {

        area : function(points) {
            // Signed polygon area
            var n = points.length / 2;
            if (n < 3) {
                return 0;
            }
            var area = 0;
            for (var i = (n - 1) * 2, j = 0; j < n * 2;) {
                var x0 = points[i];
                var y0 = points[i + 1];
                var x1 = points[j];
                var y1 = points[j + 1];
                i = j;
                j += 2;
                area += x0 * y1 - x1 * y0;
            }

            return area;
        },

        isCCW : function(points) {
            return this.area(points) < 0;
        },

        triangleArea : function(x0, y0, x1, y1, x2, y2) {
            return (x1 - x0) * (y2 - y1) - (y1 - y0) * (x2 - x1);
        },

        isTriangleConvex : function(x0, y0, x1, y1, x2, y2) {
            // Cross product edge 01 and edge 12
            return (x1 - x0) * (y2 - y1) - (y1 - y0) * (x2 - x1) < 0;
        },

        isPointInTriangle : function(x0, y0, x1, y1, x2, y2, xi, yi) {
            return mathTool.isTriangleConvex(x0, y0, xi, yi, x2, y2)
                && mathTool.isTriangleConvex(x1, y1, xi, yi, x0, y0)
                && mathTool.isTriangleConvex(x1, y1, x2, y2, xi, yi);
        },

        // PENDING
        approxEqualInt : function(a, b) {
            return Math.abs(a - b) < 0.1;
        },

        approxEqual : function(a, b) {
            return Math.abs(a - b) < 1e-5;
        },

        reverse : function(points, n, stride) {
            for (var i = 0; i < Math.floor(n / 2); i++) {
                for (var j = 0; j < stride; j++) {
                    var a = i * stride + j;
                    var b = (n - i - 1) * stride + j;
                    var tmp = points[a];
                    points[a] = points[b];
                    points[b] = tmp;
                }
            }

            return points;
        }

    }

    return mathTool;
});