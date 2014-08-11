define( function(require){
    
    var exportsObject = {
	"CanvasRenderer": require('qtek-2d/CanvasRenderer'),
	"Gradient": require('qtek-2d/Gradient'),
	"LinearGradient": require('qtek-2d/LinearGradient'),
	"Node": require('qtek-2d/Node'),
	"Pattern": require('qtek-2d/Pattern'),
	"RadialGradient": require('qtek-2d/RadialGradient'),
	"Style": require('qtek-2d/Style'),
	"context": {
		"BezierCurveSegment": require('qtek-2d/context/BezierCurveSegment'),
		"CanvasElement": require('qtek-2d/context/CanvasElement'),
		"CanvasImage": require('qtek-2d/context/CanvasImage'),
		"CanvasPath": require('qtek-2d/context/CanvasPath'),
		"CanvasPointCloud": require('qtek-2d/context/CanvasPointCloud'),
		"CanvasSubpath": require('qtek-2d/context/CanvasSubpath'),
		"Context2D": require('qtek-2d/context/Context2D'),
		"DeferredPainter": require('qtek-2d/context/DeferredPainter'),
		"DrawingStyle": require('qtek-2d/context/DrawingStyle'),
		"Geometry2D": require('qtek-2d/context/Geometry2D'),
		"ImageRenderable": require('qtek-2d/context/ImageRenderable'),
		"LineSegment": require('qtek-2d/context/LineSegment'),
		"Painter": require('qtek-2d/context/Painter'),
		"PathRenderable": require('qtek-2d/context/PathRenderable'),
		"PointCloudPrimitive": require('qtek-2d/context/PointCloudPrimitive'),
		"Polygon": require('qtek-2d/context/Polygon'),
		"Renderable2D": require('qtek-2d/context/Renderable2D'),
		"States": require('qtek-2d/context/States'),
		"tool": {
			"CachedList": require('qtek-2d/context/tool/CachedList'),
			"GJK": require('qtek-2d/context/tool/GJK'),
			"ImageAtlas": require('qtek-2d/context/tool/ImageAtlas'),
			"SplayTree": require('qtek-2d/context/tool/SplayTree'),
			"Triangulation2": require('qtek-2d/context/tool/Triangulation2'),
			"color": require('qtek-2d/context/tool/color'),
			"math": require('qtek-2d/context/tool/math')
		}
	},
	"loader": {
		"SVG": require('qtek-2d/loader/SVG')
	},
	"picking": {
		"Box": require('qtek-2d/picking/Box'),
		"Pixel": require('qtek-2d/picking/Pixel')
	},
	"shape": {
		"Circle": require('qtek-2d/shape/Circle'),
		"Ellipse": require('qtek-2d/shape/Ellipse'),
		"Image": require('qtek-2d/shape/Image'),
		"Line": require('qtek-2d/shape/Line'),
		"Path": require('qtek-2d/shape/Path'),
		"Polygon": require('qtek-2d/shape/Polygon'),
		"Rectangle": require('qtek-2d/shape/Rectangle'),
		"RoundedRectangle": require('qtek-2d/shape/RoundedRectangle'),
		"SVGPath": require('qtek-2d/shape/SVGPath'),
		"Text": require('qtek-2d/shape/Text'),
		"TextBox": require('qtek-2d/shape/TextBox')
	},
	"util": require('qtek-2d/util')
};
    
    return exportsObject;
})