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