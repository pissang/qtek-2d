// Cached list of elements like CanvasPath, CanvasSubpath, CanvasImage, PathGeometry, ImageGeometry
// The objects in list will not be destroyed immediately after clear
define(function(require) {

    'use strict';

    var CachedList = function(factory, maxRange) {

        this.factory = factory;

        this.maxRange = maxRange || 50;

        this._size = 0;

        this._data = [];

        this._max = 0;
        
        this._needsClearCount = 0;
    }

    CachedList.prototype = {

        constructor : CachedList,

        increase : function() {
            var el = this._data[this._size];
            if (!el) {
                el = this._data[this._size] = new this.factory();
            }
            this._size++;
            return el;
        },

        decrease : function() {
            if (this._size > 0) {
                this._size--;
            }
        },

        clear : function(disposeFunc) {
            this.tick(disposeFunc);
            this._size = 0;
        },

        // Simple strategy to prevent memory leak
        // When subpath number is less than 1/2 of maximum 10 times
        // the size of cache will be reduced to current size
        // 
        // Callback for dispose
        tick : function(disposeFunc) {
            if (
                (this._size > 0 && this._max / this._size > 2)
                || this._max - this._size > this.maxRange
            ) {
                this._needsClearCount ++;
            } else if (this._max < this._size) {
                this._needsClearCount = 0;
                this._max = this._size;
            } else {
                this._needsClearCount = 0;
            }
            if (this._needsClearCount > 10) {
                if (disposeFunc) {
                    // Callback to do dispose
                    for (var i = this._size; i < this._data.length; i++) {
                        disposeFunc(this._data[i]);
                    }
                }
                this._max = this._data.length = this._size;
            }
        },

        size : function() {
            return this._size;
        },

        data : function() {
            return this._data;
        },

        get : function(idx) {
            return this._data[idx];
        }
    }

    return CachedList;
});