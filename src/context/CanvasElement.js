// Class of canvas elements
define(function(require) {

    var CanvasElement = function() {
    };

    var canvasElementMustImplementsMethods = ['hasFill', 'hasStroke', 'getHashKey', 'updateVertices'];
    var primitiveMustImplementsMethods = ['updateElements', 'addElement', 'clearElements'];

    CanvasElement._factories = [];
    var _factories = CanvasElement._factories;

    CanvasElement.register = function(elClass, fillPrimClass, strokePrimClass) {
        if (elClass && !CanvasElement._checkElementClass(elClass)) {
            return;
        }
        if (fillPrimClass && !CanvasElement._checkPrimitiveClass(fillPrimClass)) {
            return;
        }
        if (strokePrimClass && !CanvasElement._checkPrimitiveClass(strokePrimClass)) {
            return;
        }

        var eType = _factories.length;
        _factories.push({
            fElement : elClass,
            fFillPrimitive : fillPrimClass,
            fStrokePrimitive : strokePrimClass
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

    CanvasElement.setFillPrimitiveClass = function(eType, primClass) {
        if (!CanvasElement._checkPrimitiveClass(primClass)) {
            return;
        }
        var item = _factories[eType]
        if (item) {
            item.fFillPrimitive = primClass;
        }
    }
    
    CanvasElement.setStrokePrimitiveClass = function(eType, primClass) {
        if (!CanvasElement._checkPrimitiveClass(primClass)) {
            return;
        }
        var item = _factories[eType]
        if (item) {
            item.fStrokePrimitive = primClass;
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

    CanvasElement.getFillPrimitiveClass = function(eType) {
        var item = _factories[eType];
        if (item) {
            return item.fFillPrimitive;
        }
    }

    CanvasElement.getStrokePrimitiveClass = function(eType) {
        var item = _factories[eType];
        if (item) {
            return item.fStrokePrimitive;
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

    CanvasElement.createFillPrimitive = function(eType) {
        var item = _factories[eType];
        if (item) {
            return new item.fFillPrimitive();
        }
    }

    CanvasElement.createStrokePrimitive = function(eType) {
        var item = _factories[eType];
        if (item) {
            return new item.fStrokePrimitive();
        }
    }

    CanvasElement.getClassNumber = function() {
        return _factories.length;
    }

    return CanvasElement;
});