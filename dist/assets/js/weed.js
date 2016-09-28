/*! Hammer.JS - v2.0.7 - 2016-04-22
 * http://hammerjs.github.io/
 *
 * Copyright (c) 2016 Jorik Tangelder;
 * Licensed under the MIT license */
(function(window, document, exportName, undefined) {
  'use strict';

var VENDOR_PREFIXES = ['', 'webkit', 'Moz', 'MS', 'ms', 'o'];
var TEST_ELEMENT = document.createElement('div');

var TYPE_FUNCTION = 'function';

var round = Math.round;
var abs = Math.abs;
var now = Date.now;

/**
 * set a timeout with a given scope
 * @param {Function} fn
 * @param {Number} timeout
 * @param {Object} context
 * @returns {number}
 */
function setTimeoutContext(fn, timeout, context) {
    return setTimeout(bindFn(fn, context), timeout);
}

/**
 * if the argument is an array, we want to execute the fn on each entry
 * if it aint an array we don't want to do a thing.
 * this is used by all the methods that accept a single and array argument.
 * @param {*|Array} arg
 * @param {String} fn
 * @param {Object} [context]
 * @returns {Boolean}
 */
function invokeArrayArg(arg, fn, context) {
    if (Array.isArray(arg)) {
        each(arg, context[fn], context);
        return true;
    }
    return false;
}

/**
 * walk objects and arrays
 * @param {Object} obj
 * @param {Function} iterator
 * @param {Object} context
 */
function each(obj, iterator, context) {
    var i;

    if (!obj) {
        return;
    }

    if (obj.forEach) {
        obj.forEach(iterator, context);
    } else if (obj.length !== undefined) {
        i = 0;
        while (i < obj.length) {
            iterator.call(context, obj[i], i, obj);
            i++;
        }
    } else {
        for (i in obj) {
            obj.hasOwnProperty(i) && iterator.call(context, obj[i], i, obj);
        }
    }
}

/**
 * wrap a method with a deprecation warning and stack trace
 * @param {Function} method
 * @param {String} name
 * @param {String} message
 * @returns {Function} A new function wrapping the supplied method.
 */
function deprecate(method, name, message) {
    var deprecationMessage = 'DEPRECATED METHOD: ' + name + '\n' + message + ' AT \n';
    return function() {
        var e = new Error('get-stack-trace');
        var stack = e && e.stack ? e.stack.replace(/^[^\(]+?[\n$]/gm, '')
            .replace(/^\s+at\s+/gm, '')
            .replace(/^Object.<anonymous>\s*\(/gm, '{anonymous}()@') : 'Unknown Stack Trace';

        var log = window.console && (window.console.warn || window.console.log);
        if (log) {
            log.call(window.console, deprecationMessage, stack);
        }
        return method.apply(this, arguments);
    };
}

/**
 * extend object.
 * means that properties in dest will be overwritten by the ones in src.
 * @param {Object} target
 * @param {...Object} objects_to_assign
 * @returns {Object} target
 */
var assign;
if (typeof Object.assign !== 'function') {
    assign = function assign(target) {
        if (target === undefined || target === null) {
            throw new TypeError('Cannot convert undefined or null to object');
        }

        var output = Object(target);
        for (var index = 1; index < arguments.length; index++) {
            var source = arguments[index];
            if (source !== undefined && source !== null) {
                for (var nextKey in source) {
                    if (source.hasOwnProperty(nextKey)) {
                        output[nextKey] = source[nextKey];
                    }
                }
            }
        }
        return output;
    };
} else {
    assign = Object.assign;
}

/**
 * extend object.
 * means that properties in dest will be overwritten by the ones in src.
 * @param {Object} dest
 * @param {Object} src
 * @param {Boolean} [merge=false]
 * @returns {Object} dest
 */
var extend = deprecate(function extend(dest, src, merge) {
    var keys = Object.keys(src);
    var i = 0;
    while (i < keys.length) {
        if (!merge || (merge && dest[keys[i]] === undefined)) {
            dest[keys[i]] = src[keys[i]];
        }
        i++;
    }
    return dest;
}, 'extend', 'Use `assign`.');

/**
 * merge the values from src in the dest.
 * means that properties that exist in dest will not be overwritten by src
 * @param {Object} dest
 * @param {Object} src
 * @returns {Object} dest
 */
var merge = deprecate(function merge(dest, src) {
    return extend(dest, src, true);
}, 'merge', 'Use `assign`.');

/**
 * simple class inheritance
 * @param {Function} child
 * @param {Function} base
 * @param {Object} [properties]
 */
function inherit(child, base, properties) {
    var baseP = base.prototype,
        childP;

    childP = child.prototype = Object.create(baseP);
    childP.constructor = child;
    childP._super = baseP;

    if (properties) {
        assign(childP, properties);
    }
}

/**
 * simple function bind
 * @param {Function} fn
 * @param {Object} context
 * @returns {Function}
 */
function bindFn(fn, context) {
    return function boundFn() {
        return fn.apply(context, arguments);
    };
}

/**
 * let a boolean value also be a function that must return a boolean
 * this first item in args will be used as the context
 * @param {Boolean|Function} val
 * @param {Array} [args]
 * @returns {Boolean}
 */
function boolOrFn(val, args) {
    if (typeof val == TYPE_FUNCTION) {
        return val.apply(args ? args[0] || undefined : undefined, args);
    }
    return val;
}

/**
 * use the val2 when val1 is undefined
 * @param {*} val1
 * @param {*} val2
 * @returns {*}
 */
function ifUndefined(val1, val2) {
    return (val1 === undefined) ? val2 : val1;
}

/**
 * addEventListener with multiple events at once
 * @param {EventTarget} target
 * @param {String} types
 * @param {Function} handler
 */
function addEventListeners(target, types, handler) {
    each(splitStr(types), function(type) {
        target.addEventListener(type, handler, false);
    });
}

/**
 * removeEventListener with multiple events at once
 * @param {EventTarget} target
 * @param {String} types
 * @param {Function} handler
 */
function removeEventListeners(target, types, handler) {
    each(splitStr(types), function(type) {
        target.removeEventListener(type, handler, false);
    });
}

/**
 * find if a node is in the given parent
 * @method hasParent
 * @param {HTMLElement} node
 * @param {HTMLElement} parent
 * @return {Boolean} found
 */
function hasParent(node, parent) {
    while (node) {
        if (node == parent) {
            return true;
        }
        node = node.parentNode;
    }
    return false;
}

/**
 * small indexOf wrapper
 * @param {String} str
 * @param {String} find
 * @returns {Boolean} found
 */
function inStr(str, find) {
    return str.indexOf(find) > -1;
}

/**
 * split string on whitespace
 * @param {String} str
 * @returns {Array} words
 */
function splitStr(str) {
    return str.trim().split(/\s+/g);
}

/**
 * find if a array contains the object using indexOf or a simple polyFill
 * @param {Array} src
 * @param {String} find
 * @param {String} [findByKey]
 * @return {Boolean|Number} false when not found, or the index
 */
function inArray(src, find, findByKey) {
    if (src.indexOf && !findByKey) {
        return src.indexOf(find);
    } else {
        var i = 0;
        while (i < src.length) {
            if ((findByKey && src[i][findByKey] == find) || (!findByKey && src[i] === find)) {
                return i;
            }
            i++;
        }
        return -1;
    }
}

/**
 * convert array-like objects to real arrays
 * @param {Object} obj
 * @returns {Array}
 */
function toArray(obj) {
    return Array.prototype.slice.call(obj, 0);
}

/**
 * unique array with objects based on a key (like 'id') or just by the array's value
 * @param {Array} src [{id:1},{id:2},{id:1}]
 * @param {String} [key]
 * @param {Boolean} [sort=False]
 * @returns {Array} [{id:1},{id:2}]
 */
function uniqueArray(src, key, sort) {
    var results = [];
    var values = [];
    var i = 0;

    while (i < src.length) {
        var val = key ? src[i][key] : src[i];
        if (inArray(values, val) < 0) {
            results.push(src[i]);
        }
        values[i] = val;
        i++;
    }

    if (sort) {
        if (!key) {
            results = results.sort();
        } else {
            results = results.sort(function sortUniqueArray(a, b) {
                return a[key] > b[key];
            });
        }
    }

    return results;
}

/**
 * get the prefixed property
 * @param {Object} obj
 * @param {String} property
 * @returns {String|Undefined} prefixed
 */
function prefixed(obj, property) {
    var prefix, prop;
    var camelProp = property[0].toUpperCase() + property.slice(1);

    var i = 0;
    while (i < VENDOR_PREFIXES.length) {
        prefix = VENDOR_PREFIXES[i];
        prop = (prefix) ? prefix + camelProp : property;

        if (prop in obj) {
            return prop;
        }
        i++;
    }
    return undefined;
}

/**
 * get a unique id
 * @returns {number} uniqueId
 */
var _uniqueId = 1;
function uniqueId() {
    return _uniqueId++;
}

/**
 * get the window object of an element
 * @param {HTMLElement} element
 * @returns {DocumentView|Window}
 */
function getWindowForElement(element) {
    var doc = element.ownerDocument || element;
    return (doc.defaultView || doc.parentWindow || window);
}

var MOBILE_REGEX = /mobile|tablet|ip(ad|hone|od)|android/i;

var SUPPORT_TOUCH = ('ontouchstart' in window);
var SUPPORT_POINTER_EVENTS = prefixed(window, 'PointerEvent') !== undefined;
var SUPPORT_ONLY_TOUCH = SUPPORT_TOUCH && MOBILE_REGEX.test(navigator.userAgent);

var INPUT_TYPE_TOUCH = 'touch';
var INPUT_TYPE_PEN = 'pen';
var INPUT_TYPE_MOUSE = 'mouse';
var INPUT_TYPE_KINECT = 'kinect';

var COMPUTE_INTERVAL = 25;

var INPUT_START = 1;
var INPUT_MOVE = 2;
var INPUT_END = 4;
var INPUT_CANCEL = 8;

var DIRECTION_NONE = 1;
var DIRECTION_LEFT = 2;
var DIRECTION_RIGHT = 4;
var DIRECTION_UP = 8;
var DIRECTION_DOWN = 16;

var DIRECTION_HORIZONTAL = DIRECTION_LEFT | DIRECTION_RIGHT;
var DIRECTION_VERTICAL = DIRECTION_UP | DIRECTION_DOWN;
var DIRECTION_ALL = DIRECTION_HORIZONTAL | DIRECTION_VERTICAL;

var PROPS_XY = ['x', 'y'];
var PROPS_CLIENT_XY = ['clientX', 'clientY'];

/**
 * create new input type manager
 * @param {Manager} manager
 * @param {Function} callback
 * @returns {Input}
 * @constructor
 */
function Input(manager, callback) {
    var self = this;
    this.manager = manager;
    this.callback = callback;
    this.element = manager.element;
    this.target = manager.options.inputTarget;

    // smaller wrapper around the handler, for the scope and the enabled state of the manager,
    // so when disabled the input events are completely bypassed.
    this.domHandler = function(ev) {
        if (boolOrFn(manager.options.enable, [manager])) {
            self.handler(ev);
        }
    };

    this.init();

}

Input.prototype = {
    /**
     * should handle the inputEvent data and trigger the callback
     * @virtual
     */
    handler: function() { },

    /**
     * bind the events
     */
    init: function() {
        this.evEl && addEventListeners(this.element, this.evEl, this.domHandler);
        this.evTarget && addEventListeners(this.target, this.evTarget, this.domHandler);
        this.evWin && addEventListeners(getWindowForElement(this.element), this.evWin, this.domHandler);
    },

    /**
     * unbind the events
     */
    destroy: function() {
        this.evEl && removeEventListeners(this.element, this.evEl, this.domHandler);
        this.evTarget && removeEventListeners(this.target, this.evTarget, this.domHandler);
        this.evWin && removeEventListeners(getWindowForElement(this.element), this.evWin, this.domHandler);
    }
};

/**
 * create new input type manager
 * called by the Manager constructor
 * @param {Hammer} manager
 * @returns {Input}
 */
function createInputInstance(manager) {
    var Type;
    var inputClass = manager.options.inputClass;

    if (inputClass) {
        Type = inputClass;
    } else if (SUPPORT_POINTER_EVENTS) {
        Type = PointerEventInput;
    } else if (SUPPORT_ONLY_TOUCH) {
        Type = TouchInput;
    } else if (!SUPPORT_TOUCH) {
        Type = MouseInput;
    } else {
        Type = TouchMouseInput;
    }
    return new (Type)(manager, inputHandler);
}

/**
 * handle input events
 * @param {Manager} manager
 * @param {String} eventType
 * @param {Object} input
 */
function inputHandler(manager, eventType, input) {
    var pointersLen = input.pointers.length;
    var changedPointersLen = input.changedPointers.length;
    var isFirst = (eventType & INPUT_START && (pointersLen - changedPointersLen === 0));
    var isFinal = (eventType & (INPUT_END | INPUT_CANCEL) && (pointersLen - changedPointersLen === 0));

    input.isFirst = !!isFirst;
    input.isFinal = !!isFinal;

    if (isFirst) {
        manager.session = {};
    }

    // source event is the normalized value of the domEvents
    // like 'touchstart, mouseup, pointerdown'
    input.eventType = eventType;

    // compute scale, rotation etc
    computeInputData(manager, input);

    // emit secret event
    manager.emit('hammer.input', input);

    manager.recognize(input);
    manager.session.prevInput = input;
}

/**
 * extend the data with some usable properties like scale, rotate, velocity etc
 * @param {Object} manager
 * @param {Object} input
 */
function computeInputData(manager, input) {
    var session = manager.session;
    var pointers = input.pointers;
    var pointersLength = pointers.length;

    // store the first input to calculate the distance and direction
    if (!session.firstInput) {
        session.firstInput = simpleCloneInputData(input);
    }

    // to compute scale and rotation we need to store the multiple touches
    if (pointersLength > 1 && !session.firstMultiple) {
        session.firstMultiple = simpleCloneInputData(input);
    } else if (pointersLength === 1) {
        session.firstMultiple = false;
    }

    var firstInput = session.firstInput;
    var firstMultiple = session.firstMultiple;
    var offsetCenter = firstMultiple ? firstMultiple.center : firstInput.center;

    var center = input.center = getCenter(pointers);
    input.timeStamp = now();
    input.deltaTime = input.timeStamp - firstInput.timeStamp;

    input.angle = getAngle(offsetCenter, center);
    input.distance = getDistance(offsetCenter, center);

    computeDeltaXY(session, input);
    input.offsetDirection = getDirection(input.deltaX, input.deltaY);

    var overallVelocity = getVelocity(input.deltaTime, input.deltaX, input.deltaY);
    input.overallVelocityX = overallVelocity.x;
    input.overallVelocityY = overallVelocity.y;
    input.overallVelocity = (abs(overallVelocity.x) > abs(overallVelocity.y)) ? overallVelocity.x : overallVelocity.y;

    input.scale = firstMultiple ? getScale(firstMultiple.pointers, pointers) : 1;
    input.rotation = firstMultiple ? getRotation(firstMultiple.pointers, pointers) : 0;

    input.maxPointers = !session.prevInput ? input.pointers.length : ((input.pointers.length >
        session.prevInput.maxPointers) ? input.pointers.length : session.prevInput.maxPointers);

    computeIntervalInputData(session, input);

    // find the correct target
    var target = manager.element;
    if (hasParent(input.srcEvent.target, target)) {
        target = input.srcEvent.target;
    }
    input.target = target;
}

function computeDeltaXY(session, input) {
    var center = input.center;
    var offset = session.offsetDelta || {};
    var prevDelta = session.prevDelta || {};
    var prevInput = session.prevInput || {};

    if (input.eventType === INPUT_START || prevInput.eventType === INPUT_END) {
        prevDelta = session.prevDelta = {
            x: prevInput.deltaX || 0,
            y: prevInput.deltaY || 0
        };

        offset = session.offsetDelta = {
            x: center.x,
            y: center.y
        };
    }

    input.deltaX = prevDelta.x + (center.x - offset.x);
    input.deltaY = prevDelta.y + (center.y - offset.y);
}

/**
 * velocity is calculated every x ms
 * @param {Object} session
 * @param {Object} input
 */
function computeIntervalInputData(session, input) {
    var last = session.lastInterval || input,
        deltaTime = input.timeStamp - last.timeStamp,
        velocity, velocityX, velocityY, direction;

    if (input.eventType != INPUT_CANCEL && (deltaTime > COMPUTE_INTERVAL || last.velocity === undefined)) {
        var deltaX = input.deltaX - last.deltaX;
        var deltaY = input.deltaY - last.deltaY;

        var v = getVelocity(deltaTime, deltaX, deltaY);
        velocityX = v.x;
        velocityY = v.y;
        velocity = (abs(v.x) > abs(v.y)) ? v.x : v.y;
        direction = getDirection(deltaX, deltaY);

        session.lastInterval = input;
    } else {
        // use latest velocity info if it doesn't overtake a minimum period
        velocity = last.velocity;
        velocityX = last.velocityX;
        velocityY = last.velocityY;
        direction = last.direction;
    }

    input.velocity = velocity;
    input.velocityX = velocityX;
    input.velocityY = velocityY;
    input.direction = direction;
}

/**
 * create a simple clone from the input used for storage of firstInput and firstMultiple
 * @param {Object} input
 * @returns {Object} clonedInputData
 */
function simpleCloneInputData(input) {
    // make a simple copy of the pointers because we will get a reference if we don't
    // we only need clientXY for the calculations
    var pointers = [];
    var i = 0;
    while (i < input.pointers.length) {
        pointers[i] = {
            clientX: round(input.pointers[i].clientX),
            clientY: round(input.pointers[i].clientY)
        };
        i++;
    }

    return {
        timeStamp: now(),
        pointers: pointers,
        center: getCenter(pointers),
        deltaX: input.deltaX,
        deltaY: input.deltaY
    };
}

/**
 * get the center of all the pointers
 * @param {Array} pointers
 * @return {Object} center contains `x` and `y` properties
 */
function getCenter(pointers) {
    var pointersLength = pointers.length;

    // no need to loop when only one touch
    if (pointersLength === 1) {
        return {
            x: round(pointers[0].clientX),
            y: round(pointers[0].clientY)
        };
    }

    var x = 0, y = 0, i = 0;
    while (i < pointersLength) {
        x += pointers[i].clientX;
        y += pointers[i].clientY;
        i++;
    }

    return {
        x: round(x / pointersLength),
        y: round(y / pointersLength)
    };
}

/**
 * calculate the velocity between two points. unit is in px per ms.
 * @param {Number} deltaTime
 * @param {Number} x
 * @param {Number} y
 * @return {Object} velocity `x` and `y`
 */
function getVelocity(deltaTime, x, y) {
    return {
        x: x / deltaTime || 0,
        y: y / deltaTime || 0
    };
}

/**
 * get the direction between two points
 * @param {Number} x
 * @param {Number} y
 * @return {Number} direction
 */
function getDirection(x, y) {
    if (x === y) {
        return DIRECTION_NONE;
    }

    if (abs(x) >= abs(y)) {
        return x < 0 ? DIRECTION_LEFT : DIRECTION_RIGHT;
    }
    return y < 0 ? DIRECTION_UP : DIRECTION_DOWN;
}

/**
 * calculate the absolute distance between two points
 * @param {Object} p1 {x, y}
 * @param {Object} p2 {x, y}
 * @param {Array} [props] containing x and y keys
 * @return {Number} distance
 */
function getDistance(p1, p2, props) {
    if (!props) {
        props = PROPS_XY;
    }
    var x = p2[props[0]] - p1[props[0]],
        y = p2[props[1]] - p1[props[1]];

    return Math.sqrt((x * x) + (y * y));
}

/**
 * calculate the angle between two coordinates
 * @param {Object} p1
 * @param {Object} p2
 * @param {Array} [props] containing x and y keys
 * @return {Number} angle
 */
function getAngle(p1, p2, props) {
    if (!props) {
        props = PROPS_XY;
    }
    var x = p2[props[0]] - p1[props[0]],
        y = p2[props[1]] - p1[props[1]];
    return Math.atan2(y, x) * 180 / Math.PI;
}

/**
 * calculate the rotation degrees between two pointersets
 * @param {Array} start array of pointers
 * @param {Array} end array of pointers
 * @return {Number} rotation
 */
function getRotation(start, end) {
    return getAngle(end[1], end[0], PROPS_CLIENT_XY) + getAngle(start[1], start[0], PROPS_CLIENT_XY);
}

/**
 * calculate the scale factor between two pointersets
 * no scale is 1, and goes down to 0 when pinched together, and bigger when pinched out
 * @param {Array} start array of pointers
 * @param {Array} end array of pointers
 * @return {Number} scale
 */
function getScale(start, end) {
    return getDistance(end[0], end[1], PROPS_CLIENT_XY) / getDistance(start[0], start[1], PROPS_CLIENT_XY);
}

var MOUSE_INPUT_MAP = {
    mousedown: INPUT_START,
    mousemove: INPUT_MOVE,
    mouseup: INPUT_END
};

var MOUSE_ELEMENT_EVENTS = 'mousedown';
var MOUSE_WINDOW_EVENTS = 'mousemove mouseup';

/**
 * Mouse events input
 * @constructor
 * @extends Input
 */
function MouseInput() {
    this.evEl = MOUSE_ELEMENT_EVENTS;
    this.evWin = MOUSE_WINDOW_EVENTS;

    this.pressed = false; // mousedown state

    Input.apply(this, arguments);
}

inherit(MouseInput, Input, {
    /**
     * handle mouse events
     * @param {Object} ev
     */
    handler: function MEhandler(ev) {
        var eventType = MOUSE_INPUT_MAP[ev.type];

        // on start we want to have the left mouse button down
        if (eventType & INPUT_START && ev.button === 0) {
            this.pressed = true;
        }

        if (eventType & INPUT_MOVE && ev.which !== 1) {
            eventType = INPUT_END;
        }

        // mouse must be down
        if (!this.pressed) {
            return;
        }

        if (eventType & INPUT_END) {
            this.pressed = false;
        }

        this.callback(this.manager, eventType, {
            pointers: [ev],
            changedPointers: [ev],
            pointerType: INPUT_TYPE_MOUSE,
            srcEvent: ev
        });
    }
});

var POINTER_INPUT_MAP = {
    pointerdown: INPUT_START,
    pointermove: INPUT_MOVE,
    pointerup: INPUT_END,
    pointercancel: INPUT_CANCEL,
    pointerout: INPUT_CANCEL
};

// in IE10 the pointer types is defined as an enum
var IE10_POINTER_TYPE_ENUM = {
    2: INPUT_TYPE_TOUCH,
    3: INPUT_TYPE_PEN,
    4: INPUT_TYPE_MOUSE,
    5: INPUT_TYPE_KINECT // see https://twitter.com/jacobrossi/status/480596438489890816
};

var POINTER_ELEMENT_EVENTS = 'pointerdown';
var POINTER_WINDOW_EVENTS = 'pointermove pointerup pointercancel';

// IE10 has prefixed support, and case-sensitive
if (window.MSPointerEvent && !window.PointerEvent) {
    POINTER_ELEMENT_EVENTS = 'MSPointerDown';
    POINTER_WINDOW_EVENTS = 'MSPointerMove MSPointerUp MSPointerCancel';
}

/**
 * Pointer events input
 * @constructor
 * @extends Input
 */
function PointerEventInput() {
    this.evEl = POINTER_ELEMENT_EVENTS;
    this.evWin = POINTER_WINDOW_EVENTS;

    Input.apply(this, arguments);

    this.store = (this.manager.session.pointerEvents = []);
}

inherit(PointerEventInput, Input, {
    /**
     * handle mouse events
     * @param {Object} ev
     */
    handler: function PEhandler(ev) {
        var store = this.store;
        var removePointer = false;

        var eventTypeNormalized = ev.type.toLowerCase().replace('ms', '');
        var eventType = POINTER_INPUT_MAP[eventTypeNormalized];
        var pointerType = IE10_POINTER_TYPE_ENUM[ev.pointerType] || ev.pointerType;

        var isTouch = (pointerType == INPUT_TYPE_TOUCH);

        // get index of the event in the store
        var storeIndex = inArray(store, ev.pointerId, 'pointerId');

        // start and mouse must be down
        if (eventType & INPUT_START && (ev.button === 0 || isTouch)) {
            if (storeIndex < 0) {
                store.push(ev);
                storeIndex = store.length - 1;
            }
        } else if (eventType & (INPUT_END | INPUT_CANCEL)) {
            removePointer = true;
        }

        // it not found, so the pointer hasn't been down (so it's probably a hover)
        if (storeIndex < 0) {
            return;
        }

        // update the event in the store
        store[storeIndex] = ev;

        this.callback(this.manager, eventType, {
            pointers: store,
            changedPointers: [ev],
            pointerType: pointerType,
            srcEvent: ev
        });

        if (removePointer) {
            // remove from the store
            store.splice(storeIndex, 1);
        }
    }
});

var SINGLE_TOUCH_INPUT_MAP = {
    touchstart: INPUT_START,
    touchmove: INPUT_MOVE,
    touchend: INPUT_END,
    touchcancel: INPUT_CANCEL
};

var SINGLE_TOUCH_TARGET_EVENTS = 'touchstart';
var SINGLE_TOUCH_WINDOW_EVENTS = 'touchstart touchmove touchend touchcancel';

/**
 * Touch events input
 * @constructor
 * @extends Input
 */
function SingleTouchInput() {
    this.evTarget = SINGLE_TOUCH_TARGET_EVENTS;
    this.evWin = SINGLE_TOUCH_WINDOW_EVENTS;
    this.started = false;

    Input.apply(this, arguments);
}

inherit(SingleTouchInput, Input, {
    handler: function TEhandler(ev) {
        var type = SINGLE_TOUCH_INPUT_MAP[ev.type];

        // should we handle the touch events?
        if (type === INPUT_START) {
            this.started = true;
        }

        if (!this.started) {
            return;
        }

        var touches = normalizeSingleTouches.call(this, ev, type);

        // when done, reset the started state
        if (type & (INPUT_END | INPUT_CANCEL) && touches[0].length - touches[1].length === 0) {
            this.started = false;
        }

        this.callback(this.manager, type, {
            pointers: touches[0],
            changedPointers: touches[1],
            pointerType: INPUT_TYPE_TOUCH,
            srcEvent: ev
        });
    }
});

/**
 * @this {TouchInput}
 * @param {Object} ev
 * @param {Number} type flag
 * @returns {undefined|Array} [all, changed]
 */
function normalizeSingleTouches(ev, type) {
    var all = toArray(ev.touches);
    var changed = toArray(ev.changedTouches);

    if (type & (INPUT_END | INPUT_CANCEL)) {
        all = uniqueArray(all.concat(changed), 'identifier', true);
    }

    return [all, changed];
}

var TOUCH_INPUT_MAP = {
    touchstart: INPUT_START,
    touchmove: INPUT_MOVE,
    touchend: INPUT_END,
    touchcancel: INPUT_CANCEL
};

var TOUCH_TARGET_EVENTS = 'touchstart touchmove touchend touchcancel';

/**
 * Multi-user touch events input
 * @constructor
 * @extends Input
 */
function TouchInput() {
    this.evTarget = TOUCH_TARGET_EVENTS;
    this.targetIds = {};

    Input.apply(this, arguments);
}

inherit(TouchInput, Input, {
    handler: function MTEhandler(ev) {
        var type = TOUCH_INPUT_MAP[ev.type];
        var touches = getTouches.call(this, ev, type);
        if (!touches) {
            return;
        }

        this.callback(this.manager, type, {
            pointers: touches[0],
            changedPointers: touches[1],
            pointerType: INPUT_TYPE_TOUCH,
            srcEvent: ev
        });
    }
});

/**
 * @this {TouchInput}
 * @param {Object} ev
 * @param {Number} type flag
 * @returns {undefined|Array} [all, changed]
 */
function getTouches(ev, type) {
    var allTouches = toArray(ev.touches);
    var targetIds = this.targetIds;

    // when there is only one touch, the process can be simplified
    if (type & (INPUT_START | INPUT_MOVE) && allTouches.length === 1) {
        targetIds[allTouches[0].identifier] = true;
        return [allTouches, allTouches];
    }

    var i,
        targetTouches,
        changedTouches = toArray(ev.changedTouches),
        changedTargetTouches = [],
        target = this.target;

    // get target touches from touches
    targetTouches = allTouches.filter(function(touch) {
        return hasParent(touch.target, target);
    });

    // collect touches
    if (type === INPUT_START) {
        i = 0;
        while (i < targetTouches.length) {
            targetIds[targetTouches[i].identifier] = true;
            i++;
        }
    }

    // filter changed touches to only contain touches that exist in the collected target ids
    i = 0;
    while (i < changedTouches.length) {
        if (targetIds[changedTouches[i].identifier]) {
            changedTargetTouches.push(changedTouches[i]);
        }

        // cleanup removed touches
        if (type & (INPUT_END | INPUT_CANCEL)) {
            delete targetIds[changedTouches[i].identifier];
        }
        i++;
    }

    if (!changedTargetTouches.length) {
        return;
    }

    return [
        // merge targetTouches with changedTargetTouches so it contains ALL touches, including 'end' and 'cancel'
        uniqueArray(targetTouches.concat(changedTargetTouches), 'identifier', true),
        changedTargetTouches
    ];
}

/**
 * Combined touch and mouse input
 *
 * Touch has a higher priority then mouse, and while touching no mouse events are allowed.
 * This because touch devices also emit mouse events while doing a touch.
 *
 * @constructor
 * @extends Input
 */

var DEDUP_TIMEOUT = 2500;
var DEDUP_DISTANCE = 25;

function TouchMouseInput() {
    Input.apply(this, arguments);

    var handler = bindFn(this.handler, this);
    this.touch = new TouchInput(this.manager, handler);
    this.mouse = new MouseInput(this.manager, handler);

    this.primaryTouch = null;
    this.lastTouches = [];
}

inherit(TouchMouseInput, Input, {
    /**
     * handle mouse and touch events
     * @param {Hammer} manager
     * @param {String} inputEvent
     * @param {Object} inputData
     */
    handler: function TMEhandler(manager, inputEvent, inputData) {
        var isTouch = (inputData.pointerType == INPUT_TYPE_TOUCH),
            isMouse = (inputData.pointerType == INPUT_TYPE_MOUSE);

        if (isMouse && inputData.sourceCapabilities && inputData.sourceCapabilities.firesTouchEvents) {
            return;
        }

        // when we're in a touch event, record touches to  de-dupe synthetic mouse event
        if (isTouch) {
            recordTouches.call(this, inputEvent, inputData);
        } else if (isMouse && isSyntheticEvent.call(this, inputData)) {
            return;
        }

        this.callback(manager, inputEvent, inputData);
    },

    /**
     * remove the event listeners
     */
    destroy: function destroy() {
        this.touch.destroy();
        this.mouse.destroy();
    }
});

function recordTouches(eventType, eventData) {
    if (eventType & INPUT_START) {
        this.primaryTouch = eventData.changedPointers[0].identifier;
        setLastTouch.call(this, eventData);
    } else if (eventType & (INPUT_END | INPUT_CANCEL)) {
        setLastTouch.call(this, eventData);
    }
}

function setLastTouch(eventData) {
    var touch = eventData.changedPointers[0];

    if (touch.identifier === this.primaryTouch) {
        var lastTouch = {x: touch.clientX, y: touch.clientY};
        this.lastTouches.push(lastTouch);
        var lts = this.lastTouches;
        var removeLastTouch = function() {
            var i = lts.indexOf(lastTouch);
            if (i > -1) {
                lts.splice(i, 1);
            }
        };
        setTimeout(removeLastTouch, DEDUP_TIMEOUT);
    }
}

function isSyntheticEvent(eventData) {
    var x = eventData.srcEvent.clientX, y = eventData.srcEvent.clientY;
    for (var i = 0; i < this.lastTouches.length; i++) {
        var t = this.lastTouches[i];
        var dx = Math.abs(x - t.x), dy = Math.abs(y - t.y);
        if (dx <= DEDUP_DISTANCE && dy <= DEDUP_DISTANCE) {
            return true;
        }
    }
    return false;
}

var PREFIXED_TOUCH_ACTION = prefixed(TEST_ELEMENT.style, 'touchAction');
var NATIVE_TOUCH_ACTION = PREFIXED_TOUCH_ACTION !== undefined;

// magical touchAction value
var TOUCH_ACTION_COMPUTE = 'compute';
var TOUCH_ACTION_AUTO = 'auto';
var TOUCH_ACTION_MANIPULATION = 'manipulation'; // not implemented
var TOUCH_ACTION_NONE = 'none';
var TOUCH_ACTION_PAN_X = 'pan-x';
var TOUCH_ACTION_PAN_Y = 'pan-y';
var TOUCH_ACTION_MAP = getTouchActionProps();

/**
 * Touch Action
 * sets the touchAction property or uses the js alternative
 * @param {Manager} manager
 * @param {String} value
 * @constructor
 */
function TouchAction(manager, value) {
    this.manager = manager;
    this.set(value);
}

TouchAction.prototype = {
    /**
     * set the touchAction value on the element or enable the polyfill
     * @param {String} value
     */
    set: function(value) {
        // find out the touch-action by the event handlers
        if (value == TOUCH_ACTION_COMPUTE) {
            value = this.compute();
        }

        if (NATIVE_TOUCH_ACTION && this.manager.element.style && TOUCH_ACTION_MAP[value]) {
            this.manager.element.style[PREFIXED_TOUCH_ACTION] = value;
        }
        this.actions = value.toLowerCase().trim();
    },

    /**
     * just re-set the touchAction value
     */
    update: function() {
        this.set(this.manager.options.touchAction);
    },

    /**
     * compute the value for the touchAction property based on the recognizer's settings
     * @returns {String} value
     */
    compute: function() {
        var actions = [];
        each(this.manager.recognizers, function(recognizer) {
            if (boolOrFn(recognizer.options.enable, [recognizer])) {
                actions = actions.concat(recognizer.getTouchAction());
            }
        });
        return cleanTouchActions(actions.join(' '));
    },

    /**
     * this method is called on each input cycle and provides the preventing of the browser behavior
     * @param {Object} input
     */
    preventDefaults: function(input) {
        var srcEvent = input.srcEvent;
        var direction = input.offsetDirection;

        // if the touch action did prevented once this session
        if (this.manager.session.prevented) {
            srcEvent.preventDefault();
            return;
        }

        var actions = this.actions;
        var hasNone = inStr(actions, TOUCH_ACTION_NONE) && !TOUCH_ACTION_MAP[TOUCH_ACTION_NONE];
        var hasPanY = inStr(actions, TOUCH_ACTION_PAN_Y) && !TOUCH_ACTION_MAP[TOUCH_ACTION_PAN_Y];
        var hasPanX = inStr(actions, TOUCH_ACTION_PAN_X) && !TOUCH_ACTION_MAP[TOUCH_ACTION_PAN_X];

        if (hasNone) {
            //do not prevent defaults if this is a tap gesture

            var isTapPointer = input.pointers.length === 1;
            var isTapMovement = input.distance < 2;
            var isTapTouchTime = input.deltaTime < 250;

            if (isTapPointer && isTapMovement && isTapTouchTime) {
                return;
            }
        }

        if (hasPanX && hasPanY) {
            // `pan-x pan-y` means browser handles all scrolling/panning, do not prevent
            return;
        }

        if (hasNone ||
            (hasPanY && direction & DIRECTION_HORIZONTAL) ||
            (hasPanX && direction & DIRECTION_VERTICAL)) {
            return this.preventSrc(srcEvent);
        }
    },

    /**
     * call preventDefault to prevent the browser's default behavior (scrolling in most cases)
     * @param {Object} srcEvent
     */
    preventSrc: function(srcEvent) {
        this.manager.session.prevented = true;
        srcEvent.preventDefault();
    }
};

/**
 * when the touchActions are collected they are not a valid value, so we need to clean things up. *
 * @param {String} actions
 * @returns {*}
 */
function cleanTouchActions(actions) {
    // none
    if (inStr(actions, TOUCH_ACTION_NONE)) {
        return TOUCH_ACTION_NONE;
    }

    var hasPanX = inStr(actions, TOUCH_ACTION_PAN_X);
    var hasPanY = inStr(actions, TOUCH_ACTION_PAN_Y);

    // if both pan-x and pan-y are set (different recognizers
    // for different directions, e.g. horizontal pan but vertical swipe?)
    // we need none (as otherwise with pan-x pan-y combined none of these
    // recognizers will work, since the browser would handle all panning
    if (hasPanX && hasPanY) {
        return TOUCH_ACTION_NONE;
    }

    // pan-x OR pan-y
    if (hasPanX || hasPanY) {
        return hasPanX ? TOUCH_ACTION_PAN_X : TOUCH_ACTION_PAN_Y;
    }

    // manipulation
    if (inStr(actions, TOUCH_ACTION_MANIPULATION)) {
        return TOUCH_ACTION_MANIPULATION;
    }

    return TOUCH_ACTION_AUTO;
}

function getTouchActionProps() {
    if (!NATIVE_TOUCH_ACTION) {
        return false;
    }
    var touchMap = {};
    var cssSupports = window.CSS && window.CSS.supports;
    ['auto', 'manipulation', 'pan-y', 'pan-x', 'pan-x pan-y', 'none'].forEach(function(val) {

        // If css.supports is not supported but there is native touch-action assume it supports
        // all values. This is the case for IE 10 and 11.
        touchMap[val] = cssSupports ? window.CSS.supports('touch-action', val) : true;
    });
    return touchMap;
}

/**
 * Recognizer flow explained; *
 * All recognizers have the initial state of POSSIBLE when a input session starts.
 * The definition of a input session is from the first input until the last input, with all it's movement in it. *
 * Example session for mouse-input: mousedown -> mousemove -> mouseup
 *
 * On each recognizing cycle (see Manager.recognize) the .recognize() method is executed
 * which determines with state it should be.
 *
 * If the recognizer has the state FAILED, CANCELLED or RECOGNIZED (equals ENDED), it is reset to
 * POSSIBLE to give it another change on the next cycle.
 *
 *               Possible
 *                  |
 *            +-----+---------------+
 *            |                     |
 *      +-----+-----+               |
 *      |           |               |
 *   Failed      Cancelled          |
 *                          +-------+------+
 *                          |              |
 *                      Recognized       Began
 *                                         |
 *                                      Changed
 *                                         |
 *                                  Ended/Recognized
 */
var STATE_POSSIBLE = 1;
var STATE_BEGAN = 2;
var STATE_CHANGED = 4;
var STATE_ENDED = 8;
var STATE_RECOGNIZED = STATE_ENDED;
var STATE_CANCELLED = 16;
var STATE_FAILED = 32;

/**
 * Recognizer
 * Every recognizer needs to extend from this class.
 * @constructor
 * @param {Object} options
 */
function Recognizer(options) {
    this.options = assign({}, this.defaults, options || {});

    this.id = uniqueId();

    this.manager = null;

    // default is enable true
    this.options.enable = ifUndefined(this.options.enable, true);

    this.state = STATE_POSSIBLE;

    this.simultaneous = {};
    this.requireFail = [];
}

Recognizer.prototype = {
    /**
     * @virtual
     * @type {Object}
     */
    defaults: {},

    /**
     * set options
     * @param {Object} options
     * @return {Recognizer}
     */
    set: function(options) {
        assign(this.options, options);

        // also update the touchAction, in case something changed about the directions/enabled state
        this.manager && this.manager.touchAction.update();
        return this;
    },

    /**
     * recognize simultaneous with an other recognizer.
     * @param {Recognizer} otherRecognizer
     * @returns {Recognizer} this
     */
    recognizeWith: function(otherRecognizer) {
        if (invokeArrayArg(otherRecognizer, 'recognizeWith', this)) {
            return this;
        }

        var simultaneous = this.simultaneous;
        otherRecognizer = getRecognizerByNameIfManager(otherRecognizer, this);
        if (!simultaneous[otherRecognizer.id]) {
            simultaneous[otherRecognizer.id] = otherRecognizer;
            otherRecognizer.recognizeWith(this);
        }
        return this;
    },

    /**
     * drop the simultaneous link. it doesnt remove the link on the other recognizer.
     * @param {Recognizer} otherRecognizer
     * @returns {Recognizer} this
     */
    dropRecognizeWith: function(otherRecognizer) {
        if (invokeArrayArg(otherRecognizer, 'dropRecognizeWith', this)) {
            return this;
        }

        otherRecognizer = getRecognizerByNameIfManager(otherRecognizer, this);
        delete this.simultaneous[otherRecognizer.id];
        return this;
    },

    /**
     * recognizer can only run when an other is failing
     * @param {Recognizer} otherRecognizer
     * @returns {Recognizer} this
     */
    requireFailure: function(otherRecognizer) {
        if (invokeArrayArg(otherRecognizer, 'requireFailure', this)) {
            return this;
        }

        var requireFail = this.requireFail;
        otherRecognizer = getRecognizerByNameIfManager(otherRecognizer, this);
        if (inArray(requireFail, otherRecognizer) === -1) {
            requireFail.push(otherRecognizer);
            otherRecognizer.requireFailure(this);
        }
        return this;
    },

    /**
     * drop the requireFailure link. it does not remove the link on the other recognizer.
     * @param {Recognizer} otherRecognizer
     * @returns {Recognizer} this
     */
    dropRequireFailure: function(otherRecognizer) {
        if (invokeArrayArg(otherRecognizer, 'dropRequireFailure', this)) {
            return this;
        }

        otherRecognizer = getRecognizerByNameIfManager(otherRecognizer, this);
        var index = inArray(this.requireFail, otherRecognizer);
        if (index > -1) {
            this.requireFail.splice(index, 1);
        }
        return this;
    },

    /**
     * has require failures boolean
     * @returns {boolean}
     */
    hasRequireFailures: function() {
        return this.requireFail.length > 0;
    },

    /**
     * if the recognizer can recognize simultaneous with an other recognizer
     * @param {Recognizer} otherRecognizer
     * @returns {Boolean}
     */
    canRecognizeWith: function(otherRecognizer) {
        return !!this.simultaneous[otherRecognizer.id];
    },

    /**
     * You should use `tryEmit` instead of `emit` directly to check
     * that all the needed recognizers has failed before emitting.
     * @param {Object} input
     */
    emit: function(input) {
        var self = this;
        var state = this.state;

        function emit(event) {
            self.manager.emit(event, input);
        }

        // 'panstart' and 'panmove'
        if (state < STATE_ENDED) {
            emit(self.options.event + stateStr(state));
        }

        emit(self.options.event); // simple 'eventName' events

        if (input.additionalEvent) { // additional event(panleft, panright, pinchin, pinchout...)
            emit(input.additionalEvent);
        }

        // panend and pancancel
        if (state >= STATE_ENDED) {
            emit(self.options.event + stateStr(state));
        }
    },

    /**
     * Check that all the require failure recognizers has failed,
     * if true, it emits a gesture event,
     * otherwise, setup the state to FAILED.
     * @param {Object} input
     */
    tryEmit: function(input) {
        if (this.canEmit()) {
            return this.emit(input);
        }
        // it's failing anyway
        this.state = STATE_FAILED;
    },

    /**
     * can we emit?
     * @returns {boolean}
     */
    canEmit: function() {
        var i = 0;
        while (i < this.requireFail.length) {
            if (!(this.requireFail[i].state & (STATE_FAILED | STATE_POSSIBLE))) {
                return false;
            }
            i++;
        }
        return true;
    },

    /**
     * update the recognizer
     * @param {Object} inputData
     */
    recognize: function(inputData) {
        // make a new copy of the inputData
        // so we can change the inputData without messing up the other recognizers
        var inputDataClone = assign({}, inputData);

        // is is enabled and allow recognizing?
        if (!boolOrFn(this.options.enable, [this, inputDataClone])) {
            this.reset();
            this.state = STATE_FAILED;
            return;
        }

        // reset when we've reached the end
        if (this.state & (STATE_RECOGNIZED | STATE_CANCELLED | STATE_FAILED)) {
            this.state = STATE_POSSIBLE;
        }

        this.state = this.process(inputDataClone);

        // the recognizer has recognized a gesture
        // so trigger an event
        if (this.state & (STATE_BEGAN | STATE_CHANGED | STATE_ENDED | STATE_CANCELLED)) {
            this.tryEmit(inputDataClone);
        }
    },

    /**
     * return the state of the recognizer
     * the actual recognizing happens in this method
     * @virtual
     * @param {Object} inputData
     * @returns {Const} STATE
     */
    process: function(inputData) { }, // jshint ignore:line

    /**
     * return the preferred touch-action
     * @virtual
     * @returns {Array}
     */
    getTouchAction: function() { },

    /**
     * called when the gesture isn't allowed to recognize
     * like when another is being recognized or it is disabled
     * @virtual
     */
    reset: function() { }
};

/**
 * get a usable string, used as event postfix
 * @param {Const} state
 * @returns {String} state
 */
function stateStr(state) {
    if (state & STATE_CANCELLED) {
        return 'cancel';
    } else if (state & STATE_ENDED) {
        return 'end';
    } else if (state & STATE_CHANGED) {
        return 'move';
    } else if (state & STATE_BEGAN) {
        return 'start';
    }
    return '';
}

/**
 * direction cons to string
 * @param {Const} direction
 * @returns {String}
 */
function directionStr(direction) {
    if (direction == DIRECTION_DOWN) {
        return 'down';
    } else if (direction == DIRECTION_UP) {
        return 'up';
    } else if (direction == DIRECTION_LEFT) {
        return 'left';
    } else if (direction == DIRECTION_RIGHT) {
        return 'right';
    }
    return '';
}

/**
 * get a recognizer by name if it is bound to a manager
 * @param {Recognizer|String} otherRecognizer
 * @param {Recognizer} recognizer
 * @returns {Recognizer}
 */
function getRecognizerByNameIfManager(otherRecognizer, recognizer) {
    var manager = recognizer.manager;
    if (manager) {
        return manager.get(otherRecognizer);
    }
    return otherRecognizer;
}

/**
 * This recognizer is just used as a base for the simple attribute recognizers.
 * @constructor
 * @extends Recognizer
 */
function AttrRecognizer() {
    Recognizer.apply(this, arguments);
}

inherit(AttrRecognizer, Recognizer, {
    /**
     * @namespace
     * @memberof AttrRecognizer
     */
    defaults: {
        /**
         * @type {Number}
         * @default 1
         */
        pointers: 1
    },

    /**
     * Used to check if it the recognizer receives valid input, like input.distance > 10.
     * @memberof AttrRecognizer
     * @param {Object} input
     * @returns {Boolean} recognized
     */
    attrTest: function(input) {
        var optionPointers = this.options.pointers;
        return optionPointers === 0 || input.pointers.length === optionPointers;
    },

    /**
     * Process the input and return the state for the recognizer
     * @memberof AttrRecognizer
     * @param {Object} input
     * @returns {*} State
     */
    process: function(input) {
        var state = this.state;
        var eventType = input.eventType;

        var isRecognized = state & (STATE_BEGAN | STATE_CHANGED);
        var isValid = this.attrTest(input);

        // on cancel input and we've recognized before, return STATE_CANCELLED
        if (isRecognized && (eventType & INPUT_CANCEL || !isValid)) {
            return state | STATE_CANCELLED;
        } else if (isRecognized || isValid) {
            if (eventType & INPUT_END) {
                return state | STATE_ENDED;
            } else if (!(state & STATE_BEGAN)) {
                return STATE_BEGAN;
            }
            return state | STATE_CHANGED;
        }
        return STATE_FAILED;
    }
});

/**
 * Pan
 * Recognized when the pointer is down and moved in the allowed direction.
 * @constructor
 * @extends AttrRecognizer
 */
function PanRecognizer() {
    AttrRecognizer.apply(this, arguments);

    this.pX = null;
    this.pY = null;
}

inherit(PanRecognizer, AttrRecognizer, {
    /**
     * @namespace
     * @memberof PanRecognizer
     */
    defaults: {
        event: 'pan',
        threshold: 10,
        pointers: 1,
        direction: DIRECTION_ALL
    },

    getTouchAction: function() {
        var direction = this.options.direction;
        var actions = [];
        if (direction & DIRECTION_HORIZONTAL) {
            actions.push(TOUCH_ACTION_PAN_Y);
        }
        if (direction & DIRECTION_VERTICAL) {
            actions.push(TOUCH_ACTION_PAN_X);
        }
        return actions;
    },

    directionTest: function(input) {
        var options = this.options;
        var hasMoved = true;
        var distance = input.distance;
        var direction = input.direction;
        var x = input.deltaX;
        var y = input.deltaY;

        // lock to axis?
        if (!(direction & options.direction)) {
            if (options.direction & DIRECTION_HORIZONTAL) {
                direction = (x === 0) ? DIRECTION_NONE : (x < 0) ? DIRECTION_LEFT : DIRECTION_RIGHT;
                hasMoved = x != this.pX;
                distance = Math.abs(input.deltaX);
            } else {
                direction = (y === 0) ? DIRECTION_NONE : (y < 0) ? DIRECTION_UP : DIRECTION_DOWN;
                hasMoved = y != this.pY;
                distance = Math.abs(input.deltaY);
            }
        }
        input.direction = direction;
        return hasMoved && distance > options.threshold && direction & options.direction;
    },

    attrTest: function(input) {
        return AttrRecognizer.prototype.attrTest.call(this, input) &&
            (this.state & STATE_BEGAN || (!(this.state & STATE_BEGAN) && this.directionTest(input)));
    },

    emit: function(input) {

        this.pX = input.deltaX;
        this.pY = input.deltaY;

        var direction = directionStr(input.direction);

        if (direction) {
            input.additionalEvent = this.options.event + direction;
        }
        this._super.emit.call(this, input);
    }
});

/**
 * Pinch
 * Recognized when two or more pointers are moving toward (zoom-in) or away from each other (zoom-out).
 * @constructor
 * @extends AttrRecognizer
 */
function PinchRecognizer() {
    AttrRecognizer.apply(this, arguments);
}

inherit(PinchRecognizer, AttrRecognizer, {
    /**
     * @namespace
     * @memberof PinchRecognizer
     */
    defaults: {
        event: 'pinch',
        threshold: 0,
        pointers: 2
    },

    getTouchAction: function() {
        return [TOUCH_ACTION_NONE];
    },

    attrTest: function(input) {
        return this._super.attrTest.call(this, input) &&
            (Math.abs(input.scale - 1) > this.options.threshold || this.state & STATE_BEGAN);
    },

    emit: function(input) {
        if (input.scale !== 1) {
            var inOut = input.scale < 1 ? 'in' : 'out';
            input.additionalEvent = this.options.event + inOut;
        }
        this._super.emit.call(this, input);
    }
});

/**
 * Press
 * Recognized when the pointer is down for x ms without any movement.
 * @constructor
 * @extends Recognizer
 */
function PressRecognizer() {
    Recognizer.apply(this, arguments);

    this._timer = null;
    this._input = null;
}

inherit(PressRecognizer, Recognizer, {
    /**
     * @namespace
     * @memberof PressRecognizer
     */
    defaults: {
        event: 'press',
        pointers: 1,
        time: 251, // minimal time of the pointer to be pressed
        threshold: 9 // a minimal movement is ok, but keep it low
    },

    getTouchAction: function() {
        return [TOUCH_ACTION_AUTO];
    },

    process: function(input) {
        var options = this.options;
        var validPointers = input.pointers.length === options.pointers;
        var validMovement = input.distance < options.threshold;
        var validTime = input.deltaTime > options.time;

        this._input = input;

        // we only allow little movement
        // and we've reached an end event, so a tap is possible
        if (!validMovement || !validPointers || (input.eventType & (INPUT_END | INPUT_CANCEL) && !validTime)) {
            this.reset();
        } else if (input.eventType & INPUT_START) {
            this.reset();
            this._timer = setTimeoutContext(function() {
                this.state = STATE_RECOGNIZED;
                this.tryEmit();
            }, options.time, this);
        } else if (input.eventType & INPUT_END) {
            return STATE_RECOGNIZED;
        }
        return STATE_FAILED;
    },

    reset: function() {
        clearTimeout(this._timer);
    },

    emit: function(input) {
        if (this.state !== STATE_RECOGNIZED) {
            return;
        }

        if (input && (input.eventType & INPUT_END)) {
            this.manager.emit(this.options.event + 'up', input);
        } else {
            this._input.timeStamp = now();
            this.manager.emit(this.options.event, this._input);
        }
    }
});

/**
 * Rotate
 * Recognized when two or more pointer are moving in a circular motion.
 * @constructor
 * @extends AttrRecognizer
 */
function RotateRecognizer() {
    AttrRecognizer.apply(this, arguments);
}

inherit(RotateRecognizer, AttrRecognizer, {
    /**
     * @namespace
     * @memberof RotateRecognizer
     */
    defaults: {
        event: 'rotate',
        threshold: 0,
        pointers: 2
    },

    getTouchAction: function() {
        return [TOUCH_ACTION_NONE];
    },

    attrTest: function(input) {
        return this._super.attrTest.call(this, input) &&
            (Math.abs(input.rotation) > this.options.threshold || this.state & STATE_BEGAN);
    }
});

/**
 * Swipe
 * Recognized when the pointer is moving fast (velocity), with enough distance in the allowed direction.
 * @constructor
 * @extends AttrRecognizer
 */
function SwipeRecognizer() {
    AttrRecognizer.apply(this, arguments);
}

inherit(SwipeRecognizer, AttrRecognizer, {
    /**
     * @namespace
     * @memberof SwipeRecognizer
     */
    defaults: {
        event: 'swipe',
        threshold: 10,
        velocity: 0.3,
        direction: DIRECTION_HORIZONTAL | DIRECTION_VERTICAL,
        pointers: 1
    },

    getTouchAction: function() {
        return PanRecognizer.prototype.getTouchAction.call(this);
    },

    attrTest: function(input) {
        var direction = this.options.direction;
        var velocity;

        if (direction & (DIRECTION_HORIZONTAL | DIRECTION_VERTICAL)) {
            velocity = input.overallVelocity;
        } else if (direction & DIRECTION_HORIZONTAL) {
            velocity = input.overallVelocityX;
        } else if (direction & DIRECTION_VERTICAL) {
            velocity = input.overallVelocityY;
        }

        return this._super.attrTest.call(this, input) &&
            direction & input.offsetDirection &&
            input.distance > this.options.threshold &&
            input.maxPointers == this.options.pointers &&
            abs(velocity) > this.options.velocity && input.eventType & INPUT_END;
    },

    emit: function(input) {
        var direction = directionStr(input.offsetDirection);
        if (direction) {
            this.manager.emit(this.options.event + direction, input);
        }

        this.manager.emit(this.options.event, input);
    }
});

/**
 * A tap is ecognized when the pointer is doing a small tap/click. Multiple taps are recognized if they occur
 * between the given interval and position. The delay option can be used to recognize multi-taps without firing
 * a single tap.
 *
 * The eventData from the emitted event contains the property `tapCount`, which contains the amount of
 * multi-taps being recognized.
 * @constructor
 * @extends Recognizer
 */
function TapRecognizer() {
    Recognizer.apply(this, arguments);

    // previous time and center,
    // used for tap counting
    this.pTime = false;
    this.pCenter = false;

    this._timer = null;
    this._input = null;
    this.count = 0;
}

inherit(TapRecognizer, Recognizer, {
    /**
     * @namespace
     * @memberof PinchRecognizer
     */
    defaults: {
        event: 'tap',
        pointers: 1,
        taps: 1,
        interval: 300, // max time between the multi-tap taps
        time: 250, // max time of the pointer to be down (like finger on the screen)
        threshold: 9, // a minimal movement is ok, but keep it low
        posThreshold: 10 // a multi-tap can be a bit off the initial position
    },

    getTouchAction: function() {
        return [TOUCH_ACTION_MANIPULATION];
    },

    process: function(input) {
        var options = this.options;

        var validPointers = input.pointers.length === options.pointers;
        var validMovement = input.distance < options.threshold;
        var validTouchTime = input.deltaTime < options.time;

        this.reset();

        if ((input.eventType & INPUT_START) && (this.count === 0)) {
            return this.failTimeout();
        }

        // we only allow little movement
        // and we've reached an end event, so a tap is possible
        if (validMovement && validTouchTime && validPointers) {
            if (input.eventType != INPUT_END) {
                return this.failTimeout();
            }

            var validInterval = this.pTime ? (input.timeStamp - this.pTime < options.interval) : true;
            var validMultiTap = !this.pCenter || getDistance(this.pCenter, input.center) < options.posThreshold;

            this.pTime = input.timeStamp;
            this.pCenter = input.center;

            if (!validMultiTap || !validInterval) {
                this.count = 1;
            } else {
                this.count += 1;
            }

            this._input = input;

            // if tap count matches we have recognized it,
            // else it has began recognizing...
            var tapCount = this.count % options.taps;
            if (tapCount === 0) {
                // no failing requirements, immediately trigger the tap event
                // or wait as long as the multitap interval to trigger
                if (!this.hasRequireFailures()) {
                    return STATE_RECOGNIZED;
                } else {
                    this._timer = setTimeoutContext(function() {
                        this.state = STATE_RECOGNIZED;
                        this.tryEmit();
                    }, options.interval, this);
                    return STATE_BEGAN;
                }
            }
        }
        return STATE_FAILED;
    },

    failTimeout: function() {
        this._timer = setTimeoutContext(function() {
            this.state = STATE_FAILED;
        }, this.options.interval, this);
        return STATE_FAILED;
    },

    reset: function() {
        clearTimeout(this._timer);
    },

    emit: function() {
        if (this.state == STATE_RECOGNIZED) {
            this._input.tapCount = this.count;
            this.manager.emit(this.options.event, this._input);
        }
    }
});

/**
 * Simple way to create a manager with a default set of recognizers.
 * @param {HTMLElement} element
 * @param {Object} [options]
 * @constructor
 */
function Hammer(element, options) {
    options = options || {};
    options.recognizers = ifUndefined(options.recognizers, Hammer.defaults.preset);
    return new Manager(element, options);
}

/**
 * @const {string}
 */
Hammer.VERSION = '2.0.7';

/**
 * default settings
 * @namespace
 */
Hammer.defaults = {
    /**
     * set if DOM events are being triggered.
     * But this is slower and unused by simple implementations, so disabled by default.
     * @type {Boolean}
     * @default false
     */
    domEvents: false,

    /**
     * The value for the touchAction property/fallback.
     * When set to `compute` it will magically set the correct value based on the added recognizers.
     * @type {String}
     * @default compute
     */
    touchAction: TOUCH_ACTION_COMPUTE,

    /**
     * @type {Boolean}
     * @default true
     */
    enable: true,

    /**
     * EXPERIMENTAL FEATURE -- can be removed/changed
     * Change the parent input target element.
     * If Null, then it is being set the to main element.
     * @type {Null|EventTarget}
     * @default null
     */
    inputTarget: null,

    /**
     * force an input class
     * @type {Null|Function}
     * @default null
     */
    inputClass: null,

    /**
     * Default recognizer setup when calling `Hammer()`
     * When creating a new Manager these will be skipped.
     * @type {Array}
     */
    preset: [
        // RecognizerClass, options, [recognizeWith, ...], [requireFailure, ...]
        [RotateRecognizer, {enable: false}],
        [PinchRecognizer, {enable: false}, ['rotate']],
        [SwipeRecognizer, {direction: DIRECTION_HORIZONTAL}],
        [PanRecognizer, {direction: DIRECTION_HORIZONTAL}, ['swipe']],
        [TapRecognizer],
        [TapRecognizer, {event: 'doubletap', taps: 2}, ['tap']],
        [PressRecognizer]
    ],

    /**
     * Some CSS properties can be used to improve the working of Hammer.
     * Add them to this method and they will be set when creating a new Manager.
     * @namespace
     */
    cssProps: {
        /**
         * Disables text selection to improve the dragging gesture. Mainly for desktop browsers.
         * @type {String}
         * @default 'none'
         */
        userSelect: 'none',

        /**
         * Disable the Windows Phone grippers when pressing an element.
         * @type {String}
         * @default 'none'
         */
        touchSelect: 'none',

        /**
         * Disables the default callout shown when you touch and hold a touch target.
         * On iOS, when you touch and hold a touch target such as a link, Safari displays
         * a callout containing information about the link. This property allows you to disable that callout.
         * @type {String}
         * @default 'none'
         */
        touchCallout: 'none',

        /**
         * Specifies whether zooming is enabled. Used by IE10>
         * @type {String}
         * @default 'none'
         */
        contentZooming: 'none',

        /**
         * Specifies that an entire element should be draggable instead of its contents. Mainly for desktop browsers.
         * @type {String}
         * @default 'none'
         */
        userDrag: 'none',

        /**
         * Overrides the highlight color shown when the user taps a link or a JavaScript
         * clickable element in iOS. This property obeys the alpha value, if specified.
         * @type {String}
         * @default 'rgba(0,0,0,0)'
         */
        tapHighlightColor: 'rgba(0,0,0,0)'
    }
};

var STOP = 1;
var FORCED_STOP = 2;

/**
 * Manager
 * @param {HTMLElement} element
 * @param {Object} [options]
 * @constructor
 */
function Manager(element, options) {
    this.options = assign({}, Hammer.defaults, options || {});

    this.options.inputTarget = this.options.inputTarget || element;

    this.handlers = {};
    this.session = {};
    this.recognizers = [];
    this.oldCssProps = {};

    this.element = element;
    this.input = createInputInstance(this);
    this.touchAction = new TouchAction(this, this.options.touchAction);

    toggleCssProps(this, true);

    each(this.options.recognizers, function(item) {
        var recognizer = this.add(new (item[0])(item[1]));
        item[2] && recognizer.recognizeWith(item[2]);
        item[3] && recognizer.requireFailure(item[3]);
    }, this);
}

Manager.prototype = {
    /**
     * set options
     * @param {Object} options
     * @returns {Manager}
     */
    set: function(options) {
        assign(this.options, options);

        // Options that need a little more setup
        if (options.touchAction) {
            this.touchAction.update();
        }
        if (options.inputTarget) {
            // Clean up existing event listeners and reinitialize
            this.input.destroy();
            this.input.target = options.inputTarget;
            this.input.init();
        }
        return this;
    },

    /**
     * stop recognizing for this session.
     * This session will be discarded, when a new [input]start event is fired.
     * When forced, the recognizer cycle is stopped immediately.
     * @param {Boolean} [force]
     */
    stop: function(force) {
        this.session.stopped = force ? FORCED_STOP : STOP;
    },

    /**
     * run the recognizers!
     * called by the inputHandler function on every movement of the pointers (touches)
     * it walks through all the recognizers and tries to detect the gesture that is being made
     * @param {Object} inputData
     */
    recognize: function(inputData) {
        var session = this.session;
        if (session.stopped) {
            return;
        }

        // run the touch-action polyfill
        this.touchAction.preventDefaults(inputData);

        var recognizer;
        var recognizers = this.recognizers;

        // this holds the recognizer that is being recognized.
        // so the recognizer's state needs to be BEGAN, CHANGED, ENDED or RECOGNIZED
        // if no recognizer is detecting a thing, it is set to `null`
        var curRecognizer = session.curRecognizer;

        // reset when the last recognizer is recognized
        // or when we're in a new session
        if (!curRecognizer || (curRecognizer && curRecognizer.state & STATE_RECOGNIZED)) {
            curRecognizer = session.curRecognizer = null;
        }

        var i = 0;
        while (i < recognizers.length) {
            recognizer = recognizers[i];

            // find out if we are allowed try to recognize the input for this one.
            // 1.   allow if the session is NOT forced stopped (see the .stop() method)
            // 2.   allow if we still haven't recognized a gesture in this session, or the this recognizer is the one
            //      that is being recognized.
            // 3.   allow if the recognizer is allowed to run simultaneous with the current recognized recognizer.
            //      this can be setup with the `recognizeWith()` method on the recognizer.
            if (session.stopped !== FORCED_STOP && ( // 1
                    !curRecognizer || recognizer == curRecognizer || // 2
                    recognizer.canRecognizeWith(curRecognizer))) { // 3
                recognizer.recognize(inputData);
            } else {
                recognizer.reset();
            }

            // if the recognizer has been recognizing the input as a valid gesture, we want to store this one as the
            // current active recognizer. but only if we don't already have an active recognizer
            if (!curRecognizer && recognizer.state & (STATE_BEGAN | STATE_CHANGED | STATE_ENDED)) {
                curRecognizer = session.curRecognizer = recognizer;
            }
            i++;
        }
    },

    /**
     * get a recognizer by its event name.
     * @param {Recognizer|String} recognizer
     * @returns {Recognizer|Null}
     */
    get: function(recognizer) {
        if (recognizer instanceof Recognizer) {
            return recognizer;
        }

        var recognizers = this.recognizers;
        for (var i = 0; i < recognizers.length; i++) {
            if (recognizers[i].options.event == recognizer) {
                return recognizers[i];
            }
        }
        return null;
    },

    /**
     * add a recognizer to the manager
     * existing recognizers with the same event name will be removed
     * @param {Recognizer} recognizer
     * @returns {Recognizer|Manager}
     */
    add: function(recognizer) {
        if (invokeArrayArg(recognizer, 'add', this)) {
            return this;
        }

        // remove existing
        var existing = this.get(recognizer.options.event);
        if (existing) {
            this.remove(existing);
        }

        this.recognizers.push(recognizer);
        recognizer.manager = this;

        this.touchAction.update();
        return recognizer;
    },

    /**
     * remove a recognizer by name or instance
     * @param {Recognizer|String} recognizer
     * @returns {Manager}
     */
    remove: function(recognizer) {
        if (invokeArrayArg(recognizer, 'remove', this)) {
            return this;
        }

        recognizer = this.get(recognizer);

        // let's make sure this recognizer exists
        if (recognizer) {
            var recognizers = this.recognizers;
            var index = inArray(recognizers, recognizer);

            if (index !== -1) {
                recognizers.splice(index, 1);
                this.touchAction.update();
            }
        }

        return this;
    },

    /**
     * bind event
     * @param {String} events
     * @param {Function} handler
     * @returns {EventEmitter} this
     */
    on: function(events, handler) {
        if (events === undefined) {
            return;
        }
        if (handler === undefined) {
            return;
        }

        var handlers = this.handlers;
        each(splitStr(events), function(event) {
            handlers[event] = handlers[event] || [];
            handlers[event].push(handler);
        });
        return this;
    },

    /**
     * unbind event, leave emit blank to remove all handlers
     * @param {String} events
     * @param {Function} [handler]
     * @returns {EventEmitter} this
     */
    off: function(events, handler) {
        if (events === undefined) {
            return;
        }

        var handlers = this.handlers;
        each(splitStr(events), function(event) {
            if (!handler) {
                delete handlers[event];
            } else {
                handlers[event] && handlers[event].splice(inArray(handlers[event], handler), 1);
            }
        });
        return this;
    },

    /**
     * emit event to the listeners
     * @param {String} event
     * @param {Object} data
     */
    emit: function(event, data) {
        // we also want to trigger dom events
        if (this.options.domEvents) {
            triggerDomEvent(event, data);
        }

        // no handlers, so skip it all
        var handlers = this.handlers[event] && this.handlers[event].slice();
        if (!handlers || !handlers.length) {
            return;
        }

        data.type = event;
        data.preventDefault = function() {
            data.srcEvent.preventDefault();
        };

        var i = 0;
        while (i < handlers.length) {
            handlers[i](data);
            i++;
        }
    },

    /**
     * destroy the manager and unbinds all events
     * it doesn't unbind dom events, that is the user own responsibility
     */
    destroy: function() {
        this.element && toggleCssProps(this, false);

        this.handlers = {};
        this.session = {};
        this.input.destroy();
        this.element = null;
    }
};

/**
 * add/remove the css properties as defined in manager.options.cssProps
 * @param {Manager} manager
 * @param {Boolean} add
 */
function toggleCssProps(manager, add) {
    var element = manager.element;
    if (!element.style) {
        return;
    }
    var prop;
    each(manager.options.cssProps, function(value, name) {
        prop = prefixed(element.style, name);
        if (add) {
            manager.oldCssProps[prop] = element.style[prop];
            element.style[prop] = value;
        } else {
            element.style[prop] = manager.oldCssProps[prop] || '';
        }
    });
    if (!add) {
        manager.oldCssProps = {};
    }
}

/**
 * trigger dom event
 * @param {String} event
 * @param {Object} data
 */
function triggerDomEvent(event, data) {
    var gestureEvent = document.createEvent('Event');
    gestureEvent.initEvent(event, true, true);
    gestureEvent.gesture = data;
    data.target.dispatchEvent(gestureEvent);
}

assign(Hammer, {
    INPUT_START: INPUT_START,
    INPUT_MOVE: INPUT_MOVE,
    INPUT_END: INPUT_END,
    INPUT_CANCEL: INPUT_CANCEL,

    STATE_POSSIBLE: STATE_POSSIBLE,
    STATE_BEGAN: STATE_BEGAN,
    STATE_CHANGED: STATE_CHANGED,
    STATE_ENDED: STATE_ENDED,
    STATE_RECOGNIZED: STATE_RECOGNIZED,
    STATE_CANCELLED: STATE_CANCELLED,
    STATE_FAILED: STATE_FAILED,

    DIRECTION_NONE: DIRECTION_NONE,
    DIRECTION_LEFT: DIRECTION_LEFT,
    DIRECTION_RIGHT: DIRECTION_RIGHT,
    DIRECTION_UP: DIRECTION_UP,
    DIRECTION_DOWN: DIRECTION_DOWN,
    DIRECTION_HORIZONTAL: DIRECTION_HORIZONTAL,
    DIRECTION_VERTICAL: DIRECTION_VERTICAL,
    DIRECTION_ALL: DIRECTION_ALL,

    Manager: Manager,
    Input: Input,
    TouchAction: TouchAction,

    TouchInput: TouchInput,
    MouseInput: MouseInput,
    PointerEventInput: PointerEventInput,
    TouchMouseInput: TouchMouseInput,
    SingleTouchInput: SingleTouchInput,

    Recognizer: Recognizer,
    AttrRecognizer: AttrRecognizer,
    Tap: TapRecognizer,
    Pan: PanRecognizer,
    Swipe: SwipeRecognizer,
    Pinch: PinchRecognizer,
    Rotate: RotateRecognizer,
    Press: PressRecognizer,

    on: addEventListeners,
    off: removeEventListeners,
    each: each,
    merge: merge,
    extend: extend,
    assign: assign,
    inherit: inherit,
    bindFn: bindFn,
    prefixed: prefixed
});

// this prevents errors when Hammer is loaded in the presence of an AMD
//  style loader but by script tag, not by the loader.
var freeGlobal = (typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : {})); // jshint ignore:line
freeGlobal.Hammer = Hammer;

if (typeof define === 'function' && define.amd) {
    define(function() {
        return Hammer;
    });
} else if (typeof module != 'undefined' && module.exports) {
    module.exports = Hammer;
} else {
    window[exportName] = Hammer;
}

})(window, document, 'Hammer');

(function(angular){
  'use strict';

  angular.module(
    'weed', [
      'weed.core',
      'weed.auth.jwt',
      'weed.common',
      'weed.button',
      'weed.icon',
      'weed.forms',
      'weed.navbar',
      'weed.popup',
      'weed.tabs',
      'weed.sidebar',
      'weed.toload',
      'weed.list',
      'weed.calendar',
      'weed.corner-notifications',
      'weed.knob',
      'ui.bootstrap',
      'ui.bootstrap.typeahead',
      'ui.bootstrap.tooltip',
      'ui.bootstrap.popover'
      ])
    .constant('weed.config', {});
})(angular);

(function(angular){
  'use strict';

  angular
    .module('weed.auth.jwt', ['weed.core'])
    .service('weedJWTUtilities', weedJWTUtilities)
    .service('weedJWTAuthService', weedJWTAuthService)
    .factory('weedJWTInterceptor', weedJWTInterceptor);

  // Dependency injections
  weedJWTUtilities.$inject = ['$window'];
  weedJWTAuthService.$inject = ['$window', '$http', '$filter', 'weedJWTUtilities'];
  weedJWTInterceptor.$inject = ['$injector', 'weedJWTUtilities'];

  function weedJWTUtilities($window){
    var vm = this;

    // Generate local storage api token identifier
    vm.getLocalJWTId = function(apiId){
      return [apiId, 'jwt'].join('_');
    }

    // TODO: update documentation
    vm.getTokenInApi = function(apiId) {
      return $window.localStorage[vm.getLocalJWTId(apiId)];
    }

    // Saves a token
    vm.saveTokenForApi = function(apiId, token) {
      $window.localStorage[vm.getLocalJWTId(apiId)] = token;
    }

    // Parses a token
    vm.parseJwt = function(token) {
      var base64Url = token.split('.')[1];
      var base64 = base64Url.replace('-', '+').replace('_', '/');
      switch (base64.length % 4) {
        case 0:
          break;
        case 2:
          base64 += '==';
          break;
        case 3:
          base64 += '=';
          break;
        default:
          throw 'Illegal base64url string!';
      }
      return JSON.parse($window.atob(base64));
    }
  }

  function weedJWTAuthService($window, $http, $filter, weedJWTUtilities) {
    var vm = this,
        apiData = {},
        objectFilter = $filter('filter');

    // Service Utilites

    // Given an api and a route, builds the fully described route
    function buildRoute(apiId, route){
      return [apiData[apiId].url, route].join('/');
    }

    // Handles the incomming new tokens, save them and stores it's data
    // in the apiData object.
    function handleNewToken(apiId, route, data){
      var api = apiData[apiId],
          fRoute = buildRoute(apiId, route);

      return $http.post(fRoute, data)
        .success(function(data){
          if(data.token){

            // Post login local update
            vm.postLogin(apiId, data.token);
          }
        }
      );
    }

    // Saves user data returned by login endpoint
    function saveUserDataForApi(apiId, token){
      apiData[apiId].user = weedJWTUtilities.parseJwt(token);
      return apiData[apiId].user;
    }


    // Public Interface

    vm.postLogin = function(apiId, token){
      // Saves locallly the token for given api
      weedJWTUtilities.saveTokenForApi(apiId, token);

      // saves locally the user for the given api
      saveUserDataForApi(apiId, token);
    }

    //TODO: update documentation
    vm.addNewApi = function(api) {

      var existentToken = weedJWTUtilities.getTokenInApi(api.id),
          existentUser = existentToken ? weedJWTUtilities.parseJwt(existentToken) : {},
          defaults = {
            user: existentUser,
            loginRoute: 'token-auth/',
            refreshRoute: 'token-refresh/',
            autoRefresh: {
              enabled: true,
              timeDelta: 43200 // half a day
            }
          };

      // Api data init
      apiData[api.id] = angular.extend({}, defaults, api);
    }

    //TODO: update documentation
    vm.isAuthenticated = function(apiId) {
      var token = weedJWTUtilities.getTokenInApi(apiId);
      if (token) {
        var params = weedJWTUtilities.parseJwt(token);
        return Math.round(new Date().getTime() / 1000) < params.exp;
      }
      else {
        return false;
      }
    }

    //TODO: update documentation
    vm.getUser = function(apiId) {
      if (apiData[apiId].user){
        return apiData[apiId].user;
      }
      else if(apiData[apiId].token){
        return saveUserDataForApi(apiData[apiId].token);
      }

      return undefined;
    }

    //TODO: update documentation
    vm.login = function(apiId, data) {

      return handleNewToken(
        apiId,
        apiData[apiId].loginRoute,
        data
      );
    }

    //TODO: update documentation
    vm.refreshToken = function(apiId) {

      return handleNewToken (
        apiId,
        apiData[apiId].refreshRoute,
        {
          token: weedJWTUtilities.getTokenInApi(apiId)
        }
      );
    }

    // TODO: check if save state on server needed
    vm.logout = function(apiId) {
      $window.localStorage.removeItem(
        weedJWTUtilities.getLocalJWTId(apiId)
      );
    }

    // TODO: docu
    vm.getApiForURL = function(url){
      var apiKeys = Object.keys(apiData),
          api,
          i;

      for(i = 0; i < apiKeys.length; i++){
        api = apiData[apiKeys[i]];

        if(url.indexOf(api.url) > -1){
          return api;
        }
      }

      return undefined;
    }
  }

  function weedJWTInterceptor($injector, weedJWTUtilities) {
    return {
      // Automatically attach Authorization header
      request: function(config) {
        // Delay injection
        var authService = $injector.get('weedJWTAuthService'),

            // Find if the current request URL is of any of our JWT apis
            api = authService.getApiForURL(config.url),

            // Token declaration
            token,

            // Current time
            currentTime = Math.round(new Date().getTime() / 1000),

            // api userData
            userData;

        // If an api was found and token is still living
        if(api && authService.isAuthenticated(api.id)){

          // Fetch token from local storage
          token = weedJWTUtilities.getTokenInApi(api.id);

          // Decrypt userData from token
          userData = weedJWTUtilities.parseJwt(token);

          // Add to header
          config.headers.Authorization = 'JWT ' + token;

          // If autoRefresh is enabled and it's time to refresh
          if(api.autoRefresh.enabled && (
              (userData.exp - currentTime) < Math.abs(api.autoRefresh.timeDelta))){

            // Refresh token

            // Avoid concurrent refreshes
            api.autoRefresh.enabled = false;

            authService.refreshToken(api.id)
              .success(function(d){
                api.autoRefresh.enabled = true;
              })
              .error(function(d){
                api.autoRefresh.enabled = true;
              }
            );
          }
        }

        return config;
      },
      response: function(res){
        return res;
      }
    }
  }

})(angular);
(function(angular) {
  'use strict';

  angular.module('weed.core', [])
    .service('WeedApi', WeedApi)
    .service('WeedAdapter', WeedAdapter)
    .factory('Utils', Utils)
    .run(Setup);
  ;

  // No dependencies
  WeedApi.$inject = ['$timeout'];

  function WeedApi($timeout) {
    var listeners  = {};
    var settings   = {};
    var uniqueIds  = [];
    var service    = {};

    service.subscribe           = subscribe;
    service.unsubscribe         = unsubscribe;
    service.publish             = publish;
    service.getSettings         = getSettings;
    service.modifySettings      = modifySettings;
    service.generateUuid        = generateUuid;
    // service.toggleAnimate       = toggleAnimate;
    service.closeActiveElements = closeActiveElements;
    // service.animate             = animate;
    // service.animateAndAdvise    = animateAndAdvise;

    return service;

    // Registers a callback for a given element. The callback functions as a switch
    // for the diffrent events listeners of that element.
    // Callback receives an action parameter ('show', 'hide', 'open', 'close', 'etc')
    function subscribe(name, callback) {
      if (!listeners[name]) {
        listeners[name] = [];
      }

      listeners[name].push(callback);
      return true;
    }

    // Unregisters a callback for a given element.
    function unsubscribe(name, callback) {
      if (listeners[name] !== undefined) {
        delete listeners[name];
      }
      if (typeof callback == 'function') {
          callback.call(this);
      }
    }

    // Publish an event for a given element
    function publish(name, msg) {
      if (!listeners[name]) {
        listeners[name] = [];
      }

      listeners[name].forEach(function(cb) {

        // Avoid $digest problems
        $timeout(function(){cb(name, msg);}, 1);
      });

      return;
    }

    function getSettings() {
      return settings;
    }

    function modifySettings(tree) {
      settings = angular.extend(settings, tree);
      return settings;
    }

    function generateUuid() {
      var uuid = '';

      //little trick to produce semi-random IDs
      do {
        uuid += 'we-uuid-';
        for (var i=0; i<15; i++) {
          uuid += Math.floor(Math.random()*16).toString(16);
        }
      } while(!uniqueIds.indexOf(uuid));

      uniqueIds.push(uuid);
      return uuid;
    }
  }

  function closeActiveElements(options) {
    var self = this;
    options = options || {};
    var activeElements = document.querySelectorAll('.is-active[we-closable]');
    var nestedActiveElements = document.querySelectorAll('[we-closable] > .is-active');

    if (activeElements.length) {
      angular.forEach(activeElements, function(el) {
        if (options.exclude !== el.id) {
          self.publish(el.id, 'close');
        }
      });
    }
    if (nestedActiveElements.length) {
      angular.forEach(nestedActiveElements, function(el) {
        var parentId = el.parentNode.id;
        if (options.exclude !== parentId) {
          self.publish(parentId, 'close');
        }
      });
    }
  }

  WeedAdapter.$inject = ['WeedApi'];

  function WeedAdapter(weedApi) {

    var service    = {};

    service.activate = activate;
    service.deactivate = deactivate;

    return service;

    function activate(target) {
      weedApi.publish(target, 'show');
    }

    function deactivate(target) {
      weedApi.publish(target, 'hide');
    }
  }


  function Utils() {
    var utils = {};

    utils.throttle = throttleUtil;

    return utils;

    function throttleUtil(func, delay) {
      var timer = null;

      return function () {
        var context = this, args = arguments;

        if (timer === null) {
          timer = setTimeout(function () {
            func.apply(context, args);
            timer = null;
          }, delay);
        }
      };
    }
  }

  function Setup() {
    // Attach FastClick
    if (typeof(FastClick) !== 'undefined') {
      FastClick.attach(document.body);
    }

    // Attach viewport units buggyfill
    if (typeof(viewportUnitsBuggyfill) !== 'undefined') {
      viewportUnitsBuggyfill.init();
    }
  }

})(angular);
/*
 * angular-ui-bootstrap
 * http://angular-ui.github.io/bootstrap/

 * Version: 1.3.3 - 2016-05-22
 * License: MIT
 */angular.module("ui.bootstrap",["ui.bootstrap.tpls","ui.bootstrap.popover","ui.bootstrap.tooltip","ui.bootstrap.position","ui.bootstrap.stackedMap","ui.bootstrap.typeahead","ui.bootstrap.debounce"]),angular.module("ui.bootstrap.tpls",["uib/template/popover/popover-html.html","uib/template/popover/popover-template.html","uib/template/popover/popover.html","uib/template/tooltip/tooltip-html-popup.html","uib/template/tooltip/tooltip-popup.html","uib/template/tooltip/tooltip-template-popup.html","uib/template/typeahead/typeahead-match.html","uib/template/typeahead/typeahead-popup.html"]),angular.module("ui.bootstrap.popover",["ui.bootstrap.tooltip"]).directive("uibPopoverTemplatePopup",function(){return{replace:!0,scope:{uibTitle:"@",contentExp:"&",placement:"@",popupClass:"@",animation:"&",isOpen:"&",originScope:"&"},templateUrl:"uib/template/popover/popover-template.html"}}).directive("uibPopoverTemplate",["$uibTooltip",function(t){return t("uibPopoverTemplate","popover","click",{useContentExp:!0})}]).directive("uibPopoverHtmlPopup",function(){return{replace:!0,scope:{contentExp:"&",uibTitle:"@",placement:"@",popupClass:"@",animation:"&",isOpen:"&"},templateUrl:"uib/template/popover/popover-html.html"}}).directive("uibPopoverHtml",["$uibTooltip",function(t){return t("uibPopoverHtml","popover","click",{useContentExp:!0})}]).directive("uibPopoverPopup",function(){return{replace:!0,scope:{uibTitle:"@",content:"@",placement:"@",popupClass:"@",animation:"&",isOpen:"&"},templateUrl:"uib/template/popover/popover.html"}}).directive("uibPopover",["$uibTooltip",function(t){return t("uibPopover","popover","click")}]),angular.module("ui.bootstrap.tooltip",["ui.bootstrap.position","ui.bootstrap.stackedMap"]).provider("$uibTooltip",function(){function t(t){var o=/[A-Z]/g,e="-";return t.replace(o,function(t,o){return(o?e:"")+t.toLowerCase()})}var o={placement:"top",placementClassPrefix:"",animation:!0,popupDelay:0,popupCloseDelay:0,useContentExp:!1},e={mouseenter:"mouseleave",click:"click",outsideClick:"outsideClick",focus:"blur",none:""},i={};this.options=function(t){angular.extend(i,t)},this.setTriggers=function(t){angular.extend(e,t)},this.$get=["$window","$compile","$timeout","$document","$uibPosition","$interpolate","$rootScope","$parse","$$stackedMap",function(p,n,l,r,a,u,s,c,m){function h(t){if(27===t.which){var o=f.top();o&&(o.value.close(),f.removeTop(),o=null)}}var f=m.createNew();return r.on("keypress",h),s.$on("$destroy",function(){r.off("keypress",h)}),function(p,s,m,h){function d(t){var o=(t||h.trigger||m).split(" "),i=o.map(function(t){return e[t]||t});return{show:o,hide:i}}h=angular.extend({},o,i,h);var b=t(p),v=u.startSymbol(),g=u.endSymbol(),w="<div "+b+'-popup uib-title="'+v+"title"+g+'" '+(h.useContentExp?'content-exp="contentExp()" ':'content="'+v+"content"+g+'" ')+'placement="'+v+"placement"+g+'" popup-class="'+v+"popupClass"+g+'" animation="animation" is-open="isOpen" origin-scope="origScope" class="uib-position-measure"></div>';return{compile:function(){var t=n(w);return function(o,e,i){function n(){I.isOpen?m():u()}function u(){(!A||o.$eval(i[s+"Enable"]))&&(w(),C(),I.popupDelay?N||(N=l(b,I.popupDelay,!1)):b())}function m(){v(),I.popupCloseDelay?D||(D=l(g,I.popupCloseDelay,!1)):g()}function b(){return v(),w(),I.content?($(),void I.$evalAsync(function(){I.isOpen=!0,T(!0),Y()})):angular.noop}function v(){N&&(l.cancel(N),N=null),R&&(l.cancel(R),R=null)}function g(){I&&I.$evalAsync(function(){I&&(I.isOpen=!1,T(!1),I.animation?M||(M=l(y,150,!1)):y())})}function w(){D&&(l.cancel(D),D=null),M&&(l.cancel(M),M=null)}function $(){O||(E=I.$new(),O=t(E,function(t){H?r.find("body").append(t):e.after(t)}),k())}function y(){v(),w(),P(),O&&(O.remove(),O=null),E&&(E.$destroy(),E=null)}function C(){I.title=i[s+"Title"],I.content=q?q(o):i[p],I.popupClass=i[s+"Class"],I.placement=angular.isDefined(i[s+"Placement"])?i[s+"Placement"]:h.placement;var t=a.parsePlacement(I.placement);W=t[1]?t[0]+"-"+t[1]:t[0];var e=parseInt(i[s+"PopupDelay"],10),n=parseInt(i[s+"PopupCloseDelay"],10);I.popupDelay=isNaN(e)?h.popupDelay:e,I.popupCloseDelay=isNaN(n)?h.popupCloseDelay:n}function T(t){L&&angular.isFunction(L.assign)&&L.assign(o,t)}function k(){F.length=0,q?(F.push(o.$watch(q,function(t){I.content=t,!t&&I.isOpen&&g()})),F.push(E.$watch(function(){B||(B=!0,E.$$postDigest(function(){B=!1,I&&I.isOpen&&Y()}))}))):F.push(i.$observe(p,function(t){I.content=t,!t&&I.isOpen?g():Y()})),F.push(i.$observe(s+"Title",function(t){I.title=t,I.isOpen&&Y()})),F.push(i.$observe(s+"Placement",function(t){I.placement=t?t:h.placement,I.isOpen&&Y()}))}function P(){F.length&&(angular.forEach(F,function(t){t()}),F.length=0)}function x(t){I&&I.isOpen&&O&&(e[0].contains(t.target)||O[0].contains(t.target)||m())}function S(){var t=i[s+"Trigger"];X(),U=d(t),"none"!==U.show&&U.show.forEach(function(t,o){"outsideClick"===t?(e.on("click",n),r.on("click",x)):t===U.hide[o]?e.on(t,n):t&&(e.on(t,u),e.on(U.hide[o],m)),e.on("keypress",function(t){27===t.which&&m()})})}var O,E,M,N,D,R,W,H=angular.isDefined(h.appendToBody)?h.appendToBody:!1,U=d(void 0),A=angular.isDefined(i[s+"Enable"]),I=o.$new(!0),B=!1,L=angular.isDefined(i[s+"IsOpen"])?c(i[s+"IsOpen"]):!1,q=h.useContentExp?c(i[p]):!1,F=[],Y=function(){O&&O.html()&&(R||(R=l(function(){var t=a.positionElements(e,O,I.placement,H);O.css({top:t.top+"px",left:t.left+"px"}),O.hasClass(t.placement.split("-")[0])||(O.removeClass(W.split("-")[0]),O.addClass(t.placement.split("-")[0])),O.hasClass(h.placementClassPrefix+t.placement)||(O.removeClass(h.placementClassPrefix+W),O.addClass(h.placementClassPrefix+t.placement)),O.hasClass("uib-position-measure")?(a.positionArrow(O,t.placement),O.removeClass("uib-position-measure")):W!==t.placement&&a.positionArrow(O,t.placement),W=t.placement,R=null},0,!1)))};I.origScope=o,I.isOpen=!1,f.add(I,{close:g}),I.contentExp=function(){return I.content},i.$observe("disabled",function(t){t&&v(),t&&I.isOpen&&g()}),L&&o.$watch(L,function(t){I&&!t===I.isOpen&&n()});var X=function(){U.show.forEach(function(t){"outsideClick"===t?e.off("click",n):(e.off(t,u),e.off(t,n))}),U.hide.forEach(function(t){"outsideClick"===t?r.off("click",x):e.off(t,m)})};S();var V=o.$eval(i[s+"Animation"]);I.animation=angular.isDefined(V)?!!V:h.animation;var _,Z=s+"AppendToBody";_=Z in i&&void 0===i[Z]?!0:o.$eval(i[Z]),H=angular.isDefined(_)?_:H,o.$on("$destroy",function(){X(),y(),f.remove(I),I=null})}}}}}]}).directive("uibTooltipTemplateTransclude",["$animate","$sce","$compile","$templateRequest",function(t,o,e,i){return{link:function(p,n,l){var r,a,u,s=p.$eval(l.tooltipTemplateTranscludeScope),c=0,m=function(){a&&(a.remove(),a=null),r&&(r.$destroy(),r=null),u&&(t.leave(u).then(function(){a=null}),a=u,u=null)};p.$watch(o.parseAsResourceUrl(l.uibTooltipTemplateTransclude),function(o){var l=++c;o?(i(o,!0).then(function(i){if(l===c){var p=s.$new(),a=i,h=e(a)(p,function(o){m(),t.enter(o,n)});r=p,u=h,r.$emit("$includeContentLoaded",o)}},function(){l===c&&(m(),p.$emit("$includeContentError",o))}),p.$emit("$includeContentRequested",o)):m()}),p.$on("$destroy",m)}}}]).directive("uibTooltipClasses",["$uibPosition",function(t){return{restrict:"A",link:function(o,e,i){if(o.placement){var p=t.parsePlacement(o.placement);e.addClass(p[0])}o.popupClass&&e.addClass(o.popupClass),o.animation()&&e.addClass(i.tooltipAnimationClass)}}}]).directive("uibTooltipPopup",function(){return{replace:!0,scope:{content:"@",placement:"@",popupClass:"@",animation:"&",isOpen:"&"},templateUrl:"uib/template/tooltip/tooltip-popup.html"}}).directive("uibTooltip",["$uibTooltip",function(t){return t("uibTooltip","tooltip","mouseenter")}]).directive("uibTooltipTemplatePopup",function(){return{replace:!0,scope:{contentExp:"&",placement:"@",popupClass:"@",animation:"&",isOpen:"&",originScope:"&"},templateUrl:"uib/template/tooltip/tooltip-template-popup.html"}}).directive("uibTooltipTemplate",["$uibTooltip",function(t){return t("uibTooltipTemplate","tooltip","mouseenter",{useContentExp:!0})}]).directive("uibTooltipHtmlPopup",function(){return{replace:!0,scope:{contentExp:"&",placement:"@",popupClass:"@",animation:"&",isOpen:"&"},templateUrl:"uib/template/tooltip/tooltip-html-popup.html"}}).directive("uibTooltipHtml",["$uibTooltip",function(t){return t("uibTooltipHtml","tooltip","mouseenter",{useContentExp:!0})}]),angular.module("ui.bootstrap.position",[]).factory("$uibPosition",["$document","$window",function(t,o){var e,i,p={normal:/(auto|scroll)/,hidden:/(auto|scroll|hidden)/},n={auto:/\s?auto?\s?/i,primary:/^(top|bottom|left|right)$/,secondary:/^(top|bottom|left|right|center)$/,vertical:/^(top|bottom)$/},l=/(HTML|BODY)/;return{getRawNode:function(t){return t.nodeName?t:t[0]||t},parseStyle:function(t){return t=parseFloat(t),isFinite(t)?t:0},offsetParent:function(e){function i(t){return"static"===(o.getComputedStyle(t).position||"static")}e=this.getRawNode(e);for(var p=e.offsetParent||t[0].documentElement;p&&p!==t[0].documentElement&&i(p);)p=p.offsetParent;return p||t[0].documentElement},scrollbarWidth:function(p){if(p){if(angular.isUndefined(i)){var n=t.find("body");n.addClass("uib-position-body-scrollbar-measure"),i=o.innerWidth-n[0].clientWidth,i=isFinite(i)?i:0,n.removeClass("uib-position-body-scrollbar-measure")}return i}if(angular.isUndefined(e)){var l=angular.element('<div class="uib-position-scrollbar-measure"></div>');t.find("body").append(l),e=l[0].offsetWidth-l[0].clientWidth,e=isFinite(e)?e:0,l.remove()}return e},scrollbarPadding:function(t){t=this.getRawNode(t);var e=o.getComputedStyle(t),i=this.parseStyle(e.paddingRight),p=this.parseStyle(e.paddingBottom),n=this.scrollParent(t,!1,!0),r=this.scrollbarWidth(n,l.test(n.tagName));return{scrollbarWidth:r,widthOverflow:n.scrollWidth>n.clientWidth,right:i+r,originalRight:i,heightOverflow:n.scrollHeight>n.clientHeight,bottom:p+r,originalBottom:p}},isScrollable:function(t,e){t=this.getRawNode(t);var i=e?p.hidden:p.normal,n=o.getComputedStyle(t);return i.test(n.overflow+n.overflowY+n.overflowX)},scrollParent:function(e,i,n){e=this.getRawNode(e);var l=i?p.hidden:p.normal,r=t[0].documentElement,a=o.getComputedStyle(e);if(n&&l.test(a.overflow+a.overflowY+a.overflowX))return e;var u="absolute"===a.position,s=e.parentElement||r;if(s===r||"fixed"===a.position)return r;for(;s.parentElement&&s!==r;){var c=o.getComputedStyle(s);if(u&&"static"!==c.position&&(u=!1),!u&&l.test(c.overflow+c.overflowY+c.overflowX))break;s=s.parentElement}return s},position:function(e,i){e=this.getRawNode(e);var p=this.offset(e);if(i){var n=o.getComputedStyle(e);p.top-=this.parseStyle(n.marginTop),p.left-=this.parseStyle(n.marginLeft)}var l=this.offsetParent(e),r={top:0,left:0};return l!==t[0].documentElement&&(r=this.offset(l),r.top+=l.clientTop-l.scrollTop,r.left+=l.clientLeft-l.scrollLeft),{width:Math.round(angular.isNumber(p.width)?p.width:e.offsetWidth),height:Math.round(angular.isNumber(p.height)?p.height:e.offsetHeight),top:Math.round(p.top-r.top),left:Math.round(p.left-r.left)}},offset:function(e){e=this.getRawNode(e);var i=e.getBoundingClientRect();return{width:Math.round(angular.isNumber(i.width)?i.width:e.offsetWidth),height:Math.round(angular.isNumber(i.height)?i.height:e.offsetHeight),top:Math.round(i.top+(o.pageYOffset||t[0].documentElement.scrollTop)),left:Math.round(i.left+(o.pageXOffset||t[0].documentElement.scrollLeft))}},viewportOffset:function(e,i,p){e=this.getRawNode(e),p=p!==!1?!0:!1;var n=e.getBoundingClientRect(),l={top:0,left:0,bottom:0,right:0},r=i?t[0].documentElement:this.scrollParent(e),a=r.getBoundingClientRect();if(l.top=a.top+r.clientTop,l.left=a.left+r.clientLeft,r===t[0].documentElement&&(l.top+=o.pageYOffset,l.left+=o.pageXOffset),l.bottom=l.top+r.clientHeight,l.right=l.left+r.clientWidth,p){var u=o.getComputedStyle(r);l.top+=this.parseStyle(u.paddingTop),l.bottom-=this.parseStyle(u.paddingBottom),l.left+=this.parseStyle(u.paddingLeft),l.right-=this.parseStyle(u.paddingRight)}return{top:Math.round(n.top-l.top),bottom:Math.round(l.bottom-n.bottom),left:Math.round(n.left-l.left),right:Math.round(l.right-n.right)}},parsePlacement:function(t){var o=n.auto.test(t);return o&&(t=t.replace(n.auto,"")),t=t.split("-"),t[0]=t[0]||"top",n.primary.test(t[0])||(t[0]="top"),t[1]=t[1]||"center",n.secondary.test(t[1])||(t[1]="center"),t[2]=o?!0:!1,t},positionElements:function(t,e,i,p){t=this.getRawNode(t),e=this.getRawNode(e);var l=angular.isDefined(e.offsetWidth)?e.offsetWidth:e.prop("offsetWidth"),r=angular.isDefined(e.offsetHeight)?e.offsetHeight:e.prop("offsetHeight");i=this.parsePlacement(i);var a=p?this.offset(t):this.position(t),u={top:0,left:0,placement:""};if(i[2]){var s=this.viewportOffset(t,p),c=o.getComputedStyle(e),m={width:l+Math.round(Math.abs(this.parseStyle(c.marginLeft)+this.parseStyle(c.marginRight))),height:r+Math.round(Math.abs(this.parseStyle(c.marginTop)+this.parseStyle(c.marginBottom)))};if(i[0]="top"===i[0]&&m.height>s.top&&m.height<=s.bottom?"bottom":"bottom"===i[0]&&m.height>s.bottom&&m.height<=s.top?"top":"left"===i[0]&&m.width>s.left&&m.width<=s.right?"right":"right"===i[0]&&m.width>s.right&&m.width<=s.left?"left":i[0],i[1]="top"===i[1]&&m.height-a.height>s.bottom&&m.height-a.height<=s.top?"bottom":"bottom"===i[1]&&m.height-a.height>s.top&&m.height-a.height<=s.bottom?"top":"left"===i[1]&&m.width-a.width>s.right&&m.width-a.width<=s.left?"right":"right"===i[1]&&m.width-a.width>s.left&&m.width-a.width<=s.right?"left":i[1],"center"===i[1])if(n.vertical.test(i[0])){var h=a.width/2-l/2;s.left+h<0&&m.width-a.width<=s.right?i[1]="left":s.right+h<0&&m.width-a.width<=s.left&&(i[1]="right")}else{var f=a.height/2-m.height/2;s.top+f<0&&m.height-a.height<=s.bottom?i[1]="top":s.bottom+f<0&&m.height-a.height<=s.top&&(i[1]="bottom")}}switch(i[0]){case"top":u.top=a.top-r;break;case"bottom":u.top=a.top+a.height;break;case"left":u.left=a.left-l;break;case"right":u.left=a.left+a.width}switch(i[1]){case"top":u.top=a.top;break;case"bottom":u.top=a.top+a.height-r;break;case"left":u.left=a.left;break;case"right":u.left=a.left+a.width-l;break;case"center":n.vertical.test(i[0])?u.left=a.left+a.width/2-l/2:u.top=a.top+a.height/2-r/2}return u.top=Math.round(u.top),u.left=Math.round(u.left),u.placement="center"===i[1]?i[0]:i[0]+"-"+i[1],u},positionArrow:function(t,e){t=this.getRawNode(t);var i=t.querySelector(".tooltip-inner, .popover-inner");if(i){var p=angular.element(i).hasClass("tooltip-inner"),l=t.querySelector(p?".tooltip-arrow":".arrow");if(l){var r={top:"",bottom:"",left:"",right:""};if(e=this.parsePlacement(e),"center"===e[1])return void angular.element(l).css(r);var a="border-"+e[0]+"-width",u=o.getComputedStyle(l)[a],s="border-";s+=n.vertical.test(e[0])?e[0]+"-"+e[1]:e[1]+"-"+e[0],s+="-radius";var c=o.getComputedStyle(p?i:t)[s];switch(e[0]){case"top":r.bottom=p?"0":"-"+u;break;case"bottom":r.top=p?"0":"-"+u;break;case"left":r.right=p?"0":"-"+u;break;case"right":r.left=p?"0":"-"+u}r[e[1]]=c,angular.element(l).css(r)}}}}}]),angular.module("ui.bootstrap.stackedMap",[]).factory("$$stackedMap",function(){return{createNew:function(){var t=[];return{add:function(o,e){t.push({key:o,value:e})},get:function(o){for(var e=0;e<t.length;e++)if(o===t[e].key)return t[e]},keys:function(){for(var o=[],e=0;e<t.length;e++)o.push(t[e].key);return o},top:function(){return t[t.length-1]},remove:function(o){for(var e=-1,i=0;i<t.length;i++)if(o===t[i].key){e=i;break}return t.splice(e,1)[0]},removeTop:function(){return t.splice(t.length-1,1)[0]},length:function(){return t.length}}}}}),angular.module("ui.bootstrap.typeahead",["ui.bootstrap.debounce","ui.bootstrap.position"]).factory("uibTypeaheadParser",["$parse",function(t){var o=/^\s*([\s\S]+?)(?:\s+as\s+([\s\S]+?))?\s+for\s+(?:([\$\w][\$\w\d]*))\s+in\s+([\s\S]+?)$/;return{parse:function(e){var i=e.match(o);if(!i)throw new Error('Expected typeahead specification in form of "_modelValue_ (as _label_)? for _item_ in _collection_" but got "'+e+'".');return{itemName:i[3],source:t(i[4]),viewMapper:t(i[2]||i[1]),modelMapper:t(i[1])}}}}]).controller("UibTypeaheadController",["$scope","$element","$attrs","$compile","$parse","$q","$timeout","$document","$window","$rootScope","$$debounce","$uibPosition","uibTypeaheadParser",function(t,o,e,i,p,n,l,r,a,u,s,c,m){function h(){L.moveInProgress||(L.moveInProgress=!0,L.$digest()),G()}function f(){L.position=M?c.offset(o):c.position(o),L.position.top+=o.prop("offsetHeight")}var d,b,v=[9,13,27,38,40],g=200,w=t.$eval(e.typeaheadMinLength);w||0===w||(w=1),t.$watch(e.typeaheadMinLength,function(t){w=t||0===t?t:1});var $=t.$eval(e.typeaheadWaitMs)||0,y=t.$eval(e.typeaheadEditable)!==!1;t.$watch(e.typeaheadEditable,function(t){y=t!==!1});var C,T,k=p(e.typeaheadLoading).assign||angular.noop,P=e.typeaheadShouldSelect?p(e.typeaheadShouldSelect):function(t,o){var e=o.$event;return 13===e.which||9===e.which},x=p(e.typeaheadOnSelect),S=angular.isDefined(e.typeaheadSelectOnBlur)?t.$eval(e.typeaheadSelectOnBlur):!1,O=p(e.typeaheadNoResults).assign||angular.noop,E=e.typeaheadInputFormatter?p(e.typeaheadInputFormatter):void 0,M=e.typeaheadAppendToBody?t.$eval(e.typeaheadAppendToBody):!1,N=e.typeaheadAppendTo?t.$eval(e.typeaheadAppendTo):null,D=t.$eval(e.typeaheadFocusFirst)!==!1,R=e.typeaheadSelectOnExact?t.$eval(e.typeaheadSelectOnExact):!1,W=p(e.typeaheadIsOpen).assign||angular.noop,H=t.$eval(e.typeaheadShowHint)||!1,U=p(e.ngModel),A=p(e.ngModel+"($$$p)"),I=function(o,e){return angular.isFunction(U(t))&&b&&b.$options&&b.$options.getterSetter?A(o,{$$$p:e}):U.assign(o,e)},B=m.parse(e.uibTypeahead),L=t.$new(),q=t.$on("$destroy",function(){L.$destroy()});L.$on("$destroy",q);var F="typeahead-"+L.$id+"-"+Math.floor(1e4*Math.random());o.attr({"aria-autocomplete":"list","aria-expanded":!1,"aria-owns":F});var Y,X;H&&(Y=angular.element("<div></div>"),Y.css("position","relative"),o.after(Y),X=o.clone(),X.attr("placeholder",""),X.attr("tabindex","-1"),X.val(""),X.css({position:"absolute",top:"0px",left:"0px","border-color":"transparent","box-shadow":"none",opacity:1,background:"none 0% 0% / auto repeat scroll padding-box border-box rgb(255, 255, 255)",color:"#999"}),o.css({position:"relative","vertical-align":"top","background-color":"transparent"}),Y.append(X),X.after(o));var V=angular.element("<div uib-typeahead-popup></div>");V.attr({id:F,matches:"matches",active:"activeIdx",select:"select(activeIdx, evt)","move-in-progress":"moveInProgress",query:"query",position:"position","assign-is-open":"assignIsOpen(isOpen)",debounce:"debounceUpdate"}),angular.isDefined(e.typeaheadTemplateUrl)&&V.attr("template-url",e.typeaheadTemplateUrl),angular.isDefined(e.typeaheadPopupTemplateUrl)&&V.attr("popup-template-url",e.typeaheadPopupTemplateUrl);var _=function(){H&&X.val("")},Z=function(){L.matches=[],L.activeIdx=-1,o.attr("aria-expanded",!1),_()},j=function(t){return F+"-option-"+t};L.$watch("activeIdx",function(t){0>t?o.removeAttr("aria-activedescendant"):o.attr("aria-activedescendant",j(t))});var z=function(t,o){return L.matches.length>o&&t?t.toUpperCase()===L.matches[o].label.toUpperCase():!1},K=function(e,i){var p={$viewValue:e};k(t,!0),O(t,!1),n.when(B.source(t,p)).then(function(n){var l=e===d.$viewValue;if(l&&C)if(n&&n.length>0){L.activeIdx=D?0:-1,O(t,!1),L.matches.length=0;for(var r=0;r<n.length;r++)p[B.itemName]=n[r],L.matches.push({id:j(r),label:B.viewMapper(L,p),model:n[r]});if(L.query=e,f(),o.attr("aria-expanded",!0),R&&1===L.matches.length&&z(e,0)&&(angular.isNumber(L.debounceUpdate)||angular.isObject(L.debounceUpdate)?s(function(){L.select(0,i)},angular.isNumber(L.debounceUpdate)?L.debounceUpdate:L.debounceUpdate["default"]):L.select(0,i)),H){var a=L.matches[0].label;X.val(angular.isString(e)&&e.length>0&&a.slice(0,e.length).toUpperCase()===e.toUpperCase()?e+a.slice(e.length):"")}}else Z(),O(t,!0);l&&k(t,!1)},function(){Z(),k(t,!1),O(t,!0)})};M&&(angular.element(a).on("resize",h),r.find("body").on("scroll",h));var G=s(function(){L.matches.length&&f(),L.moveInProgress=!1},g);L.moveInProgress=!1,L.query=void 0;var J,Q=function(t){J=l(function(){K(t)},$)},to=function(){J&&l.cancel(J)};Z(),L.assignIsOpen=function(o){W(t,o)},L.select=function(i,p){var n,r,a={};T=!0,a[B.itemName]=r=L.matches[i].model,n=B.modelMapper(t,a),I(t,n),d.$setValidity("editable",!0),d.$setValidity("parse",!0),x(t,{$item:r,$model:n,$label:B.viewMapper(t,a),$event:p}),Z(),L.$eval(e.typeaheadFocusOnSelect)!==!1&&l(function(){o[0].focus()},0,!1)},o.on("keydown",function(o){if(0!==L.matches.length&&-1!==v.indexOf(o.which)){var e=P(t,{$event:o});if(-1===L.activeIdx&&e||9===o.which&&o.shiftKey)return Z(),void L.$digest();o.preventDefault();var i;switch(o.which){case 27:o.stopPropagation(),Z(),t.$digest();break;case 38:L.activeIdx=(L.activeIdx>0?L.activeIdx:L.matches.length)-1,L.$digest(),i=V.find("li")[L.activeIdx],i.parentNode.scrollTop=i.offsetTop;break;case 40:L.activeIdx=(L.activeIdx+1)%L.matches.length,L.$digest(),i=V.find("li")[L.activeIdx],i.parentNode.scrollTop=i.offsetTop;break;default:e&&L.$apply(function(){angular.isNumber(L.debounceUpdate)||angular.isObject(L.debounceUpdate)?s(function(){L.select(L.activeIdx,o)},angular.isNumber(L.debounceUpdate)?L.debounceUpdate:L.debounceUpdate["default"]):L.select(L.activeIdx,o)})}}}),o.bind("focus",function(t){C=!0,0!==w||d.$viewValue||l(function(){K(d.$viewValue,t)},0)}),o.bind("blur",function(t){S&&L.matches.length&&-1!==L.activeIdx&&!T&&(T=!0,L.$apply(function(){angular.isObject(L.debounceUpdate)&&angular.isNumber(L.debounceUpdate.blur)?s(function(){L.select(L.activeIdx,t)},L.debounceUpdate.blur):L.select(L.activeIdx,t)})),!y&&d.$error.editable&&(d.$setViewValue(),d.$setValidity("editable",!0),d.$setValidity("parse",!0),o.val("")),C=!1,T=!1});var oo=function(e){o[0]!==e.target&&3!==e.which&&0!==L.matches.length&&(Z(),u.$$phase||t.$digest())};r.on("click",oo),t.$on("$destroy",function(){r.off("click",oo),(M||N)&&eo.remove(),M&&(angular.element(a).off("resize",h),r.find("body").off("scroll",h)),V.remove(),H&&Y.remove()});var eo=i(V)(L);M?r.find("body").append(eo):N?angular.element(N).eq(0).append(eo):o.after(eo),this.init=function(o,e){d=o,b=e,L.debounceUpdate=d.$options&&p(d.$options.debounce)(t),d.$parsers.unshift(function(o){return C=!0,0===w||o&&o.length>=w?$>0?(to(),Q(o)):K(o):(k(t,!1),to(),Z()),y?o:o?void d.$setValidity("editable",!1):(d.$setValidity("editable",!0),null)}),d.$formatters.push(function(o){var e,i,p={};return y||d.$setValidity("editable",!0),E?(p.$model=o,E(t,p)):(p[B.itemName]=o,e=B.viewMapper(t,p),p[B.itemName]=void 0,i=B.viewMapper(t,p),e!==i?e:o)})}}]).directive("uibTypeahead",function(){return{controller:"UibTypeaheadController",require:["ngModel","^?ngModelOptions","uibTypeahead"],link:function(t,o,e,i){i[2].init(i[0],i[1])}}}).directive("uibTypeaheadPopup",["$$debounce",function(t){return{scope:{matches:"=",query:"=",active:"=",position:"&",moveInProgress:"=",select:"&",assignIsOpen:"&",debounce:"&"},replace:!0,templateUrl:function(t,o){return o.popupTemplateUrl||"uib/template/typeahead/typeahead-popup.html"},link:function(o,e,i){o.templateUrl=i.templateUrl,o.isOpen=function(){var t=o.matches.length>0;return o.assignIsOpen({isOpen:t}),t},o.isActive=function(t){return o.active===t},o.selectActive=function(t){o.active=t},o.selectMatch=function(e,i){var p=o.debounce();angular.isNumber(p)||angular.isObject(p)?t(function(){o.select({activeIdx:e,evt:i})},angular.isNumber(p)?p:p["default"]):o.select({activeIdx:e,evt:i})}}}}]).directive("uibTypeaheadMatch",["$templateRequest","$compile","$parse",function(t,o,e){return{scope:{index:"=",match:"=",query:"="},link:function(i,p,n){var l=e(n.templateUrl)(i.$parent)||"uib/template/typeahead/typeahead-match.html";t(l).then(function(t){var e=angular.element(t.trim());p.replaceWith(e),o(e)(i)})}}}]).filter("uibTypeaheadHighlight",["$sce","$injector","$log",function(t,o,e){function i(t){return t.replace(/([.?*+^$[\]\\(){}|-])/g,"\\$1")}function p(t){return/<.*>/g.test(t)}var n;return n=o.has("$sanitize"),function(o,l){return!n&&p(o)&&e.warn("Unsafe use of typeahead please use ngSanitize"),o=l?(""+o).replace(new RegExp(i(l),"gi"),"<strong>$&</strong>"):o,n||(o=t.trustAsHtml(o)),o}}]),angular.module("ui.bootstrap.debounce",[]).factory("$$debounce",["$timeout",function(t){return function(o,e){var i;return function(){var p=this,n=Array.prototype.slice.call(arguments);i&&t.cancel(i),i=t(function(){o.apply(p,n)},e)}}}]),angular.module("uib/template/popover/popover-html.html",[]).run(["$templateCache",function(t){t.put("uib/template/popover/popover-html.html",'<div class="popover"\n  tooltip-animation-class="fade"\n  uib-tooltip-classes\n  ng-class="{ in: isOpen() }">\n  <div class="arrow"></div>\n\n  <div class="popover-inner">\n      <h3 class="popover-title" ng-bind="uibTitle" ng-if="uibTitle"></h3>\n      <div class="popover-content" ng-bind-html="contentExp()"></div>\n  </div>\n</div>\n')}]),angular.module("uib/template/popover/popover-template.html",[]).run(["$templateCache",function(t){t.put("uib/template/popover/popover-template.html",'<div class="popover"\n  tooltip-animation-class="fade"\n  uib-tooltip-classes\n  ng-class="{ in: isOpen() }">\n  <div class="arrow"></div>\n\n  <div class="popover-inner">\n      <h3 class="popover-title" ng-bind="uibTitle" ng-if="uibTitle"></h3>\n      <div class="popover-content"\n        uib-tooltip-template-transclude="contentExp()"\n        tooltip-template-transclude-scope="originScope()"></div>\n  </div>\n</div>\n')}]),angular.module("uib/template/popover/popover.html",[]).run(["$templateCache",function(t){t.put("uib/template/popover/popover.html",'<div class="popover"\n  tooltip-animation-class="fade"\n  uib-tooltip-classes\n  ng-class="{ in: isOpen() }">\n  <div class="arrow"></div>\n\n  <div class="popover-inner">\n      <h3 class="popover-title" ng-bind="uibTitle" ng-if="uibTitle"></h3>\n      <div class="popover-content" ng-bind="content"></div>\n  </div>\n</div>\n')}]),angular.module("uib/template/tooltip/tooltip-html-popup.html",[]).run(["$templateCache",function(t){t.put("uib/template/tooltip/tooltip-html-popup.html",'<div class="tooltip"\n  tooltip-animation-class="fade"\n  uib-tooltip-classes\n  ng-class="{ in: isOpen() }">\n  <div class="tooltip-arrow"></div>\n  <div class="tooltip-inner" ng-bind-html="contentExp()"></div>\n</div>\n')}]),angular.module("uib/template/tooltip/tooltip-popup.html",[]).run(["$templateCache",function(t){t.put("uib/template/tooltip/tooltip-popup.html",'<div class="tooltip"\n  tooltip-animation-class="fade"\n  uib-tooltip-classes\n  ng-class="{ in: isOpen() }">\n  <div class="tooltip-arrow"></div>\n  <div class="tooltip-inner" ng-bind="content"></div>\n</div>\n')}]),angular.module("uib/template/tooltip/tooltip-template-popup.html",[]).run(["$templateCache",function(t){t.put("uib/template/tooltip/tooltip-template-popup.html",'<div class="tooltip"\n  tooltip-animation-class="fade"\n  uib-tooltip-classes\n  ng-class="{ in: isOpen() }">\n  <div class="tooltip-arrow"></div>\n  <div class="tooltip-inner"\n    uib-tooltip-template-transclude="contentExp()"\n    tooltip-template-transclude-scope="originScope()"></div>\n</div>\n')}]),angular.module("uib/template/typeahead/typeahead-match.html",[]).run(["$templateCache",function(t){t.put("uib/template/typeahead/typeahead-match.html",'<a href\n   tabindex="-1"\n   ng-bind-html="match.label | uibTypeaheadHighlight:query"\n   ng-attr-title="{{match.label}}"></a>\n')}]),angular.module("uib/template/typeahead/typeahead-popup.html",[]).run(["$templateCache",function(t){t.put("uib/template/typeahead/typeahead-popup.html",'<ul class="dropdown-menu" ng-show="isOpen() && !moveInProgress" ng-style="{top: position().top+\'px\', left: position().left+\'px\'}" role="listbox" aria-hidden="{{!isOpen()}}">\n    <li ng-repeat="match in matches track by $index" ng-class="{active: isActive($index) }" ng-mouseenter="selectActive($index)" ng-click="selectMatch($index, $event)" role="option" id="{{::match.id}}">\n        <div uib-typeahead-match index="$index" match="match" query="query" template-url="templateUrl"></div>\n    </li>\n</ul>\n')}]),angular.module("ui.bootstrap.tooltip").run(function(){!angular.$$csp().noInlineStyle&&!angular.$$uibTooltipCss&&angular.element(document).find("head").prepend('<style type="text/css">[uib-tooltip-popup].tooltip.top-left > .tooltip-arrow,[uib-tooltip-popup].tooltip.top-right > .tooltip-arrow,[uib-tooltip-popup].tooltip.bottom-left > .tooltip-arrow,[uib-tooltip-popup].tooltip.bottom-right > .tooltip-arrow,[uib-tooltip-popup].tooltip.left-top > .tooltip-arrow,[uib-tooltip-popup].tooltip.left-bottom > .tooltip-arrow,[uib-tooltip-popup].tooltip.right-top > .tooltip-arrow,[uib-tooltip-popup].tooltip.right-bottom > .tooltip-arrow,[uib-tooltip-html-popup].tooltip.top-left > .tooltip-arrow,[uib-tooltip-html-popup].tooltip.top-right > .tooltip-arrow,[uib-tooltip-html-popup].tooltip.bottom-left > .tooltip-arrow,[uib-tooltip-html-popup].tooltip.bottom-right > .tooltip-arrow,[uib-tooltip-html-popup].tooltip.left-top > .tooltip-arrow,[uib-tooltip-html-popup].tooltip.left-bottom > .tooltip-arrow,[uib-tooltip-html-popup].tooltip.right-top > .tooltip-arrow,[uib-tooltip-html-popup].tooltip.right-bottom > .tooltip-arrow,[uib-tooltip-template-popup].tooltip.top-left > .tooltip-arrow,[uib-tooltip-template-popup].tooltip.top-right > .tooltip-arrow,[uib-tooltip-template-popup].tooltip.bottom-left > .tooltip-arrow,[uib-tooltip-template-popup].tooltip.bottom-right > .tooltip-arrow,[uib-tooltip-template-popup].tooltip.left-top > .tooltip-arrow,[uib-tooltip-template-popup].tooltip.left-bottom > .tooltip-arrow,[uib-tooltip-template-popup].tooltip.right-top > .tooltip-arrow,[uib-tooltip-template-popup].tooltip.right-bottom > .tooltip-arrow,[uib-popover-popup].popover.top-left > .arrow,[uib-popover-popup].popover.top-right > .arrow,[uib-popover-popup].popover.bottom-left > .arrow,[uib-popover-popup].popover.bottom-right > .arrow,[uib-popover-popup].popover.left-top > .arrow,[uib-popover-popup].popover.left-bottom > .arrow,[uib-popover-popup].popover.right-top > .arrow,[uib-popover-popup].popover.right-bottom > .arrow,[uib-popover-html-popup].popover.top-left > .arrow,[uib-popover-html-popup].popover.top-right > .arrow,[uib-popover-html-popup].popover.bottom-left > .arrow,[uib-popover-html-popup].popover.bottom-right > .arrow,[uib-popover-html-popup].popover.left-top > .arrow,[uib-popover-html-popup].popover.left-bottom > .arrow,[uib-popover-html-popup].popover.right-top > .arrow,[uib-popover-html-popup].popover.right-bottom > .arrow,[uib-popover-template-popup].popover.top-left > .arrow,[uib-popover-template-popup].popover.top-right > .arrow,[uib-popover-template-popup].popover.bottom-left > .arrow,[uib-popover-template-popup].popover.bottom-right > .arrow,[uib-popover-template-popup].popover.left-top > .arrow,[uib-popover-template-popup].popover.left-bottom > .arrow,[uib-popover-template-popup].popover.right-top > .arrow,[uib-popover-template-popup].popover.right-bottom > .arrow{top:auto;bottom:auto;left:auto;right:auto;margin:0;}[uib-popover-popup].popover,[uib-popover-html-popup].popover,[uib-popover-template-popup].popover{display:block !important;}</style>'),angular.$$uibTooltipCss=!0}),angular.module("ui.bootstrap.position").run(function(){!angular.$$csp().noInlineStyle&&!angular.$$uibPositionCss&&angular.element(document).find("head").prepend('<style type="text/css">.uib-position-measure{display:block !important;visibility:hidden !important;position:absolute !important;top:-9999px !important;left:-9999px !important;}.uib-position-scrollbar-measure{position:absolute !important;top:-9999px !important;width:50px !important;height:50px !important;overflow:scroll !important;}.uib-position-body-scrollbar-measure{overflow:scroll !important;}</style>'),angular.$$uibPositionCss=!0}),angular.module("ui.bootstrap.typeahead").run(function(){!angular.$$csp().noInlineStyle&&!angular.$$uibTypeaheadCss&&angular.element(document).find("head").prepend('<style type="text/css">[uib-typeahead-popup].dropdown-menu{display:block;}</style>'),angular.$$uibTypeaheadCss=!0});
/**
 * @ngdoc function
 * @name weed.directive: weNavbar
 * @description
 * # navbarDirective
 * Directive of the app
 * TODO: to-load, button-groups
 */

(function(angular){
  'use strict';

  angular.module('weed.button', ['weed.core'])
    .directive('weButton', buttonDirective);

  // No dependency injections

  function buttonDirective(){
    return {
      restrict: 'A',
      transclude: true,
      replace: true,
      scope: {
          icon: '@',
          color: '@',
          toload: '&?',
          size: '@',
          state: '@'
      },
      templateUrl: function(elem, attrs){
        if(elem[0].tagName === 'A'){
          return 'components/button/button_a.html';
        }

        return 'components/button/button_button.html';
      },
      link: buttonLink
    };
  }

  function buttonLink(scope, elem, attrs, controllers, $transclude) {
    var buttonCurrentWidth,
        buttonCurrentHeight,
        loaderWidth,
        oLoader;

    // Check if there is text
    $transclude(function(clone){
      scope.hasText = clone.length > 0;
    });

    // If load behavior attached
    if(scope.toload){
      elem.on('click', function(e){

        // If yet not loading
        if(!scope.loading){

          // Try to get a defer from toload attribute
          var promise = scope.$apply(scope.toload);

          // If it's a promise
          if(promise.then){
            promise.then(
              function(data){

                // On success, set loading false
                scope.loading = false;
              },
              function(data){

                // On failure, set loading false
                scope.loading = false;
              }
            );
          }

          scope.loading = true;

          // Refresh bindings
          scope.$apply();

          // Sizing utilities
          buttonCurrentWidth = elem[0].clientWidth;
          buttonCurrentHeight = elem[0].clientHeight;
          loaderWidth = buttonCurrentHeight / 5.0;

          // Fetch loader
          oLoader = angular.element(elem[0].querySelector('.loader'));

          // Set loader position
          oLoader.css('left', ((buttonCurrentWidth - loaderWidth)/2.0) + "px");
        }
      });
    }
  }

})(angular);
/**
 * @ngdoc function
 * @name weed.directive: weIcon
 * @description
 * # Directive to import icons
 * Directive of the app
 */

(function(angular){
  'use strict';

  angular.module('weed.calendar', ['weed.core'])
    .directive('weCalendar', calendarDirective);


  function calendarDirective() {
    return {
      restrict: 'A',
      scope: {
        selectedobject: '=',
        selected: '=',
        languagec: '=',
        numberposition: '=',
        activities: '=',
        limit: '=',
        functionopenselect:'=',
        selectedobjectinside: '=',
        actualmonth: '=',
        updatefunction: '=',
        doselectedclick: '=',
        popoverIsOpen: '=',
        secondcallfunction: '='
      },
      templateUrl: 'components/calendar/calendar.html',
      link: function(scope, elem, attrs) {
        moment.locale(scope.languagec);
        scope.weekArray = moment.weekdays();
        scope.selected = moment().locale(scope.languagec);
        scope.month = scope.selected.clone();
        scope.actualmonth = moment();
        var start = scope.selected.clone();
        start.date(1);
        _removeTime(start.day(0));
		    scope.findToday = false;

        //scope.openPop = true;

        _buildMonth(scope, start, scope.month, scope.actualmonth);

        scope.closePopoverNow = function(day) {
          day.openPop = false;
        };

        scope.select = function(day) {
          scope.selected = day.date;
          scope.selectedobject = day;

          if(scope.comesfromtodaywatch)
          {
            scope.comesfromtodaywatch = false;
          }
          else {
            scope.doselectedclick(day);
          }
        };

        scope.manageClickMore = function(day) {
          scope.selectedobject = day;
          scope.comesfromtodaywatch = true;
          //console.log("pruebaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
        }

        scope.today = function() {
		    scope.findToday = true;
        scope.actualmonth = moment();
		    scope.selected = moment().locale(scope.languagec);
          scope.month = scope.selected.clone();
          var start = scope.selected.clone();
          start.date(1);
          _removeTime(start.day(0));

          _buildMonth(scope, start, scope.month, scope.actualmonth);

        };

        scope.next = function() {
          var next = scope.month.clone();
          scope.actualmonth = scope.actualmonth.add(1,'months');
          _removeTime(next.month(next.month()+1).date(1));
          scope.month.month(scope.month.month()+1);
          _buildMonth(scope, next, scope.month, scope.actualmonth);
        };

        scope.previous = function() {
            var previous = scope.month.clone();
            scope.actualmonth = scope.actualmonth.add(-1,'months');
            _removeTime(previous.month(previous.month()-1).date(1));
            scope.month.month(scope.month.month()-1);
            _buildMonth(scope, previous, scope.month, scope.actualmonth);
        };

        /*scope.doOnClickElement = function(elementInside){
          scope.functionopenselect(elementInside);
        };*/

        scope.updatefunction = function() {
          var dummy = scope.month.clone();
          _removeTime(dummy.month(dummy.month()).date(1));
          _buildMonth(scope, dummy, scope.month, scope.actualmonth);
        };
      }
    };

    function _removeTime(date) {
      return date.day(0).hour(0).minute(0).second(0).millisecond(0);
    }

    function _buildMonth(scope, start, month, actualmonth) {
      scope.monthActivities = scope.activities(actualmonth);

      scope.monthActivities.then(
        function(su){
          scope.weeks = [];
          var responsables = [];
          for( i = 0; i < su.length ; i++) {
            su[i].meeting.fileCount =0;
            //vm.time = datetime.format('hh:mm a');
            for(var j =0; j< su[i].meeting.meetingItems.length; j++) {
              su[i].meeting.fileCount += su[i].meeting.meetingItems[j].files.length;
              su[i].meeting.dateFormat = moment(su[i].meeting.date).format('dddd D [de] MMMM [del] YYYY');
              su[i].meeting.dateFormatInput = new Date(moment(su[i].meeting.date).format('M/D/YYYY'));
              su[i].meeting.timeFormatInput = moment(su[i].meeting.date).format('H:mm a');
              responsables.push(su[i].meeting.meetingItems[j].responsableId);
            }
          }
          scope.secondcallfunction(responsables);
          var done = false, date = start.clone(), monthIndex = date.month(), count = 0;
          while (!done) {
              scope.weeks.push({ days: _buildWeek(date.clone(), month, su) });
              date.add(1, "w");
              done = count++ > 2 && monthIndex !== date.month();
              monthIndex = date.month();
          }
    		  if(scope.findToday) {
    		    scope.findToday = false;
      			for(var i = 0; i < scope.weeks.length; i++) {
      			  for(var j = 0; j < scope.weeks[i].days.length; j++) {
      			    if(scope.weeks[i].days[j].isToday)
        				{
                  scope.comesfromtodaywatch = true;
        				  scope.select(scope.weeks[i].days[j]);
        				  break;
        				  i = scope.weeks.length;
        				}
      			  }
      			}
    		  }
        },
        function(err){
          $log.log("ERROR: ",error);
        }
      );
    }

    function _buildWeek(date, month, activities) {
      var days = [];
      for (var i = 0; i < 7; i++) {
          days.push({
              name: date.format("dd").substring(0, 1),
              number: date.date(),
              isCurrentMonth: date.month() === month.month(),
              isToday: date.isSame(new Date(), "day"),
              date: date,
              dateId: date.format("DD-MM-YYYY"),
              activities: [],
              openPop: false
          });
          for(var j = 0; j < activities.length; j++)
          {
            if(date.isSame(activities[j].meeting.date,'year') && date.isSame(activities[j].meeting.date,'month') && date.isSame(activities[j].meeting.date,'day')){
              activities[j].formatDate  = moment(activities[j].meeting.date).format("HH:mm");
              if(!activities[j].place)
              {
                activities[j].place = activities[j].meeting.place;
              }
              days[days.length-1].activities.push(activities[j]);
            }

          }
          date = date.clone();
          date.add(1, "d");
      }
      return days;
    }
  };

})(angular);

/**
 * @ngdoc function
 * @name weed.directive: weNavbar
 * @description
 * # navbarDirective
 * Directive of the app
 * Depends upon weIcon
 */

(function(angular){
  'use strict';

  angular.module('weed.forms', ['weed.core'])
    .directive('weInputWrapper', inputWrapperDirective);

  // No dependencies

  function inputWrapperDirective(){
    return {
      restrict: 'A',
      transclude: true,
      scope: {
        rightIcon: '@',
        leftIcon: '@',
        componentPosition: '@',
        size: '@',
        placeholder: '@'
      },
      replace: true,
      templateUrl: 'components/forms/inputWrapper.html',
      link: inputWrapperLink
    };
  }
    function inputWrapperLink(scope, elem) {
      var input = elem.find('input');
      input.on("focus", function(){
        scope.focused = true;
        scope.$apply();
      });

      input.on("blur", function(){
        scope.focused = false;
        scope.$apply();
      });

    }
})(angular);
(function(angular) {
  'use strict';

  angular.module('weed.common', ['weed.core'])
    .directive('weClose', weClose)
    .directive('weOpen', weOpen)
    .directive('weToggle', weToggle)
    .directive('weEscClose', weEscClose)
    .directive('weSwipeClose', weSwipeClose)
    .directive('weHardToggle', weHardToggle)
    .directive('weCloseAll', weCloseAll)
    .directive('weFillHeight', weFillHeight)
  ;

  // Dependency injection
  weClose.$inject = ['WeedApi'];
  weOpen.$inject = ['WeedApi'];
  weToggle.$inject = ['WeedApi'];
  weEscClose.$inject = ['WeedApi'];
  weSwipeClose.$inject = ['WeedApi'];
  weHardToggle.$inject = ['WeedApi'];
  weCloseAll.$inject = ['WeedApi'];
  weFillHeight.$inject = ['$window', '$document', '$timeout'];

  function weClose(weedApi) {
    var directive = {
      restrict: 'A',
      link: link
    };

    return directive;

    function link(scope, element, attrs) {
      var targetId = '';
      if (attrs.weClose) {
        targetId = attrs.weClose;
      } else {
        var parentElement = false;
        var tempElement = element.parent();
        //find parent modal
        while(parentElement === false) {
          if(tempElement[0].nodeName == 'BODY') {
            parentElement = '';
          }

          if(typeof tempElement.attr('we-closable') !== 'undefined' && tempElement.attr('we-closable') !== false) {
            parentElement = tempElement;
          }

          tempElement = tempElement.parent();
        }

        targetId = parentElement.attr('id');
      }

      element.on('click', function(e) {
        weedApi.publish(targetId, 'close');
        e.preventDefault();
      });
    }
  }

  function weOpen(weedApi) {
    var directive = {
      restrict: 'A',
      link: link
    };

    return directive;

    function link(scope, element, attrs) {
      element.on('click', function(e) {
        weedApi.publish(attrs.weOpen, 'open');
        e.preventDefault();
      });
    }
  }

  function weToggle(weedApi) {
    var directive = {
      restrict: 'A',
      link: link
    }

    return directive;

    function link(scope, element, attrs) {
      element.on('click', function(e) {
        weedApi.publish(attrs.weToggle, 'toggle');
        e.preventDefault();
      });
    }
  }

  function weEscClose(weedApi) {
    var directive = {
      restrict: 'A',
      link: link
    };

    return directive;

    function link(scope, element, attrs) {
      element.on('keyup', function(e) {
        if (e.keyCode === 27) {
          weedApi.closeActiveElements();
        }
        e.preventDefault();
      });
    }
  }

  function weSwipeClose(weedApi) {
    var directive = {
      restrict: 'A',
      link: link
    };
    return directive;

    function link($scope, element, attrs) {
      var swipeDirection;
      var hammerElem;
      if (typeof(Hammer)!=='undefined') {
        hammerElem = new Hammer(element[0]);
        // set the options for swipe (to make them a bit more forgiving in detection)
        hammerElem.get('swipe').set({
          direction: Hammer.DIRECTION_ALL,
          threshold: 5, // this is how far the swipe has to travel
          velocity: 0.5 // and this is how fast the swipe must travel
        });
      }
      // detect what direction the directive is pointing
      switch (attrs.weSwipeClose) {
        case 'right':
          swipeDirection = 'swiperight';
          break;
        case 'left':
          swipeDirection = 'swipeleft';
          break;
        case 'up':
          swipeDirection = 'swipeup';
          break;
        case 'down':
          swipeDirection = 'swipedown';
          break;
        default:
          swipeDirection = 'swipe';
      }
      if(typeof(hammerElem) !== 'undefined'){
        hammerElem.on(swipeDirection, function() {
          weedApi.publish(attrs.id, 'close');
        });
      }
    }
  }

  function weHardToggle(weedApi) {
    var directive = {
      restrict: 'A',
      link: link
    };

    return directive;

    function link(scope, element, attrs) {
      element.on('click', function(e) {
        weedApi.closeActiveElements({exclude: attrs.weHardToggle});
        weedApi.publish(attrs.weHardToggle, 'toggle');
        e.preventDefault();
      });
    }
  }

  function weCloseAll(weedApi) {
    var directive = {
      restrict: 'A',
      link: link
    };

    return directive;

    function link(scope, element, attrs) {
      element.on('click', function(e) {
        var tar = e.target;
        var avoid = ['we-toggle', 'we-hard-toggle', 'we-open', 'we-close'].filter(function(e, i){
          return e in tar.attributes;
        });

        if(avoid.length > 0){ return; }

        var activeElements = document.querySelectorAll('.is-active[we-closable]');

        if(activeElements.length && !activeElements[0].hasAttribute('we-ignore-all-close')){
          if(getParentsUntil(tar, 'we-closable') === false){
            e.preventDefault();
            weedApi.publish(activeElements[0].id, 'close');
          }
        }
        return;
      });
    }
    /** special thanks to Chris Ferdinandi for this solution.
     * http://gomakethings.com/climbing-up-and-down-the-dom-tree-with-vanilla-javascript/
     */
    function getParentsUntil(elem, parent) {
      for ( ; elem && elem !== document.body; elem = elem.parentNode ) {
        if(elem.hasAttribute(parent)){
          if(elem.classList.contains('is-active')){ return elem; }
          break;
        }
      }
      return false;
    }
  }

  function weFillHeight($window, $document, $timeout){
    return {
      restrict: 'A',
      scope: {
        footerElementId: '@',
        additionalPadding: '@',
        debounceWait: '@'
      },
      link: function (scope, element, attrs) {
        if (scope.debounceWait === 0) {
          angular.element($window).on('resize', windowResize);
        } else {
          // allow debounce wait time to be passed in.
          // if not passed in, default to a reasonable 250ms
          angular.element($window).on('resize', debounce(onWindowResize, scope.debounceWait || 250));
        }

        onWindowResize();

        // returns a fn that will trigger 'time' amount after it stops getting called.
        function debounce(fn, time) {
          var timeout;
          // every time this returned fn is called, it clears and re-sets the timeout
          return function() {
            var context = this;
            // set args so we can access it inside of inner function
            var args = arguments;
            var later = function() {
              timeout = null;
              fn.apply(context, args);
            };
            $timeout.cancel(timeout);
            timeout = $timeout(later, time);
          };
        }

        function onWindowResize() {
          var footerElement = angular.element($document[0].getElementById(scope.footerElementId));
          var footerElementHeight;

          if (footerElement.length === 1) {
              footerElementHeight = footerElement[0].offsetHeight
                    + getTopMarginAndBorderHeight(footerElement)
                    + getBottomMarginAndBorderHeight(footerElement);
          } else {
              footerElementHeight = 0;
          }

          var elementOffsetTop = element[0].offsetTop;
          var elementBottomMarginAndBorderHeight = getBottomMarginAndBorderHeight(element);

          var additionalPadding = scope.additionalPadding || 0;

          var elementHeight = $window.innerHeight
                              - elementOffsetTop
                              - elementBottomMarginAndBorderHeight
                              - footerElementHeight
                              - additionalPadding;
          element.css('height', elementHeight + 'px');
        }

        function getTopMarginAndBorderHeight(element) {
          var footerTopMarginHeight = getCssNumeric(element, 'margin-top');
          var footerTopBorderHeight = getCssNumeric(element, 'border-top-width');
          return footerTopMarginHeight + footerTopBorderHeight;
        }

        function getBottomMarginAndBorderHeight(element) {
          var footerBottomMarginHeight = getCssNumeric(element, 'margin-bottom');
          var footerBottomBorderHeight = getCssNumeric(element, 'border-bottom-width');
          return footerBottomMarginHeight + footerBottomBorderHeight;
        }

        function getCssNumeric(element, propertyName) {
          return parseInt(element.css(propertyName), 10) || 0;
        }
      }
    };
  }
})(angular);
/**
 * @ngdoc function
 * @name weed.directive: weIcon
 * @description
 * # Directive to import icons
 * Directive of the app
 */

(function(angular){
  'use strict';

  angular.module('weed.icon', ['weed.core'])
    .directive('weIcon', iconDirective);

  // No dependencies

  function iconDirective() {
    return {
      restrict: 'E',
      scope: {
        icon: '@'
      },
      replace: true,
      templateUrl: 'components/icons/icon.html',
      link: function(scope, elem, attrs) {}
    };
  };

})(angular);
/**
 * @ngdoc function
 * @name weed.directive: weIcon
 * @description
 * # Directive to import icons
 * Directive of the app
 */

(function(angular){
  'use strict';

  angular.module('weed.knob', ['weed.knob'])
    .directive('weKnob', iconDirective);

  // No dependencies

  function iconDirective() {
    return {
      restrict: 'A',
      replace: true,
      templateUrl: 'components/knob/knob.html',
      scope: {
        boolValue: '=',
        size: '@'
      },
      controller: knobController,
      controllerAs: 'ctrl',
      bindToController: true
    };

    function knobController(){
      var vm = this;

      vm.toggleBoolValue = function(){
        vm.boolValue = !vm.boolValue;
      }
    }
  };

})(angular);
/**
 * @ngdoc function
 * @name weed.directive: weListItem
 * @description
 * # navbarDirective
 * Directive of the app
 * TODO: to-load, button-groups
 */

(function(angular){
  'use strict';

  angular.module('weed.list', ['weed.core'])
      .directive('weListItem', listItemDirective);

  function listItemDirective() {
    return {
      restrict: 'A',
      transclude: true,
      replace: true,
      scope: {
        color: '@',
        url: '@'
      },
      templateUrl: 'components/list/list-item.html',
      require: '^weList',
      link: function(scope, elem, attr, listCtrl) {
        scope.active = false;
        listCtrl.addItem(scope);
        elem.on('click', function() {
          listCtrl.select(scope);
        });
      }
    };
  }

})(angular);
/**
 * @ngdoc function
 * @name weed.directive: weNavbar
 * @description
 * # navbarDirective
 * Directive of the app
 * TODO: to-load, button-groups
 */

(function(angular){
  'use strict';

  angular.module('weed.list')
      .directive('weList', listDirective);

  // No dependency injections

  function listDirective(){
    return {
      restrict: 'A',
      transclude: true,
      replace: true,
      scope: {
        clickable: '@',
        selectable: '@',
        componentPosition: '@',
        color: '@',
        size: '@'
      },
      templateUrl: 'components/list/list.html',
      bindToController: true,
      controllerAs: 'list',
      controller: listController
    };
  }

  listController.$inject = ['$scope'];

  function listController($scope) {
    var vm = this;

    vm.items = [];

    vm.addItem = function addItem(item) {
      vm.items.push(item);
    };

    vm.select = function(selectedItem) {
      if (typeof vm.selectable !== 'undefined'){
        angular.forEach(vm.items, function(item){
          if(item.active && item !== selectedItem){
            item.active = false;
          }
        });
        selectedItem.active = true;
        $scope.$apply();
      }
    };
  }

})(angular);
/**
 * @ngdoc function
 * @name weed.directive: weNavbar
 * @description
 * # navbarDirective
 * Directive of the app
 * Depends upon weInputWrapper
 */

(function(angular){
  'use strict';

  angular.module('weed.navbar', ['weed.core'])
    .directive('weNavbar', navbarDirective)
    .directive('weNavbarElement', navbarElementDirective);

  // No dependencies

  function navbarDirective(){
    return {
      restrict: 'E',
      link: function(){
        var body = angular.element(document.querySelector('body'));
        body.addClass('with-navbar');
      },
      templateUrl: 'components/navbar/navbar.html',
      transclude: true,
      replace: true
    }
  }

  function navbarElementDirective(){
    return {
      restrict: 'A',
      transclude: true,
      replace: true,
      scope: {
        position: '@',
        type: '@',
        icon: '@',
        logotype: '@',
        isotype: '@',
        placeholder: '@',
        userPicture: '@',
        userRole: '@',
        counter: '@'
      },
      link: function(scope, elem, attrs, controllers, $transclude){
        // Check if there is text
        $transclude(function(clone){
          scope.hasText = clone.length > 0;
        });
      },
      templateUrl: function(elem, attrs) {
        var template = '';
        switch (attrs.type) {
          case 'link':
            template = 'navbarElementLink.html';
            break;
          case 'logo':
            template = 'navbarElementLogo.html';
            break;
          case 'separator':
            template = 'navbarElementSeparator.html'
            break;
          case 'user':
            template = 'navbarElementUser.html'
            break;
          default:
            template = 'navbarElement.html'
        }
        return 'components/navbar/' + template;
      }
    };
  }
})(angular);
(function(angular){
  'use strict';

  // TODO
  angular
    .module('weed.corner-notifications', ['weed.core'])
    .directive('weCornerNotification', cornerNotificationDirective);

  cornerNotificationDirective.$inject = ['WeedApi', '$timeout'];

  function cornerNotificationDirective(WeedApi, $timeout){

    // Injection
    cornerNotificationsController.$inject = ['$scope'];

    return {
      restrict: 'A',
      replace: true,
      templateUrl: 'components/notifications/cornerNotifications.html',
      scope: {
        color: '@',
        icon: '@',
        text: '@',
        timeout: '@'
      },
      controller: cornerNotificationsController,
      controllerAs: 'ctrl',
      link: function($scope, elem, attrs, controllers, $transclude){
        $scope.open = false;
        $scope.timeout = $scope.timeout ? parseFloat($scope.timeout) : 1000;

        WeedApi.subscribe(attrs.id, function(id, message){
          switch(message){
            case 'show':
            case 'open':
              $scope.open = true;

              // Close after a timeout
              $timeout(function(){
                $scope.open = false;
              }, $scope.timeout);
              break;

            case 'close':
            case 'hide':
              $scope.open = false;
              break;

            case 'toggle':
              if($scope.open){
                $scope.open = false;
              }
              else{
                $scope.open = true;

                // Close after a timeout
                $timeout(function(){
                  $scope.open = false;
                }, $scope.timeout);
              }
              break;

            default:
              controllers.text = message.text;
              controllers.color = message.color;
              controllers.icon = message.icon;
              $scope.timeout = message.timeout;
              $scope.open = true;

              // Close after a timeout
              $timeout(function(){
                $scope.open = false;
              }, $scope.timeout);
          }
        });
      }
    };

    function cornerNotificationsController($scope){
      var vm = this;
      vm.icon = $scope.icon;
      vm.color = $scope.color;
      vm.text = $scope.text;
    }
  }


})(angular);
(function() {
  'use strict';

  angular.module('weed.popup', ['weed.core'])
    .directive('wePopup', popupDirective);

  // Weed api injection
  popupDirective.$inject = ['WeedApi'];

  function popupDirective(weedApi) {

    var body = angular.element(document.querySelector('body'));

    var directive = {
      restrict: 'A',
      transclude: true,
      scope: {
        avoidCloseOutside: '@',
        afterclose: '='
      },
      replace: true,
      link: popupLink,
      templateUrl: 'components/popup/popup.html',
      controllerAs: 'popup',
      controller: popupController
    };

    popupController.$inject = ['$scope'];

    return directive;


    function popupController($scope){
      var vm = this;

      vm.active = false;

      vm.open = function(){
        vm.active = true;
        body.addClass('with-open-popup');
        $scope.$apply();
      }

      vm.close = function(){
        vm.active = false;
        body.removeClass('with-open-popup');
        if(typeof $scope.afterclose !== 'undefined'){
          $scope.afterclose();
        }
        $scope.$apply();
      }
    }

    // TODO: unmock this directive
    function popupLink($scope, elem, attrs, controller) {
      weedApi.subscribe(attrs.id, function(id, message){
        switch(message){
          case 'show':
          case 'open':
            controller.open();
            break;
          case 'hide':
          case 'close':
            controller.close();
            break;
        }
      });
    }
  }

  function popupTitle(weedApi) {

    var directive = {
      restrict: 'A',
      transclude: true,
      scope: {},
      replace: true,
      link: popupLink,
      templateUrl: 'components/popup/popupTitle.html',
    };

    return directive;

    // TODO: unmock this directive
    function popupLink($scope, elem, attrs, controller) {
      weedApi.subscribe(attrs.id, function(id, message){
        switch(message){
          case 'show':
          case 'open':
            console.log("Open(#" + id + "): " + message);
        }
      });
    }
  }
})(angular);

/**
 * @ngdoc function
 * @name weed.directive: weNavbar
 * @description
 * # navbarDirective
 * Directive of the app
 * Depends upon weInput
 */

(function(angular){
  'use strict';

  angular.module('weed.sidebar', ['weed.core'])
    .directive('weSidebar', sidebarDirective);

  // Weed api injection
  sidebarDirective.$inject = ['WeedApi'];

  function sidebarDirective(weedApi) {
    var body = angular.element(document.querySelector('body'));
    body.addClass('with-sidebar');

    function openSidebar($scope){
      body.addClass('with-open-sidebar');
      $scope.open = true;
    }

    function closeSidebar($scope){
      body.removeClass('with-open-sidebar');
      $scope.open = false;
    }

    return {
      restrict: 'A',
      transclude: true,
      replace: true,
      templateUrl: 'components/sidebar/sidebar.html',
      link: function($scope, elem, attrs, controllers, $transclude){
        weedApi.subscribe(attrs.id, function(id, message){

          switch(message){
            case 'show':
            case 'open':
              openSidebar($scope);
              break;
            case 'close':
            case 'hide':
              closeSidebar($scope);
              break;
            case 'toggle':
              if($scope.open){
                closeSidebar($scope);
              }
              else{
                openSidebar($scope);
              }
          }
        });
      }
    };
  }
})(angular);

(function(angular){
  'use strict';

  angular.module('weed.sidebar')
    .directive('weSidebarLink', function() {
      return {
        restrict: 'A',
        transclude: true,
        replace: true,
        scope: {
          title: '@',
          icon: '@',
          position: '@'
        },
        templateUrl: 'components/sidebar/sidebarLink.html',
        link: function($scope, elem, attrs, controllers, $transclude){
          $transclude(function(clone){
            if(clone.length > 0){
              $scope.title = clone[0].textContent;
            }
          });
        }
      };
    });
})(angular);

(function(angular){
  'use strict';

  angular.module('weed.sidebar')
    .directive('weSidebarHeader', function() {
      return {
        restrict: 'A',
        transclude: true,
        scope: {
          isotype: '@',
          logotype: '@'
        },
        templateUrl: 'components/sidebar/sidebarHeader.html'
      };
    });
})(angular);
/**
 * @ngdoc function
 * @name weed.directive: weTab
 * @description
 * # navbarDirective
 * Directive of the app
 * TODO: to-load, button-groups
 */

(function(angular){
  'use strict';

  angular.module('weed.tabs', ['weed.core'])
    .directive('weTab', function() {
      return {
        restrict: 'A',
        transclude: true,
        replace: true,
        scope: {
          heading: '@',
          icon: '@'
        },
        templateUrl: 'components/tabs/tab.html',
        require: '^weTabset',
        link: function(scope, elem, attr, tabsetCtrl) {
          scope.active = false;
          tabsetCtrl.addTab(scope);
        }
      };
    });

})(angular);
/**
 * @ngdoc function
 * @name weed.directive: weNavbar
 * @description
 * # navbarDirective
 * Directive of the app
 * TODO: to-load, button-groups
 */

(function(angular){
  'use strict';

  angular.module('weed.tabs')
    .directive('weTabset', function() {
      return {
        restrict: 'A',
        transclude: true,
        replace: true,
        scope: {
          iconPosition: '@'
        },
        templateUrl: 'components/tabs/tabset.html',
        bindToController: true,
        controllerAs: 'tabset',
        controller: function() {
          var vm = this;

          vm.tabs = [];

          vm.addTab = function addTab(tab) {
            vm.tabs.push(tab);

            if(vm.tabs.length === 1) {
              tab.active = true;
            }
          };

          vm.select = function(selectedTab) {
            angular.forEach(vm.tabs, function(tab){
              if(tab.active && tab !== selectedTab){
                tab.active = false;
              }
            });

            selectedTab.active = true;
          };
        }
      };
    });

})(angular);
/**
 * @ngdoc function
 * @name weed.directive: weNavbar
 * @description
 * # navbarDirective
 * Directive of the app
 * TODO: to-load, button-groups
 */

(function(angular){
  'use strict';

  angular.module('weed.toload', ['weed.core'])
    .directive('weToload', toloadDirective);

  // Dependencies
  toloadDirective.$inject = ['$parse'];

  function toloadDirective($parse){
    return {
      restrict: 'A',
      scope: {
        method: '&weToload',
        loadingClass: '@'
      },
      link: toloadLink
    };

    function toloadLink(scope, elem, attrs, controllers, $transclude) {

      var clickHandler;

      elem.on('click', function(e){

        // If yet not loading
        if(!scope.loading){

          // Mark as loading
          scope.loading = true;

          // Add loading class
          elem.addClass(scope.loadingClass);

          // Try to get a defer from toload attribute
          var promise = scope.$apply(scope.method);

          // If it's a promise
          if(promise && promise.then){
            promise.then(
              function(data){

                // On success, set loading false
                scope.loading = false;

                // Remove loading class
                elem.removeClass(scope.loadingClass);
              },
              function(data){

                // On failure, set loading false
                scope.loading = false;

                // Remove loading class
                elem.removeClass(scope.loadingClass);
              }
            );
          }
        }
      });
    }
  }

})(angular);