// Class of canvas elements
define(function(require) {

    var CanvasElement = function() {
    };

    var canvasElementMustImplementsMethods = ['hasFill', 'hasStroke', 'getHashKey', 'updateVertices', 'afterDraw'];
    var primitiveMustImplementsMethods = ['updateElements', 'addElement', 'clearElements'];

    CanvasElement._factories = [];
    var _factories = CanvasElement._factories;

    CanvasElement.register = function(elClass, primClass) {
        if (elClass && !CanvasElement._checkElementClass(elClass)) {
            return;
        }
        if (primClass && !CanvasElement._checkPrimitiveClass(primClass)) {
            return;
        }

        var eType = _factories.length;
        _factories.push({
            fElement : elClass,
            fPrimitive : primClass
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

    CanvasElement._checkPrimitiveClass = function(primClass) {
        var result = true;
        for (var i = 0; i < primitiveMustImplementsMethods.length; i++) {
            var name = primitiveMustImplementsMethods[i];
            if (typeof(primClass.prototype[name]) == 'undefined') {
                console.warn(name + ' method must be implemented in Element');
                result = false;
            }
        }
        return result;
    }

    CanvasElement.setPrimitiveClass = function(eType, primClass) {
        if (!CanvasElement._checkPrimitiveClass(primClass)) {
            return;
        }
        var item = _factories[eType]
        if (item) {
            item.fPrimitive = primClass;
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

    CanvasElement.getPrimitiveClass = function(eType) {
        var item = _factories[eType];
        if (item) {
            return item.fPrimitive;
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

    CanvasElement.createPrimitive = function(eType) {
        var item = _factories[eType];
        if (item) {
            return new item.fPrimitive();
        }
    }

    CanvasElement.getClassNumber = function() {
        return _factories.length;
    }

    return CanvasElement;
});