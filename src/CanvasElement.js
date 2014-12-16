// Class of canvas elements
define(function(require) {

    var CanvasElement = function() {
    };

    var canvasElementMustImplementsMethods = ['hasFill', 'hasStroke', 'getHashKey', 'updateVertices', 'afterDraw'];
    var renderableMustImplementsMethods = ['updateElements', 'addElement', 'clearElements'];

    CanvasElement._factories = [];
    var _factories = CanvasElement._factories;

    CanvasElement.register = function(elClass, renderableClass) {
        if (elClass && !CanvasElement._checkElementClass(elClass)) {
            return;
        }
        if (renderableClass && !CanvasElement._checkRenderableClass(renderableClass)) {
            return;
        }

        var eType = _factories.length;
        _factories.push({
            fElement : elClass,
            fRenderable : renderableClass
        });

        return eType;
    }

    CanvasElement._checkElementClass = function(elClass) {
        var result = true;
        for (var i = 0; i < canvasElementMustImplementsMethods.length; i++) {
            var name = canvasElementMustImplementsMethods[i];
            if (typeof(elClass.prototype[name]) == 'undefined') {
                console.warn(name + ' method must be implemented in Element');
                result = false;
            }
        }
        return result;
    }

    CanvasElement._checkRenderableClass = function(renderableClass) {
        var result = true;
        for (var i = 0; i < renderableMustImplementsMethods.length; i++) {
            var name = renderableMustImplementsMethods[i];
            if (typeof(renderableClass.prototype[name]) == 'undefined') {
                console.warn(name + ' method must be implemented in Element');
                result = false;
            }
        }
        return result;
    }

    CanvasElement.setRenderableClass = function(eType, renderableClass) {
        if (!CanvasElement._checkRenderableClass(renderableClass)) {
            return;
        }
        var item = _factories[eType]
        if (item) {
            item.fRenderable = renderableClass;
        }
    }
    
    CanvasElement.setElementClass = function(eType, elClass) {
        if (!CanvasElement._checkElementClass(elClass)) {
            return;
        }
        var item = _factories[eType]
        if (item) {
            item.fElement = elClass;
        }
    }

    CanvasElement.getRenderableClass = function(eType) {
        var item = _factories[eType];
        if (item) {
            return item.fRenderable;
        }
    }

    CanvasElement.getElementClass = function(eType) {
        var item = _factories[eType];
        if (item) {
            return item.fElement;
        }
    }

    CanvasElement.createElement = function(eType) {
        var item = _factories[eType];
        if (item) {
            return new item.fElement();
        }
    }

    CanvasElement.createRenderable = function(eType) {
        var item = _factories[eType];
        if (item) {
            return new item.fRenderable();
        }
    }

    CanvasElement.getClassNumber = function() {
        return _factories.length;
    }

    return CanvasElement;
});