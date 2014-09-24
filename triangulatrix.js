(function() {

    function Vertex(x, y) {
        this.x = x;
        this.y = y;
    }

    function Edge(v1, v2) {
        this.vertices = [v1, v2];
    }

    /* Edges are equivalent if they have the same two vertices. The order of the vertices is not important */
    Edge.prototype.equals = function(edge2) {
        var v00x = this.vertices[0].x;
        var v00y = this.vertices[0].y;
        var v01x = this.vertices[1].x;
        var v01y = this.vertices[1].y;
        var v10x = edge2.vertices[0].x;
        var v10y = edge2.vertices[0].y;
        var v11x = edge2.vertices[1].x;
        var v11y = edge2.vertices[1].y;

        if ((v00x === v10x && v00y === v10y) && (v01x === v11x && v01y === v11y)) {
            return true;
        }
        return (v00x === v11x && v00y === v11y) && (v01x === v10x && v01y === v10y);
    };

    function Triangle (v1, v2, v3) {
        this.vertices = [v1, v2, v3];
        this.circumcenter = new Vertex(0, 0);
        this.circumradius = 0;
        this.findCircumcircle();
    }

    /* The circumcircle is defined by the circumcenter and circumradius.
     * Wikipedia gives equations for the circumcenter, so I'll use them:
     * http://en.wikipedia.org/wiki/Circumscribed_circle#Circumcenter_coordinates (19/09/2014) */
    Triangle.prototype.findCircumcircle = function() {
        var Ax = 0;
        var Ay = 0;
        var Bx = this.vertices[1].x - this.vertices[0].x;
        var By = this.vertices[1].y - this.vertices[0].y;
        var Cx = this.vertices[2].x - this.vertices[0].x;
        var Cy = this.vertices[2].y - this.vertices[0].y;
        var D = 2 * (Bx * Cy - By * Cx);
        var E = Cy * (Bx * Bx + By * By) - By * (Cx * Cx + Cy * Cy);
        var F = Bx * (Cx * Cx + Cy * Cy) - Cx * (Bx * Bx + By * By);
        var dx, dy;

        // D = 0 corresponds to three collinear points and the circumcenter can be found by
        // taking the midpoint as the circumcenter.
        // Saw this here: https://gist.github.com/mutoo/5617691 (19/09/2014)
        if (Math.abs(D) < 0.0000001) {
            dx = (Math.max(Ax, Bx, Cx) - Math.min(Ax, Bx, Cx)) * 0.5;
            dy = (Math.max(Ay, By, Cy) - Math.min(Ay, By, Cy)) * 0.5;
            this.circumcenter.x = this.vertices[0].x + Math.min(Ax, Bx, Cx) + dx;
            this.circumcenter.y = this.vertices[0].y + Math.min(Ay, By, Cy) + dy;
            this.circumradius = Math.sqrt(dx * dx + dy * dy);
        } else {
            this.circumcenter.x = this.vertices[0].x + E / D;
            this.circumcenter.y = this.vertices[0].y + F / D;
            dx = this.circumcenter.x - this.vertices[0].x;
            dy = this.circumcenter.y - this.vertices[0].y;
            this.circumradius = Math.sqrt(dx * dx + dy * dy);
        }
    };

    Triangle.prototype.isInCircumcircle = function(vertex) {
        var a = vertex.x - this.circumcenter.x;
        var b = vertex.y - this.circumcenter.y;
        return (a * a + b * b <= this.circumradius * this.circumradius);
    };

    /* Test to see if the given vertex is inside this triangle.
     * Credit for this one goes to this thread:
     * http://www.gamedev.net/topic/295943-is-this-a-better-point-in-triangle-test-2d/ (19/09/2014) */
    Triangle.prototype.isInside = (function() {
        var sign = function (p1, p2, p3) {
            return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
        };

        return function(vertex) {
            var b1, b2, b3;
            b1 = sign(vertex, this.vertices[0], this.vertices[1]) < 0;
            b2 = sign(vertex, this.vertices[1], this.vertices[2]) < 0;
            b3 = sign(vertex, this.vertices[2], this.vertices[0]) < 0;
            return ((b1 === b2) && (b2 === b3));
        };
    })();

    /* Returns a pair of triangles that when combined cover the entire canvas with an extra 1px border on all sides
     * so that all points within the canvas are contained within these triangles */
    function generateSuperTriangles(width, height) {
        var v00 = new Vertex(-1, -1); //
        var v01 = new Vertex(-1, height);
        var v10 = new Vertex(width, -1);
        var v11 = new Vertex(width, height);
        var st1 = new Triangle(v00, v01, v11);
        var st2 = new Triangle(v00, v10, v11);
        return [st1, st2];
    }

    /* Removes both copies of edges that are duplicated in edges array.
     * Assumes that duplicate edges only come in pairs. Which is fine for us. */
    function removeDuplicateEdges(edges) {
        if (edges.length <= 1) {
            return edges;
        }
        for (var i = edges.length - 1; i--; ) {
            for (var j = edges.length - 1; j > i; j--) {
                if (edges[i].equals(edges[j])) {
                    // Note: Remove BOTH instances of duplicate edges
                    edges.splice(j, 1);
                    edges.splice(i, 1);
                    break;
                }
            }
        }
        return edges;
    }

    /* Generates a set of triangles that cover a rectangle of width by height through Incremental Delaunay
     * triangulation. */
    function generate(width, height, nVertices) {
        var triangleBuffer = generateSuperTriangles(width, height);

        var triangles = [];
        var vertices = [];
        var edges = [];

        // Generate the requested number of vertices
        // Add some vertices to the edges of the canvas to make the coverage around the border more
        // consistent with the rest of the image.
        for (var i = 0; i < Math.floor(Math.sqrt(nVertices) - 1); i++) {
            vertices.push(new Vertex(Math.floor(Math.random() * width), 0));
            vertices.push(new Vertex(Math.floor(Math.random() * width), height - 1));
            vertices.push(new Vertex(0, Math.floor(Math.random() * height)));
            vertices.push(new Vertex(width - 1, Math.floor(Math.random() * height)));
        }
        for (i = 0; i < nVertices; i++) {
            vertices.push(new Vertex(Math.floor(Math.random() * width), Math.floor(Math.random() * height)));
        }

        // TODO Check for, and do something about, duplicate vertices.

        // Sort vertices by ascending x value
        vertices.sort(function(v1, v2) {
            return v1.x - v2.x;
        });

        for (i = 0; i < vertices.length; i++) {
            edges = [];
            for (var j = triangleBuffer.length; j--;) {
                if (vertices[i].x > triangleBuffer[j].circumcenter.x + triangleBuffer[j].circumradius) {
                    // If vertex.x is past the range of the triangles circumcircle, move the triangle over to the
                    // triangles array and remove it from this triangleBuffer array. It's done.
                    triangles.push(triangleBuffer[j]);
                    triangleBuffer.splice(j, 1);
                } else {
                    // If vertex is in a triangles circumcircle, remove the triangle
                    // and add its edges to the edges list
                    if (triangleBuffer[j].isInCircumcircle(vertices[i])) {
                        edges.push(new Edge(triangleBuffer[j].vertices[0], triangleBuffer[j].vertices[1]));
                        edges.push(new Edge(triangleBuffer[j].vertices[0], triangleBuffer[j].vertices[2]));
                        edges.push(new Edge(triangleBuffer[j].vertices[1], triangleBuffer[j].vertices[2]));
                        triangleBuffer.splice(j, 1);
                    }
                }
            }

            // Remove duplicate entries in edges
            edges = removeDuplicateEdges(edges);

            // For all the edges left create a new triangle using the two edge vertices and the new vertex
            for (j = 0; j < edges.length; j++) {
                triangleBuffer.push(new Triangle(vertices[i], edges[j].vertices[0], edges[j].vertices[1]));
            }
        }

        // Add the remaining triangles from the triangleBuffer to the triangle array
        triangles = triangles.concat(triangleBuffer);

        // Remove triangles that contain vertices from the superTriangles
//        for (i = triangles.length; i--; ) {
//            for (var j = 0; j < triangles[i].vertices.length; j++) {
//                if (triangles[i].vertices[j].x < 0 || triangles[i].vertices[j].x >= width) {
//                    triangles.splice(i, 1);
//                    break;
//                }
//            }
//        }

        return triangles;
    }

    function limit(val, min, max) {
        return Math.max(Math.min(val, max), min);
    }

    function drawImage(image, canvas, opts) {
        var w = image.width;
        var h = image.height;

        var triangles = generate(w, h, opts.nVertices);

        var imgCanvas = document.createElement('canvas');
        imgCanvas.width = w;
        imgCanvas.height = h;
        var imgCtx = imgCanvas.getContext('2d');
        imgCtx.drawImage(image, 0, 0, w, h);

        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFF';
        ctx.fillRect(0, 0, w, h);
        ctx.lineWidth = 1;

        var imgData = imgCtx.getImageData(0, 0, w, h);
        var tempVertex = new Vertex(0, 0);
        var r = 0;
        var g = 0;
        var b = 0;
        var n = 0;
        var xS, xE, yS, yE;

        for (var i = 0; i < triangles.length; i++) {
            r = 0;
            g = 0;
            b = 0;
            n = 0;

            // Only bother testing pixels within the triangles bounding square
            xS = Math.floor(Math.min(triangles[i].vertices[0].x, triangles[i].vertices[1].x, triangles[i].vertices[2].x));
            xE = Math.ceil(Math.max(triangles[i].vertices[0].x, triangles[i].vertices[1].x, triangles[i].vertices[2].x));
            yS = Math.floor(Math.min(triangles[i].vertices[0].y, triangles[i].vertices[1].y, triangles[i].vertices[2].y));
            yE = Math.ceil(Math.max(triangles[i].vertices[0].y, triangles[i].vertices[1].y, triangles[i].vertices[2].y));
            xS = Math.max(xS, 0);
            xE = Math.min(xE, w - 1);
            yS = Math.max(yS, 0);
            yE = Math.min(yE, h - 1);

            // Get the 'average' color within the triangle
            for (var x = xS; x <= xE; x++) {
                tempVertex.x = x;
                for (var y = yS; y <= yE; y++) {
                    tempVertex.y = y;
                    if (triangles[i].isInside(tempVertex)) {
                        if (n === 0) {
                            r = imgData.data[(x + y * w) * 4];
                            g = imgData.data[(x + y * w) * 4 + 1];
                            b = imgData.data[(x + y * w) * 4 + 2];
                        } else {
                            r = (r + (imgData.data[(x + y * w) * 4] / n)) * n / (n + 1);
                            g = (g + (imgData.data[(x + y * w) * 4 + 1] / n)) * n / (n + 1);
                            b = (b + (imgData.data[(x + y * w) * 4 + 2] / n)) * n / (n + 1);
                        }
                        n++;
                    }
                }
            }

            // If no pixels were found in this triangle, just make it invisible
            var alpha = 1;
            if (n === 0) {
                alpha = 0;
            }

            // Set the colors and draw that triangle
            ctx.fillStyle = 'rgba(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ',' + alpha + ')';
            ctx.strokeStyle = ctx.fillStyle;
            ctx.beginPath();
            ctx.moveTo(triangles[i].vertices[2].x, triangles[i].vertices[2].y);
            for (var j = 0; j < 3; j++) {
                ctx.lineTo(triangles[i].vertices[j].x, triangles[i].vertices[j].y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }

        return canvas;
    }

    function drawRandom(canvas, opts) {
        // TODO Make some default options
        // Require a canvas? Take an optional canvas?

        var width = opts.width;
        var height = opts.height;

        var triangles = generate(width, height, opts.nVertices);

        // Sort out the canvas
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext('2d');

        // Fill in background color
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#000';

        // Some variables
        var h, s, l;

        // Draw all the triangles
        for (var i = 0; i < triangles.length; i++) {
            // Generate a random color within the limits given
            h = Math.round(opts.h1 + Math.random() * (opts.h2 - opts.h1));
            h = limit(h, 0, 360);
            s = Math.round(opts.s1 + Math.random() * (opts.s2 - opts.s1));
            s = limit(s, 0, 100);
            l = Math.round(opts.l1 + Math.random() * (opts.l2 - opts.l1));
            l = limit(l, 0, 100);
            ctx.fillStyle = 'hsl(' + h + ',' + s + '%,' + l + '%)';
            if (!opts.mesh) {
                ctx.strokeStyle = ctx.fillStyle;
            }

            // Draw the triangle
            ctx.beginPath();
            ctx.moveTo(triangles[i].vertices[2].x, triangles[i].vertices[2].y);
            for (var j = 0; j < 3; j++) {
                ctx.lineTo(triangles[i].vertices[j].x, triangles[i].vertices[j].y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }

        return canvas;
    }

    window.triangulatrix = {
        generate : generate,
        drawImage : drawImage,
        drawRandom : drawRandom
    }

})();