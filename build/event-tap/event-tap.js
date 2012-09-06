YUI.add('event-tap', function (Y, NAME) {

/**
 * The tap module provides a gesture events, "tap", which normalizes user interactions
 * across touch and mouse or pointer based input devices.  This can be used by application developers
 * to build input device agnostic components which behave the same in response to either touch or mouse based
 * interaction.
 *
 * 'tap' is like a touchscreen 'click', only it requires much less finger-down time since it listens to touch events,
 * but reverts to mouse events if touch is not supported. 
 * @module event
 * @submodule event-tap
 * @author matuzak and tilo mitra
 * @since 3.7.0 
 * 
*/
var doc = Y.config.doc,
    SUPPORTS_TOUCHES = !!(doc && doc.createTouch),
    EVT_START = SUPPORTS_TOUCHES ? 'touchstart' : 'mousedown',
    EVT_MOVE = SUPPORTS_TOUCHES ? 'touchmove' : 'mousemove',
    EVT_END = SUPPORTS_TOUCHES ? 'touchend' : 'mouseup',
    EVT_CANCEL = SUPPORTS_TOUCHES ? 'touchcancel' : 'mousecancel',
    EVT_TAP = 'tap',

    HANDLES = {
        START: 'Y_TAP_ON_START_HANDLE',
        MOVE: 'Y_TAP_ON_MOVE_HANDLE',
        END: 'Y_TAP_ON_END_HANDLE',
        CANCEL: 'Y_TAP_ON_CANCEL_HANDLE'
    };

function detachHelper(subscription, handles, subset, context) {

    handles = subset ? handles : [ handles.START, handles.MOVE, handles.END, handles.CANCEL ];

    Y.Array.each(handles, function (item, index, array) {
        var handle = subscription[item];
        if (handle) {
            handle.detach();
            subscription[item] = null;
        }
    });

}


/**
 * Sets up a "tap" event, that is fired on touch devices in response to a tap event (finger down, finder up).
 * This event can be used instead of listening for click events which have a 500ms delay on most touch devices.
 * This event can also be listened for using node.delegate().
 *
 * @event tap
 * @param type {string} "tap"
 * @param fn {function} The method the event invokes. It receives the event facade of the underlying DOM event.
 *
 * @return {EventHandle} the detach handle
*/
Y.Event.define(EVT_TAP, {

    on: function (node, subscription, notifier) {
        subscription[HANDLES.START] = node.on(EVT_START, this.touchStart, this, node, subscription, notifier);
    },

    detach: function (node, subscription, notifier) {
        detachHelper(subscription, HANDLES);
    },

    delegate: function (node, subscription, notifier, filter) {
        subscription[HANDLES.START] = node.delegate(EVT_START, function (e) {
            this.touchStart(e, node, subscription, notifier, true);
        }, filter, this);
    },

    detachDelegate: function (node, subscription, notifier) {
        detachHelper(subscription, HANDLES);
    },

    touchStart: function (event, node, subscription, notifier, delegate) {

        var context = {
                canceled: false
            };
        //move ways to quit early to the top.

        // no right clicks
        if (event.button && event.button === 3) {
            return;
        }

        // for now just support a 1 finger count (later enhance via config)
        if (event.touches && event.touches.length !== 1) {
            return;
        }

        context.node = delegate ? event.currentTarget : node;

        //There is a double check in here to support event simulation tests, in which
        //event.touches can be undefined when simulating 'touchstart' on touch devices.
        if (SUPPORTS_TOUCHES && event.touches) {
          context.startXY = [ event.touches[0].pageX, event.touches[0].pageY ];
        }
        else {
          context.startXY = [ event.pageX, event.pageY ];
        }

        //Possibly outdated issue: something is off with the move that it attaches it but never triggers the handler
        subscription[HANDLES.MOVE] = node.once(EVT_MOVE, this.touchMove, this, node, subscription, notifier, delegate, context);
        subscription[HANDLES.END] = node.once(EVT_END, this.touchEnd, this, node, subscription, notifier, delegate, context);
        subscription[HANDLES.CANCEL] = node.once(EVT_CANCEL, this.touchMove, this, node, subscription, notifier, delegate, context);
    },

    touchMove: function (event, node, subscription, notifier, delegate, context) {
        detachHelper(subscription, [ HANDLES.MOVE, HANDLES.END, HANDLES.CANCEL ], true, context);
        context.cancelled = true;

    },

    touchEnd: function (event, node, subscription, notifier, delegate, context) {
        var startXY = context.startXY,
            endXY,
            clientXY;

        //There is a double check in here to support event simulation tests, in which
        //event.touches can be undefined when simulating 'touchstart' on touch devices.
        if (SUPPORTS_TOUCHES && event.changedTouches) {
          endXY = [ event.changedTouches[0].pageX, event.changedTouches[0].pageY ];
          clientXY = [event.changedTouches[0].clientX, event.changedTouches[0].clientY];
        }
        else {
          endXY = [ event.pageX, event.pageY ];
          clientXY = [event.clientX, event.clientY];
        }

        detachHelper(subscription, [ HANDLES.MOVE, HANDLES.END, HANDLES.CANCEL ], true, context);

        // make sure mouse didn't move
        if (Math.abs(endXY[0] - startXY[0]) === 0 && Math.abs(endXY[1] - startXY[1]) === 0) {

            event.type = EVT_TAP;
            event.pageX = endXY[0];
            event.pageY = endXY[1];
            event.clientX = clientXY[0];
            event.clientY = clientXY[1];
            event.currentTarget = context.node;

            notifier.fire(event);
        }
    }
});


}, '@VERSION@', {"requires": ["node-base", "event-base", "event-touch", "event-synthetic"]});
