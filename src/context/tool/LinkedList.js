/**
 * Simple double linked list
 */
define(function(require) {
    
    var LinkedList = function() {

        this.head = null;

        this.tail = null;

        this._length = 0;
    }

    LinkedList.prototype.insert = function(val) {
        var item = new LinkedList.Item(val);
        if (!this.head) {
            this.head = this.tail = item;
        } else {
            this.tail.next = item;
            item.prev = this.tail;
            this.tail = item;
        }
        this._length++;
        return item;
    }

    LinkedList.prototype.remove = function(item) {
        var prev = item.prev;
        var next = item.next;
        if (prev) {
            prev.next = next;
        } else {
            // Is head
            this.head = next;
        }
        if (next) {
            next.prev = prev;
        } else {
            // Is tail
            this.tail = prev;
        }
        item.next = item.prev = null;
        this._length--;
    }

    LinkedList.prototype.removeAt = function(idx) {
        if (idx < 0) {
            return;
        }
        var curr = this.head;
        var cursor = 0;
        while (curr && cursor < idx) {
            curr = curr.next;
            cursor++;
        }
        if (curr) {
            this.remove(curr);
            return curr.value;
        }
    }

    LinkedList.prototype.getHead = function() {
        if (this.head) {
            return this.head.value;
        }
    }

    LinkedList.prototype.getTail = function() {
        if (this.tail) {
            return this.tail.value;
        }
    }

    LinkedList.prototype.getAt = function(idx) {
        if (idx < 0) {
            return;
        }
        var curr = this.head;
        var cursor = 0;
        while (curr && cursor < idx) {
            curr = curr.next;
            cursor++;
        }
        return curr.value;
    }

    LinkedList.prototype.indexOf = function(value) {
        var curr = this.head;
        var cursor = 0;
        while (curr) {
            if (curr.value === value) {
                return cursor;
            }
            curr = curr.next;
            cursor++;
        }
    }

    LinkedList.prototype.length = function() {
        return this._length;
    }

    LinkedList.prototype.isEmpty = function() {
        return this._length == 0;
    }

    LinkedList.prototype.forEach = function(f, context) {
        var curr = this.head;
        var idx = 0;
        var haveContext = typeof(context) != 'undefined';
        while (curr) {
            if (haveContext) {
                f.call(context, curr.value, idx);
            } else {
                f(curr.value, idx);
            }
            curr = curr.next;
            idx++;
        }
    }

    LinkedList.prototype.clear = function() {
        this.tail = this.head = null;
        this._length = 0;
    }

    LinkedList.Item = function(val) {

        this.value = val;

        this.next = null;

        this.prev = null;
    }

    return LinkedList;
})