define( function(require){
    
    var exportsObject = {
	"BezierCurveSegment": require('qtek-2d/BezierCurveSegment'),
	"CanvasElement": require('qtek-2d/CanvasElement'),
	"CanvasImage": require('qtek-2d/CanvasImage'),
	"CanvasPath": require('qtek-2d/CanvasPath'),
	"CanvasPointCloud": require('qtek-2d/CanvasPointCloud'),
	"CanvasSubpath": require('qtek-2d/CanvasSubpath'),
	"Context2D": require('qtek-2d/Context2D'),
	"DeferredPainter": require('qtek-2d/DeferredPainter'),
	"DrawingStyle": require('qtek-2d/DrawingStyle'),
	"Geometry2D": require('qtek-2d/Geometry2D'),
	"ImageRenderable": require('qtek-2d/ImageRenderable'),
	"LineSegment": require('qtek-2d/LineSegment'),
	"Painter": require('qtek-2d/Painter'),
	"PathRenderable": require('qtek-2d/PathRenderable'),
	"PointCloudPrimitive": require('qtek-2d/PointCloudPrimitive'),
	"Polygon": require('qtek-2d/Polygon'),
	"Renderable2D": require('qtek-2d/Renderable2D'),
	"States": require('qtek-2d/States'),
	"tool": {
		"CachedList": require('qtek-2d/tool/CachedList'),
		"GJK": require('qtek-2d/tool/GJK'),
		"ImageAtlas": require('qtek-2d/tool/ImageAtlas'),
		"SplayTree": require('qtek-2d/tool/SplayTree'),
		"Triangulation2": require('qtek-2d/tool/Triangulation2'),
		"color": require('qtek-2d/tool/color'),
		"math": require('qtek-2d/tool/math')
	}
};
    
    return exportsObject;
})