// Convex hull intersection using GJK algorithm
// http://physics2d.com/content/gjk-algorithm
// http://mollyrocket.com/849
define(function(require) {

    var mathUtil = require('./math');

    var GJK = function() {

        // Direction
        this._D = [0, 0];

        // Farthest point on the direction
        // In Minkowski Difference space
        this._S = [0, 0];
    }

    GJK.prototype.intersect = function(ch0, ch1) {

        var D = this._D;
        var S = this._S;

        // Random pick a direction
        D[0] = ch0[0] - ch1[0];
        D[1] = ch0[1] - ch1[1];
        this._support(ch0, ch1, D, S);
        D[0] = -S[0];
        D[1] = -S[1];

        var simplex = S.slice();

        while (true) {
            // PENDING
            this._support(ch0, ch1, D, S);
            if (D[0] * S[0] + D[1] * S[1] <= 0) {
                return false;
            }
            simplex.push(S[0]);
            simplex.push(S[1]);

            var isIntersect = this._updateSimplex(simplex, D);
            if (isIntersect) {
                return true;
            }
        }
    }


    var ac = [0, 0];
    var ab = [0, 0];
    // Update simplex and direction
    GJK.prototype._updateSimplex = function(simplex, D) {
        var n = simplex.length / 2;
        switch(n) {
            // Simplex 1
            case 2:
                var ax = simplex[2];
                var ay = simplex[3];
                var bx = simplex[0];
                var by = simplex[1];
                // Vector ab
                ab[0] = bx - ax;
                ab[1] = by - ay;

                if (ab[0] * -ax + ab[1] * -ay < 0) {
                    // Remove point b
                    simplex.shift();
                    simplex.shift();

                    D[0] = -ax;
                    D[1] = -ay;
                } else {
                    if (-ab[1] * -ax + ab[0] * -ay > 0) {
                        D[0] = -ab[1];
                        D[1] = ab[0];
                    } else {
                        D[0] = ab[1];
                        D[1] = -ab[0];
                    }
                }
                break;
            // Simplex 2
            case 3:
                var ax = simplex[4], ay = simplex[5];
                var bx = simplex[2], by = simplex[3];
                var cx = simplex[0], cy = simplex[1];

                if (!mathUtil.isTriangleConvex(ax, ay, cx, cy, bx, by)) {
                    // swap b, c
                    bx = simplex[0]; by = simplex[1];
                    cx = simplex[2]; cy = simplex[3];
                }

                ac[0] = cx - ax; ac[1] = cy - ay;
                ab[0] = bx - ax; ab[1] = by - ay;
                // if 0 is on the right side of ac
                if (!mathUtil.isTriangleConvex(0, 0, ax, ay, cx, cy)) {
                    // if O is ahead of the point a on the line ac
                    if (-ax * ac[0] + -ay * ac[1] > 0) {
                        simplex.length = 4;
                        simplex[0] = cx; simplex[1] = cy;
                        simplex[2] = ax; simplex[3] = ay;
                        if (-ac[1] * -ax + ac[0] * -ay > 0) {
                            D[0] = -ac[1];
                            D[1] = ac[0];
                        } else {
                            D[0] = ac[1];
                            D[1] = -ac[0];
                        }
                    }
                    // O is behind a on the line ac
                    else {
                        simplex.length = 2;
                        simplex[0] = ax; simplex[1] = ay;

                        D[0] = -ax;
                        D[1] = -ay;
                    }
                }
                //if O is to the left of ab
                else if (mathUtil.isTriangleConvex(0, 0, ax, ay, bx, by)) {
                    if (ab[0] * -ax + ab[1] * -ay > 0) {
                        simplex.length = 4;
                        simplex[0] = bx; simplex[1] = by;
                        simplex[2] = ax; simplex[3] = ay;
                        if (-ab[1] * -ax + ab[0] * -ay > 0) {
                            D[0] = -ab[1];
                            D[1] = ab[0];
                        } else {
                            D[0] = ab[1];
                            D[1] = -ab[0];
                        }
                    } else {
                        simplex.length = 2;
                        simplex[0] = ax; simplex[1] = ay;

                        D[0] = -ax;
                        D[1] = -ay;
                    }
                }
                // Intersect
                else {
                    return true;
                }
                break;
        }
    }
    
    // Support mapping in Minkowski Difference
    // ch1 - ch0
    GJK.prototype._support = function(ch0, ch1, D, out) {
        var max = -Infinity;

        var x0, y0, x1, y1;
        for (var i = 0; i < ch0.length;) {
            var x = ch0[i++];
            var y = ch0[i++];
            var projDist = x * -D[0] + y * -D[1];
            if (projDist > max) {
                max = projDist;
                x0 = x;
                y0 = y;
            }
        }

        max = -Infinity;
        for (i = 0; i < ch1.length;) {
            x = ch1[i++];
            y = ch1[i++];
            projDist = x * D[0] + y * D[1];
            if (projDist > max) {
                max = projDist;
                x1 = x;
                y1 = y;
            }
        }

        out[0] = x1 - x0;
        out[1] = y1 - y0;

        return out;
    }

    return GJK;
});