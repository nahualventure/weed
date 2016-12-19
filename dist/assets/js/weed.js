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
 */angular.module("ui.bootstrap",["ui.bootstrap.tpls","ui.bootstrap.timepicker","ui.bootstrap.typeahead","ui.bootstrap.debounce","ui.bootstrap.position","ui.bootstrap.popover","ui.bootstrap.tooltip","ui.bootstrap.stackedMap"]),angular.module("ui.bootstrap.tpls",["uib/template/timepicker/timepicker.html","uib/template/typeahead/typeahead-match.html","uib/template/typeahead/typeahead-popup.html","uib/template/popover/popover-html.html","uib/template/popover/popover-template.html","uib/template/popover/popover.html","uib/template/tooltip/tooltip-html-popup.html","uib/template/tooltip/tooltip-popup.html","uib/template/tooltip/tooltip-template-popup.html"]),angular.module("ui.bootstrap.timepicker",[]).constant("uibTimepickerConfig",{hourStep:1,minuteStep:1,secondStep:1,showMeridian:!0,showSeconds:!1,meridians:null,readonlyInput:!1,mousewheel:!0,arrowkeys:!0,showSpinners:!0,templateUrl:"uib/template/timepicker/timepicker.html"}).controller("UibTimepickerController",["$scope","$element","$attrs","$parse","$log","$locale","uibTimepickerConfig",function(e,t,o,n,i,a,r){function p(){var t=+e.hours,o=e.showMeridian?t>0&&13>t:t>=0&&24>t;return o&&""!==e.hours?(e.showMeridian&&(12===t&&(t=0),e.meridian===y[1]&&(t+=12)),t):void 0}function l(){var t=+e.minutes,o=t>=0&&60>t;return o&&""!==e.minutes?t:void 0}function u(){var t=+e.seconds;return t>=0&&60>t?t:void 0}function s(e,t){return null===e?"":angular.isDefined(e)&&e.toString().length<2&&!t?"0"+e:e.toString()}function c(e){d(),w.$setViewValue(new Date(b)),h(e)}function d(){w.$setValidity("time",!0),e.invalidHours=!1,e.invalidMinutes=!1,e.invalidSeconds=!1}function h(t){if(w.$modelValue){var o=b.getHours(),n=b.getMinutes(),i=b.getSeconds();e.showMeridian&&(o=0===o||12===o?12:o%12),e.hours="h"===t?o:s(o,!S),"m"!==t&&(e.minutes=s(n)),e.meridian=b.getHours()<12?y[0]:y[1],"s"!==t&&(e.seconds=s(i)),e.meridian=b.getHours()<12?y[0]:y[1]}else e.hours=null,e.minutes=null,e.seconds=null,e.meridian=y[0]}function m(e){b=g(b,e),c()}function f(e,t){return g(e,60*t)}function g(e,t){var o=new Date(e.getTime()+1e3*t),n=new Date(e);return n.setHours(o.getHours(),o.getMinutes(),o.getSeconds()),n}function v(){return!(null!==e.hours&&""!==e.hours||null!==e.minutes&&""!==e.minutes||e.showSeconds&&(!e.showSeconds||null!==e.seconds&&""!==e.seconds))}var b=new Date,$=[],w={$setViewValue:angular.noop},y=angular.isDefined(o.meridians)?e.$parent.$eval(o.meridians):r.meridians||a.DATETIME_FORMATS.AMPMS,S=angular.isDefined(o.padHours)?e.$parent.$eval(o.padHours):!0;e.tabindex=angular.isDefined(o.tabindex)?o.tabindex:0,t.removeAttr("tabindex"),this.init=function(t,n){w=t,w.$render=this.render,w.$formatters.unshift(function(e){return e?new Date(e):null});var i=n.eq(0),a=n.eq(1),p=n.eq(2),l=angular.isDefined(o.mousewheel)?e.$parent.$eval(o.mousewheel):r.mousewheel;l&&this.setupMousewheelEvents(i,a,p);var u=angular.isDefined(o.arrowkeys)?e.$parent.$eval(o.arrowkeys):r.arrowkeys;u&&this.setupArrowkeyEvents(i,a,p),e.readonlyInput=angular.isDefined(o.readonlyInput)?e.$parent.$eval(o.readonlyInput):r.readonlyInput,this.setupInputEvents(i,a,p)};var x=r.hourStep;o.hourStep&&$.push(e.$parent.$watch(n(o.hourStep),function(e){x=+e}));var T=r.minuteStep;o.minuteStep&&$.push(e.$parent.$watch(n(o.minuteStep),function(e){T=+e}));var k;$.push(e.$parent.$watch(n(o.min),function(e){var t=new Date(e);k=isNaN(t)?void 0:t}));var M;$.push(e.$parent.$watch(n(o.max),function(e){var t=new Date(e);M=isNaN(t)?void 0:t}));var C=!1;o.ngDisabled&&$.push(e.$parent.$watch(n(o.ngDisabled),function(e){C=e})),e.noIncrementHours=function(){var e=f(b,60*x);return C||e>M||b>e&&k>e},e.noDecrementHours=function(){var e=f(b,60*-x);return C||k>e||e>b&&e>M},e.noIncrementMinutes=function(){var e=f(b,T);return C||e>M||b>e&&k>e},e.noDecrementMinutes=function(){var e=f(b,-T);return C||k>e||e>b&&e>M},e.noIncrementSeconds=function(){var e=g(b,D);return C||e>M||b>e&&k>e},e.noDecrementSeconds=function(){var e=g(b,-D);return C||k>e||e>b&&e>M},e.noToggleMeridian=function(){return b.getHours()<12?C||f(b,720)>M:C||f(b,-720)<k};var D=r.secondStep;o.secondStep&&$.push(e.$parent.$watch(n(o.secondStep),function(e){D=+e})),e.showSeconds=r.showSeconds,o.showSeconds&&$.push(e.$parent.$watch(n(o.showSeconds),function(t){e.showSeconds=!!t})),e.showMeridian=r.showMeridian,o.showMeridian&&$.push(e.$parent.$watch(n(o.showMeridian),function(t){if(e.showMeridian=!!t,w.$error.time){var o=p(),n=l();angular.isDefined(o)&&angular.isDefined(n)&&(b.setHours(o),c())}else h()})),this.setupMousewheelEvents=function(t,o,n){var i=function(e){e.originalEvent&&(e=e.originalEvent);var t=e.wheelDelta?e.wheelDelta:-e.deltaY;return e.detail||t>0};t.bind("mousewheel wheel",function(t){C||e.$apply(i(t)?e.incrementHours():e.decrementHours()),t.preventDefault()}),o.bind("mousewheel wheel",function(t){C||e.$apply(i(t)?e.incrementMinutes():e.decrementMinutes()),t.preventDefault()}),n.bind("mousewheel wheel",function(t){C||e.$apply(i(t)?e.incrementSeconds():e.decrementSeconds()),t.preventDefault()})},this.setupArrowkeyEvents=function(t,o,n){t.bind("keydown",function(t){C||(38===t.which?(t.preventDefault(),e.incrementHours(),e.$apply()):40===t.which&&(t.preventDefault(),e.decrementHours(),e.$apply()))}),o.bind("keydown",function(t){C||(38===t.which?(t.preventDefault(),e.incrementMinutes(),e.$apply()):40===t.which&&(t.preventDefault(),e.decrementMinutes(),e.$apply()))}),n.bind("keydown",function(t){C||(38===t.which?(t.preventDefault(),e.incrementSeconds(),e.$apply()):40===t.which&&(t.preventDefault(),e.decrementSeconds(),e.$apply()))})},this.setupInputEvents=function(t,o,n){if(e.readonlyInput)return e.updateHours=angular.noop,e.updateMinutes=angular.noop,void(e.updateSeconds=angular.noop);var i=function(t,o,n){w.$setViewValue(null),w.$setValidity("time",!1),angular.isDefined(t)&&(e.invalidHours=t),angular.isDefined(o)&&(e.invalidMinutes=o),angular.isDefined(n)&&(e.invalidSeconds=n)};e.updateHours=function(){var e=p(),t=l();w.$setDirty(),angular.isDefined(e)&&angular.isDefined(t)?(b.setHours(e),b.setMinutes(t),k>b||b>M?i(!0):c("h")):i(!0)},t.bind("blur",function(){w.$setTouched(),v()?d():null===e.hours||""===e.hours?i(!0):!e.invalidHours&&e.hours<10&&e.$apply(function(){e.hours=s(e.hours,!S)})}),e.updateMinutes=function(){var e=l(),t=p();w.$setDirty(),angular.isDefined(e)&&angular.isDefined(t)?(b.setHours(t),b.setMinutes(e),k>b||b>M?i(void 0,!0):c("m")):i(void 0,!0)},o.bind("blur",function(){w.$setTouched(),v()?d():null===e.minutes?i(void 0,!0):!e.invalidMinutes&&e.minutes<10&&e.$apply(function(){e.minutes=s(e.minutes)})}),e.updateSeconds=function(){var e=u();w.$setDirty(),angular.isDefined(e)?(b.setSeconds(e),c("s")):i(void 0,void 0,!0)},n.bind("blur",function(){v()?d():!e.invalidSeconds&&e.seconds<10&&e.$apply(function(){e.seconds=s(e.seconds)})})},this.render=function(){var t=w.$viewValue;isNaN(t)?(w.$setValidity("time",!1),i.error('Timepicker directive: "ng-model" value must be a Date object, a number of milliseconds since 01.01.1970 or a string representing an RFC2822 or ISO 8601 date.')):(t&&(b=t),k>b||b>M?(w.$setValidity("time",!1),e.invalidHours=!0,e.invalidMinutes=!0):d(),h())},e.showSpinners=angular.isDefined(o.showSpinners)?e.$parent.$eval(o.showSpinners):r.showSpinners,e.incrementHours=function(){e.noIncrementHours()||m(60*x*60)},e.decrementHours=function(){e.noDecrementHours()||m(60*-x*60)},e.incrementMinutes=function(){e.noIncrementMinutes()||m(60*T)},e.decrementMinutes=function(){e.noDecrementMinutes()||m(60*-T)},e.incrementSeconds=function(){e.noIncrementSeconds()||m(D)},e.decrementSeconds=function(){e.noDecrementSeconds()||m(-D)},e.toggleMeridian=function(){var t=l(),o=p();e.noToggleMeridian()||(angular.isDefined(t)&&angular.isDefined(o)?m(720*(b.getHours()<12?60:-60)):e.meridian=e.meridian===y[0]?y[1]:y[0])},e.blur=function(){w.$setTouched()},e.$on("$destroy",function(){for(;$.length;)$.shift()()})}]).directive("uibTimepicker",["uibTimepickerConfig",function(e){return{require:["uibTimepicker","?^ngModel"],controller:"UibTimepickerController",controllerAs:"timepicker",replace:!0,scope:{},templateUrl:function(t,o){return o.templateUrl||e.templateUrl},link:function(e,t,o,n){var i=n[0],a=n[1];a&&i.init(a,t.find("input"))}}}]),angular.module("ui.bootstrap.typeahead",["ui.bootstrap.debounce","ui.bootstrap.position"]).factory("uibTypeaheadParser",["$parse",function(e){var t=/^\s*([\s\S]+?)(?:\s+as\s+([\s\S]+?))?\s+for\s+(?:([\$\w][\$\w\d]*))\s+in\s+([\s\S]+?)$/;return{parse:function(o){var n=o.match(t);if(!n)throw new Error('Expected typeahead specification in form of "_modelValue_ (as _label_)? for _item_ in _collection_" but got "'+o+'".');return{itemName:n[3],source:e(n[4]),viewMapper:e(n[2]||n[1]),modelMapper:e(n[1])}}}}]).controller("UibTypeaheadController",["$scope","$element","$attrs","$compile","$parse","$q","$timeout","$document","$window","$rootScope","$$debounce","$uibPosition","uibTypeaheadParser",function(e,t,o,n,i,a,r,p,l,u,s,c,d){function h(){W.moveInProgress||(W.moveInProgress=!0,W.$digest()),G()}function m(){W.position=O?c.offset(t):c.position(t),W.position.top+=t.prop("offsetHeight")}var f,g,v=[9,13,27,38,40],b=200,$=e.$eval(o.typeaheadMinLength);$||0===$||($=1),e.$watch(o.typeaheadMinLength,function(e){$=e||0===e?e:1});var w=e.$eval(o.typeaheadWaitMs)||0,y=e.$eval(o.typeaheadEditable)!==!1;e.$watch(o.typeaheadEditable,function(e){y=e!==!1});var S,x,T=i(o.typeaheadLoading).assign||angular.noop,k=o.typeaheadShouldSelect?i(o.typeaheadShouldSelect):function(e,t){var o=t.$event;return 13===o.which||9===o.which},M=i(o.typeaheadOnSelect),C=angular.isDefined(o.typeaheadSelectOnBlur)?e.$eval(o.typeaheadSelectOnBlur):!1,D=i(o.typeaheadNoResults).assign||angular.noop,I=o.typeaheadInputFormatter?i(o.typeaheadInputFormatter):void 0,O=o.typeaheadAppendToBody?e.$eval(o.typeaheadAppendToBody):!1,P=o.typeaheadAppendTo?e.$eval(o.typeaheadAppendTo):null,H=e.$eval(o.typeaheadFocusFirst)!==!1,E=o.typeaheadSelectOnExact?e.$eval(o.typeaheadSelectOnExact):!1,U=i(o.typeaheadIsOpen).assign||angular.noop,N=e.$eval(o.typeaheadShowHint)||!1,A=i(o.ngModel),R=i(o.ngModel+"($$$p)"),V=function(t,o){return angular.isFunction(A(e))&&g&&g.$options&&g.$options.getterSetter?R(t,{$$$p:o}):A.assign(t,o)},q=d.parse(o.uibTypeahead),W=e.$new(),B=e.$on("$destroy",function(){W.$destroy()});W.$on("$destroy",B);var F="typeahead-"+W.$id+"-"+Math.floor(1e4*Math.random());t.attr({"aria-autocomplete":"list","aria-expanded":!1,"aria-owns":F});var L,_;N&&(L=angular.element("<div></div>"),L.css("position","relative"),t.after(L),_=t.clone(),_.attr("placeholder",""),_.attr("tabindex","-1"),_.val(""),_.css({position:"absolute",top:"0px",left:"0px","border-color":"transparent","box-shadow":"none",opacity:1,background:"none 0% 0% / auto repeat scroll padding-box border-box rgb(255, 255, 255)",color:"#999"}),t.css({position:"relative","vertical-align":"top","background-color":"transparent"}),L.append(_),_.after(t));var Y=angular.element("<div uib-typeahead-popup></div>");Y.attr({id:F,matches:"matches",active:"activeIdx",select:"select(activeIdx, evt)","move-in-progress":"moveInProgress",query:"query",position:"position","assign-is-open":"assignIsOpen(isOpen)",debounce:"debounceUpdate"}),angular.isDefined(o.typeaheadTemplateUrl)&&Y.attr("template-url",o.typeaheadTemplateUrl),angular.isDefined(o.typeaheadPopupTemplateUrl)&&Y.attr("popup-template-url",o.typeaheadPopupTemplateUrl);var j=function(){N&&_.val("")},X=function(){W.matches=[],W.activeIdx=-1,t.attr("aria-expanded",!1),j()},z=function(e){return F+"-option-"+e};W.$watch("activeIdx",function(e){0>e?t.removeAttr("aria-activedescendant"):t.attr("aria-activedescendant",z(e))});var K=function(e,t){return W.matches.length>t&&e?e.toUpperCase()===W.matches[t].label.toUpperCase():!1},Z=function(o,n){var i={$viewValue:o};T(e,!0),D(e,!1),a.when(q.source(e,i)).then(function(a){var r=o===f.$viewValue;if(r&&S)if(a&&a.length>0){W.activeIdx=H?0:-1,D(e,!1),W.matches.length=0;for(var p=0;p<a.length;p++)i[q.itemName]=a[p],W.matches.push({id:z(p),label:q.viewMapper(W,i),model:a[p]});if(W.query=o,m(),t.attr("aria-expanded",!0),E&&1===W.matches.length&&K(o,0)&&(angular.isNumber(W.debounceUpdate)||angular.isObject(W.debounceUpdate)?s(function(){W.select(0,n)},angular.isNumber(W.debounceUpdate)?W.debounceUpdate:W.debounceUpdate["default"]):W.select(0,n)),N){var l=W.matches[0].label;_.val(angular.isString(o)&&o.length>0&&l.slice(0,o.length).toUpperCase()===o.toUpperCase()?o+l.slice(o.length):"")}}else X(),D(e,!0);r&&T(e,!1)},function(){X(),T(e,!1),D(e,!0)})};O&&(angular.element(l).on("resize",h),p.find("body").on("scroll",h));var G=s(function(){W.matches.length&&m(),W.moveInProgress=!1},b);W.moveInProgress=!1,W.query=void 0;var J,Q=function(e){J=r(function(){Z(e)},w)},et=function(){J&&r.cancel(J)};X(),W.assignIsOpen=function(t){U(e,t)},W.select=function(n,i){var a,p,l={};x=!0,l[q.itemName]=p=W.matches[n].model,a=q.modelMapper(e,l),V(e,a),f.$setValidity("editable",!0),f.$setValidity("parse",!0),M(e,{$item:p,$model:a,$label:q.viewMapper(e,l),$event:i}),X(),W.$eval(o.typeaheadFocusOnSelect)!==!1&&r(function(){t[0].focus()},0,!1)},t.on("keydown",function(t){if(0!==W.matches.length&&-1!==v.indexOf(t.which)){var o=k(e,{$event:t});if(-1===W.activeIdx&&o||9===t.which&&t.shiftKey)return X(),void W.$digest();t.preventDefault();var n;switch(t.which){case 27:t.stopPropagation(),X(),e.$digest();break;case 38:W.activeIdx=(W.activeIdx>0?W.activeIdx:W.matches.length)-1,W.$digest(),n=Y.find("li")[W.activeIdx],n.parentNode.scrollTop=n.offsetTop;break;case 40:W.activeIdx=(W.activeIdx+1)%W.matches.length,W.$digest(),n=Y.find("li")[W.activeIdx],n.parentNode.scrollTop=n.offsetTop;break;default:o&&W.$apply(function(){angular.isNumber(W.debounceUpdate)||angular.isObject(W.debounceUpdate)?s(function(){W.select(W.activeIdx,t)},angular.isNumber(W.debounceUpdate)?W.debounceUpdate:W.debounceUpdate["default"]):W.select(W.activeIdx,t)})}}}),t.bind("focus",function(e){S=!0,0!==$||f.$viewValue||r(function(){Z(f.$viewValue,e)},0)}),t.bind("blur",function(e){C&&W.matches.length&&-1!==W.activeIdx&&!x&&(x=!0,W.$apply(function(){angular.isObject(W.debounceUpdate)&&angular.isNumber(W.debounceUpdate.blur)?s(function(){W.select(W.activeIdx,e)},W.debounceUpdate.blur):W.select(W.activeIdx,e)})),!y&&f.$error.editable&&(f.$setViewValue(),f.$setValidity("editable",!0),f.$setValidity("parse",!0),t.val("")),S=!1,x=!1});var tt=function(o){t[0]!==o.target&&3!==o.which&&0!==W.matches.length&&(X(),u.$$phase||e.$digest())};p.on("click",tt),e.$on("$destroy",function(){p.off("click",tt),(O||P)&&ot.remove(),O&&(angular.element(l).off("resize",h),p.find("body").off("scroll",h)),Y.remove(),N&&L.remove()});var ot=n(Y)(W);O?p.find("body").append(ot):P?angular.element(P).eq(0).append(ot):t.after(ot),this.init=function(t,o){f=t,g=o,W.debounceUpdate=f.$options&&i(f.$options.debounce)(e),f.$parsers.unshift(function(t){return S=!0,0===$||t&&t.length>=$?w>0?(et(),Q(t)):Z(t):(T(e,!1),et(),X()),y?t:t?void f.$setValidity("editable",!1):(f.$setValidity("editable",!0),null)}),f.$formatters.push(function(t){var o,n,i={};return y||f.$setValidity("editable",!0),I?(i.$model=t,I(e,i)):(i[q.itemName]=t,o=q.viewMapper(e,i),i[q.itemName]=void 0,n=q.viewMapper(e,i),o!==n?o:t)})}}]).directive("uibTypeahead",function(){return{controller:"UibTypeaheadController",require:["ngModel","^?ngModelOptions","uibTypeahead"],link:function(e,t,o,n){n[2].init(n[0],n[1])}}}).directive("uibTypeaheadPopup",["$$debounce",function(e){return{scope:{matches:"=",query:"=",active:"=",position:"&",moveInProgress:"=",select:"&",assignIsOpen:"&",debounce:"&"},replace:!0,templateUrl:function(e,t){return t.popupTemplateUrl||"uib/template/typeahead/typeahead-popup.html"},link:function(t,o,n){t.templateUrl=n.templateUrl,t.isOpen=function(){var e=t.matches.length>0;return t.assignIsOpen({isOpen:e}),e},t.isActive=function(e){return t.active===e},t.selectActive=function(e){t.active=e},t.selectMatch=function(o,n){var i=t.debounce();angular.isNumber(i)||angular.isObject(i)?e(function(){t.select({activeIdx:o,evt:n})},angular.isNumber(i)?i:i["default"]):t.select({activeIdx:o,evt:n})}}}}]).directive("uibTypeaheadMatch",["$templateRequest","$compile","$parse",function(e,t,o){return{scope:{index:"=",match:"=",query:"="},link:function(n,i,a){var r=o(a.templateUrl)(n.$parent)||"uib/template/typeahead/typeahead-match.html";e(r).then(function(e){var o=angular.element(e.trim());i.replaceWith(o),t(o)(n)})}}}]).filter("uibTypeaheadHighlight",["$sce","$injector","$log",function(e,t,o){function n(e){return e.replace(/([.?*+^$[\]\\(){}|-])/g,"\\$1")}function i(e){return/<.*>/g.test(e)}var a;return a=t.has("$sanitize"),function(t,r){return!a&&i(t)&&o.warn("Unsafe use of typeahead please use ngSanitize"),t=r?(""+t).replace(new RegExp(n(r),"gi"),"<strong>$&</strong>"):t,a||(t=e.trustAsHtml(t)),t}}]),angular.module("ui.bootstrap.debounce",[]).factory("$$debounce",["$timeout",function(e){return function(t,o){var n;return function(){var i=this,a=Array.prototype.slice.call(arguments);n&&e.cancel(n),n=e(function(){t.apply(i,a)},o)}}}]),angular.module("ui.bootstrap.position",[]).factory("$uibPosition",["$document","$window",function(e,t){var o,n,i={normal:/(auto|scroll)/,hidden:/(auto|scroll|hidden)/},a={auto:/\s?auto?\s?/i,primary:/^(top|bottom|left|right)$/,secondary:/^(top|bottom|left|right|center)$/,vertical:/^(top|bottom)$/},r=/(HTML|BODY)/;return{getRawNode:function(e){return e.nodeName?e:e[0]||e},parseStyle:function(e){return e=parseFloat(e),isFinite(e)?e:0},offsetParent:function(o){function n(e){return"static"===(t.getComputedStyle(e).position||"static")}o=this.getRawNode(o);for(var i=o.offsetParent||e[0].documentElement;i&&i!==e[0].documentElement&&n(i);)i=i.offsetParent;return i||e[0].documentElement},scrollbarWidth:function(i){if(i){if(angular.isUndefined(n)){var a=e.find("body");a.addClass("uib-position-body-scrollbar-measure"),n=t.innerWidth-a[0].clientWidth,n=isFinite(n)?n:0,a.removeClass("uib-position-body-scrollbar-measure")}return n}if(angular.isUndefined(o)){var r=angular.element('<div class="uib-position-scrollbar-measure"></div>');e.find("body").append(r),o=r[0].offsetWidth-r[0].clientWidth,o=isFinite(o)?o:0,r.remove()}return o},scrollbarPadding:function(e){e=this.getRawNode(e);var o=t.getComputedStyle(e),n=this.parseStyle(o.paddingRight),i=this.parseStyle(o.paddingBottom),a=this.scrollParent(e,!1,!0),p=this.scrollbarWidth(a,r.test(a.tagName));return{scrollbarWidth:p,widthOverflow:a.scrollWidth>a.clientWidth,right:n+p,originalRight:n,heightOverflow:a.scrollHeight>a.clientHeight,bottom:i+p,originalBottom:i}},isScrollable:function(e,o){e=this.getRawNode(e);var n=o?i.hidden:i.normal,a=t.getComputedStyle(e);return n.test(a.overflow+a.overflowY+a.overflowX)},scrollParent:function(o,n,a){o=this.getRawNode(o);var r=n?i.hidden:i.normal,p=e[0].documentElement,l=t.getComputedStyle(o);if(a&&r.test(l.overflow+l.overflowY+l.overflowX))return o;var u="absolute"===l.position,s=o.parentElement||p;if(s===p||"fixed"===l.position)return p;for(;s.parentElement&&s!==p;){var c=t.getComputedStyle(s);if(u&&"static"!==c.position&&(u=!1),!u&&r.test(c.overflow+c.overflowY+c.overflowX))break;s=s.parentElement}return s},position:function(o,n){o=this.getRawNode(o);var i=this.offset(o);if(n){var a=t.getComputedStyle(o);i.top-=this.parseStyle(a.marginTop),i.left-=this.parseStyle(a.marginLeft)}var r=this.offsetParent(o),p={top:0,left:0};return r!==e[0].documentElement&&(p=this.offset(r),p.top+=r.clientTop-r.scrollTop,p.left+=r.clientLeft-r.scrollLeft),{width:Math.round(angular.isNumber(i.width)?i.width:o.offsetWidth),height:Math.round(angular.isNumber(i.height)?i.height:o.offsetHeight),top:Math.round(i.top-p.top),left:Math.round(i.left-p.left)}},offset:function(o){o=this.getRawNode(o);var n=o.getBoundingClientRect();return{width:Math.round(angular.isNumber(n.width)?n.width:o.offsetWidth),height:Math.round(angular.isNumber(n.height)?n.height:o.offsetHeight),top:Math.round(n.top+(t.pageYOffset||e[0].documentElement.scrollTop)),left:Math.round(n.left+(t.pageXOffset||e[0].documentElement.scrollLeft))}},viewportOffset:function(o,n,i){o=this.getRawNode(o),i=i!==!1?!0:!1;var a=o.getBoundingClientRect(),r={top:0,left:0,bottom:0,right:0},p=n?e[0].documentElement:this.scrollParent(o),l=p.getBoundingClientRect();if(r.top=l.top+p.clientTop,r.left=l.left+p.clientLeft,p===e[0].documentElement&&(r.top+=t.pageYOffset,r.left+=t.pageXOffset),r.bottom=r.top+p.clientHeight,r.right=r.left+p.clientWidth,i){var u=t.getComputedStyle(p);r.top+=this.parseStyle(u.paddingTop),r.bottom-=this.parseStyle(u.paddingBottom),r.left+=this.parseStyle(u.paddingLeft),r.right-=this.parseStyle(u.paddingRight)}return{top:Math.round(a.top-r.top),bottom:Math.round(r.bottom-a.bottom),left:Math.round(a.left-r.left),right:Math.round(r.right-a.right)}},parsePlacement:function(e){var t=a.auto.test(e);return t&&(e=e.replace(a.auto,"")),e=e.split("-"),e[0]=e[0]||"top",a.primary.test(e[0])||(e[0]="top"),e[1]=e[1]||"center",a.secondary.test(e[1])||(e[1]="center"),e[2]=t?!0:!1,e},positionElements:function(e,o,n,i){e=this.getRawNode(e),o=this.getRawNode(o);var r=angular.isDefined(o.offsetWidth)?o.offsetWidth:o.prop("offsetWidth"),p=angular.isDefined(o.offsetHeight)?o.offsetHeight:o.prop("offsetHeight");n=this.parsePlacement(n);var l=i?this.offset(e):this.position(e),u={top:0,left:0,placement:""};if(n[2]){var s=this.viewportOffset(e,i),c=t.getComputedStyle(o),d={width:r+Math.round(Math.abs(this.parseStyle(c.marginLeft)+this.parseStyle(c.marginRight))),height:p+Math.round(Math.abs(this.parseStyle(c.marginTop)+this.parseStyle(c.marginBottom)))};if(n[0]="top"===n[0]&&d.height>s.top&&d.height<=s.bottom?"bottom":"bottom"===n[0]&&d.height>s.bottom&&d.height<=s.top?"top":"left"===n[0]&&d.width>s.left&&d.width<=s.right?"right":"right"===n[0]&&d.width>s.right&&d.width<=s.left?"left":n[0],n[1]="top"===n[1]&&d.height-l.height>s.bottom&&d.height-l.height<=s.top?"bottom":"bottom"===n[1]&&d.height-l.height>s.top&&d.height-l.height<=s.bottom?"top":"left"===n[1]&&d.width-l.width>s.right&&d.width-l.width<=s.left?"right":"right"===n[1]&&d.width-l.width>s.left&&d.width-l.width<=s.right?"left":n[1],"center"===n[1])if(a.vertical.test(n[0])){var h=l.width/2-r/2;s.left+h<0&&d.width-l.width<=s.right?n[1]="left":s.right+h<0&&d.width-l.width<=s.left&&(n[1]="right")}else{var m=l.height/2-d.height/2;s.top+m<0&&d.height-l.height<=s.bottom?n[1]="top":s.bottom+m<0&&d.height-l.height<=s.top&&(n[1]="bottom")}}switch(n[0]){case"top":u.top=l.top-p;break;case"bottom":u.top=l.top+l.height;break;case"left":u.left=l.left-r;break;case"right":u.left=l.left+l.width}switch(n[1]){case"top":u.top=l.top;break;case"bottom":u.top=l.top+l.height-p;break;case"left":u.left=l.left;break;case"right":u.left=l.left+l.width-r;break;case"center":a.vertical.test(n[0])?u.left=l.left+l.width/2-r/2:u.top=l.top+l.height/2-p/2}return u.top=Math.round(u.top),u.left=Math.round(u.left),u.placement="center"===n[1]?n[0]:n[0]+"-"+n[1],u},positionArrow:function(e,o){e=this.getRawNode(e);var n=e.querySelector(".tooltip-inner, .popover-inner");if(n){var i=angular.element(n).hasClass("tooltip-inner"),r=e.querySelector(i?".tooltip-arrow":".arrow");if(r){var p={top:"",bottom:"",left:"",right:""};if(o=this.parsePlacement(o),"center"===o[1])return void angular.element(r).css(p);var l="border-"+o[0]+"-width",u=t.getComputedStyle(r)[l],s="border-";s+=a.vertical.test(o[0])?o[0]+"-"+o[1]:o[1]+"-"+o[0],s+="-radius";var c=t.getComputedStyle(i?n:e)[s];switch(o[0]){case"top":p.bottom=i?"0":"-"+u;break;case"bottom":p.top=i?"0":"-"+u;break;case"left":p.right=i?"0":"-"+u;break;case"right":p.left=i?"0":"-"+u}p[o[1]]=c,angular.element(r).css(p)}}}}}]),angular.module("ui.bootstrap.popover",["ui.bootstrap.tooltip"]).directive("uibPopoverTemplatePopup",function(){return{replace:!0,scope:{uibTitle:"@",contentExp:"&",placement:"@",popupClass:"@",animation:"&",isOpen:"&",originScope:"&"},templateUrl:"uib/template/popover/popover-template.html"}}).directive("uibPopoverTemplate",["$uibTooltip",function(e){return e("uibPopoverTemplate","popover","click",{useContentExp:!0})}]).directive("uibPopoverHtmlPopup",function(){return{replace:!0,scope:{contentExp:"&",uibTitle:"@",placement:"@",popupClass:"@",animation:"&",isOpen:"&"},templateUrl:"uib/template/popover/popover-html.html"}}).directive("uibPopoverHtml",["$uibTooltip",function(e){return e("uibPopoverHtml","popover","click",{useContentExp:!0})}]).directive("uibPopoverPopup",function(){return{replace:!0,scope:{uibTitle:"@",content:"@",placement:"@",popupClass:"@",animation:"&",isOpen:"&"},templateUrl:"uib/template/popover/popover.html"}}).directive("uibPopover",["$uibTooltip",function(e){return e("uibPopover","popover","click")}]),angular.module("ui.bootstrap.tooltip",["ui.bootstrap.position","ui.bootstrap.stackedMap"]).provider("$uibTooltip",function(){function e(e){var t=/[A-Z]/g,o="-";return e.replace(t,function(e,t){return(t?o:"")+e.toLowerCase()})}var t={placement:"top",placementClassPrefix:"",animation:!0,popupDelay:0,popupCloseDelay:0,useContentExp:!1},o={mouseenter:"mouseleave",click:"click",outsideClick:"outsideClick",focus:"blur",none:""},n={};this.options=function(e){angular.extend(n,e)},this.setTriggers=function(e){angular.extend(o,e)},this.$get=["$window","$compile","$timeout","$document","$uibPosition","$interpolate","$rootScope","$parse","$$stackedMap",function(i,a,r,p,l,u,s,c,d){function h(e){if(27===e.which){var t=m.top();t&&(t.value.close(),m.removeTop(),t=null)}}var m=d.createNew();return p.on("keypress",h),s.$on("$destroy",function(){p.off("keypress",h)}),function(i,s,d,h){function f(e){var t=(e||h.trigger||d).split(" "),n=t.map(function(e){return o[e]||e});return{show:t,hide:n}}h=angular.extend({},t,n,h);var g=e(i),v=u.startSymbol(),b=u.endSymbol(),$="<div "+g+'-popup uib-title="'+v+"title"+b+'" '+(h.useContentExp?'content-exp="contentExp()" ':'content="'+v+"content"+b+'" ')+'placement="'+v+"placement"+b+'" popup-class="'+v+"popupClass"+b+'" animation="animation" is-open="isOpen" origin-scope="origScope" class="uib-position-measure"></div>';return{compile:function(){var e=a($);return function(t,o,n){function a(){V.isOpen?d():u()}function u(){(!R||t.$eval(n[s+"Enable"]))&&($(),S(),V.popupDelay?P||(P=r(g,V.popupDelay,!1)):g())}function d(){v(),V.popupCloseDelay?H||(H=r(b,V.popupCloseDelay,!1)):b()}function g(){return v(),$(),V.content?(w(),void V.$evalAsync(function(){V.isOpen=!0,x(!0),L()})):angular.noop}function v(){P&&(r.cancel(P),P=null),E&&(r.cancel(E),E=null)}function b(){V&&V.$evalAsync(function(){V&&(V.isOpen=!1,x(!1),V.animation?O||(O=r(y,150,!1)):y())})}function $(){H&&(r.cancel(H),H=null),O&&(r.cancel(O),O=null)}function w(){D||(I=V.$new(),D=e(I,function(e){N?p.find("body").append(e):o.after(e)}),T())}function y(){v(),$(),k(),D&&(D.remove(),D=null),I&&(I.$destroy(),I=null)}function S(){V.title=n[s+"Title"],V.content=B?B(t):n[i],V.popupClass=n[s+"Class"],V.placement=angular.isDefined(n[s+"Placement"])?n[s+"Placement"]:h.placement;var e=l.parsePlacement(V.placement);U=e[1]?e[0]+"-"+e[1]:e[0];var o=parseInt(n[s+"PopupDelay"],10),a=parseInt(n[s+"PopupCloseDelay"],10);V.popupDelay=isNaN(o)?h.popupDelay:o,V.popupCloseDelay=isNaN(a)?h.popupCloseDelay:a}function x(e){W&&angular.isFunction(W.assign)&&W.assign(t,e)}function T(){F.length=0,B?(F.push(t.$watch(B,function(e){V.content=e,!e&&V.isOpen&&b()})),F.push(I.$watch(function(){q||(q=!0,I.$$postDigest(function(){q=!1,V&&V.isOpen&&L()}))}))):F.push(n.$observe(i,function(e){V.content=e,!e&&V.isOpen?b():L()})),F.push(n.$observe(s+"Title",function(e){V.title=e,V.isOpen&&L()})),F.push(n.$observe(s+"Placement",function(e){V.placement=e?e:h.placement,V.isOpen&&L()}))}function k(){F.length&&(angular.forEach(F,function(e){e()}),F.length=0)}function M(e){V&&V.isOpen&&D&&(o[0].contains(e.target)||D[0].contains(e.target)||d())}function C(){var e=n[s+"Trigger"];_(),A=f(e),"none"!==A.show&&A.show.forEach(function(e,t){"outsideClick"===e?(o.on("click",a),p.on("click",M)):e===A.hide[t]?o.on(e,a):e&&(o.on(e,u),o.on(A.hide[t],d)),o.on("keypress",function(e){27===e.which&&d()})})}var D,I,O,P,H,E,U,N=angular.isDefined(h.appendToBody)?h.appendToBody:!1,A=f(void 0),R=angular.isDefined(n[s+"Enable"]),V=t.$new(!0),q=!1,W=angular.isDefined(n[s+"IsOpen"])?c(n[s+"IsOpen"]):!1,B=h.useContentExp?c(n[i]):!1,F=[],L=function(){D&&D.html()&&(E||(E=r(function(){var e=l.positionElements(o,D,V.placement,N);D.css({top:e.top+"px",left:e.left+"px"}),D.hasClass(e.placement.split("-")[0])||(D.removeClass(U.split("-")[0]),D.addClass(e.placement.split("-")[0])),D.hasClass(h.placementClassPrefix+e.placement)||(D.removeClass(h.placementClassPrefix+U),D.addClass(h.placementClassPrefix+e.placement)),D.hasClass("uib-position-measure")?(l.positionArrow(D,e.placement),D.removeClass("uib-position-measure")):U!==e.placement&&l.positionArrow(D,e.placement),U=e.placement,E=null},0,!1)))};V.origScope=t,V.isOpen=!1,m.add(V,{close:b}),V.contentExp=function(){return V.content},n.$observe("disabled",function(e){e&&v(),e&&V.isOpen&&b()}),W&&t.$watch(W,function(e){V&&!e===V.isOpen&&a()});var _=function(){A.show.forEach(function(e){"outsideClick"===e?o.off("click",a):(o.off(e,u),o.off(e,a))}),A.hide.forEach(function(e){"outsideClick"===e?p.off("click",M):o.off(e,d)})};C();var Y=t.$eval(n[s+"Animation"]);V.animation=angular.isDefined(Y)?!!Y:h.animation;var j,X=s+"AppendToBody";j=X in n&&void 0===n[X]?!0:t.$eval(n[X]),N=angular.isDefined(j)?j:N,t.$on("$destroy",function(){_(),y(),m.remove(V),V=null})}}}}}]}).directive("uibTooltipTemplateTransclude",["$animate","$sce","$compile","$templateRequest",function(e,t,o,n){return{link:function(i,a,r){var p,l,u,s=i.$eval(r.tooltipTemplateTranscludeScope),c=0,d=function(){l&&(l.remove(),l=null),p&&(p.$destroy(),p=null),u&&(e.leave(u).then(function(){l=null}),l=u,u=null)};i.$watch(t.parseAsResourceUrl(r.uibTooltipTemplateTransclude),function(t){var r=++c;t?(n(t,!0).then(function(n){if(r===c){var i=s.$new(),l=n,h=o(l)(i,function(t){d(),e.enter(t,a)});p=i,u=h,p.$emit("$includeContentLoaded",t)}},function(){r===c&&(d(),i.$emit("$includeContentError",t))}),i.$emit("$includeContentRequested",t)):d()}),i.$on("$destroy",d)}}}]).directive("uibTooltipClasses",["$uibPosition",function(e){return{restrict:"A",link:function(t,o,n){if(t.placement){var i=e.parsePlacement(t.placement);o.addClass(i[0])}t.popupClass&&o.addClass(t.popupClass),t.animation()&&o.addClass(n.tooltipAnimationClass)}}}]).directive("uibTooltipPopup",function(){return{replace:!0,scope:{content:"@",placement:"@",popupClass:"@",animation:"&",isOpen:"&"},templateUrl:"uib/template/tooltip/tooltip-popup.html"}}).directive("uibTooltip",["$uibTooltip",function(e){return e("uibTooltip","tooltip","mouseenter")}]).directive("uibTooltipTemplatePopup",function(){return{replace:!0,scope:{contentExp:"&",placement:"@",popupClass:"@",animation:"&",isOpen:"&",originScope:"&"},templateUrl:"uib/template/tooltip/tooltip-template-popup.html"}}).directive("uibTooltipTemplate",["$uibTooltip",function(e){return e("uibTooltipTemplate","tooltip","mouseenter",{useContentExp:!0})}]).directive("uibTooltipHtmlPopup",function(){return{replace:!0,scope:{contentExp:"&",placement:"@",popupClass:"@",animation:"&",isOpen:"&"},templateUrl:"uib/template/tooltip/tooltip-html-popup.html"}}).directive("uibTooltipHtml",["$uibTooltip",function(e){return e("uibTooltipHtml","tooltip","mouseenter",{useContentExp:!0})}]),angular.module("ui.bootstrap.stackedMap",[]).factory("$$stackedMap",function(){return{createNew:function(){var e=[];return{add:function(t,o){e.push({key:t,value:o})},get:function(t){for(var o=0;o<e.length;o++)if(t===e[o].key)return e[o]},keys:function(){for(var t=[],o=0;o<e.length;o++)t.push(e[o].key);return t},top:function(){return e[e.length-1]},remove:function(t){for(var o=-1,n=0;n<e.length;n++)if(t===e[n].key){o=n;break}return e.splice(o,1)[0]},removeTop:function(){return e.splice(e.length-1,1)[0]},length:function(){return e.length}}}}}),angular.module("uib/template/timepicker/timepicker.html",[]).run(["$templateCache",function(e){e.put("uib/template/timepicker/timepicker.html",'<table class="uib-timepicker">\n  <tbody>\n    <tr class="text-center" ng-show="::showSpinners">\n      <td class="uib-increment hours"><a ng-click="incrementHours()" ng-class="{disabled: noIncrementHours()}" class="btn btn-link" ng-disabled="noIncrementHours()" tabindex="{{::tabindex}}"><span class="glyphicon glyphicon-chevron-up"></span></a></td>\n      <td>&nbsp;</td>\n      <td class="uib-increment minutes"><a ng-click="incrementMinutes()" ng-class="{disabled: noIncrementMinutes()}" class="btn btn-link" ng-disabled="noIncrementMinutes()" tabindex="{{::tabindex}}"><span class="glyphicon glyphicon-chevron-up"></span></a></td>\n      <td ng-show="showSeconds">&nbsp;</td>\n      <td ng-show="showSeconds" class="uib-increment seconds"><a ng-click="incrementSeconds()" ng-class="{disabled: noIncrementSeconds()}" class="btn btn-link" ng-disabled="noIncrementSeconds()" tabindex="{{::tabindex}}"><span class="glyphicon glyphicon-chevron-up"></span></a></td>\n      <td ng-show="showMeridian"></td>\n    </tr>\n    <tr>\n      <td class="form-group uib-time hours" ng-class="{\'has-error\': invalidHours}">\n        <input type="text" placeholder="HH" ng-model="hours" ng-change="updateHours()" class="form-control text-center" ng-readonly="::readonlyInput" maxlength="2" tabindex="{{::tabindex}}" ng-disabled="noIncrementHours()" ng-blur="blur()">\n      </td>\n      <td class="uib-separator">:</td>\n      <td class="form-group uib-time minutes" ng-class="{\'has-error\': invalidMinutes}">\n        <input type="text" placeholder="MM" ng-model="minutes" ng-change="updateMinutes()" class="form-control text-center" ng-readonly="::readonlyInput" maxlength="2" tabindex="{{::tabindex}}" ng-disabled="noIncrementMinutes()" ng-blur="blur()">\n      </td>\n      <td ng-show="showSeconds" class="uib-separator">:</td>\n      <td class="form-group uib-time seconds" ng-class="{\'has-error\': invalidSeconds}" ng-show="showSeconds">\n        <input type="text" placeholder="SS" ng-model="seconds" ng-change="updateSeconds()" class="form-control text-center" ng-readonly="readonlyInput" maxlength="2" tabindex="{{::tabindex}}" ng-disabled="noIncrementSeconds()" ng-blur="blur()">\n      </td>\n      <td ng-show="showMeridian" class="uib-time am-pm"><button type="button" ng-class="{disabled: noToggleMeridian()}" class="btn btn-default text-center" ng-click="toggleMeridian()" ng-disabled="noToggleMeridian()" tabindex="{{::tabindex}}">{{meridian}}</button></td>\n    </tr>\n    <tr class="text-center" ng-show="::showSpinners">\n      <td class="uib-decrement hours"><a ng-click="decrementHours()" ng-class="{disabled: noDecrementHours()}" class="btn btn-link" ng-disabled="noDecrementHours()" tabindex="{{::tabindex}}"><span class="glyphicon glyphicon-chevron-down"></span></a></td>\n      <td>&nbsp;</td>\n      <td class="uib-decrement minutes"><a ng-click="decrementMinutes()" ng-class="{disabled: noDecrementMinutes()}" class="btn btn-link" ng-disabled="noDecrementMinutes()" tabindex="{{::tabindex}}"><span class="glyphicon glyphicon-chevron-down"></span></a></td>\n      <td ng-show="showSeconds">&nbsp;</td>\n      <td ng-show="showSeconds" class="uib-decrement seconds"><a ng-click="decrementSeconds()" ng-class="{disabled: noDecrementSeconds()}" class="btn btn-link" ng-disabled="noDecrementSeconds()" tabindex="{{::tabindex}}"><span class="glyphicon glyphicon-chevron-down"></span></a></td>\n      <td ng-show="showMeridian"></td>\n    </tr>\n  </tbody>\n</table>\n')
}]),angular.module("uib/template/typeahead/typeahead-match.html",[]).run(["$templateCache",function(e){e.put("uib/template/typeahead/typeahead-match.html",'<a href\n   tabindex="-1"\n   ng-bind-html="match.label | uibTypeaheadHighlight:query"\n   ng-attr-title="{{match.label}}"></a>\n')}]),angular.module("uib/template/typeahead/typeahead-popup.html",[]).run(["$templateCache",function(e){e.put("uib/template/typeahead/typeahead-popup.html",'<ul class="dropdown-menu" ng-show="isOpen() && !moveInProgress" ng-style="{top: position().top+\'px\', left: position().left+\'px\'}" role="listbox" aria-hidden="{{!isOpen()}}">\n    <li ng-repeat="match in matches track by $index" ng-class="{active: isActive($index) }" ng-mouseenter="selectActive($index)" ng-click="selectMatch($index, $event)" role="option" id="{{::match.id}}">\n        <div uib-typeahead-match index="$index" match="match" query="query" template-url="templateUrl"></div>\n    </li>\n</ul>\n')}]),angular.module("uib/template/popover/popover-html.html",[]).run(["$templateCache",function(e){e.put("uib/template/popover/popover-html.html",'<div class="popover"\n  tooltip-animation-class="fade"\n  uib-tooltip-classes\n  ng-class="{ in: isOpen() }">\n  <div class="arrow"></div>\n\n  <div class="popover-inner">\n      <h3 class="popover-title" ng-bind="uibTitle" ng-if="uibTitle"></h3>\n      <div class="popover-content" ng-bind-html="contentExp()"></div>\n  </div>\n</div>\n')}]),angular.module("uib/template/popover/popover-template.html",[]).run(["$templateCache",function(e){e.put("uib/template/popover/popover-template.html",'<div class="popover"\n  tooltip-animation-class="fade"\n  uib-tooltip-classes\n  ng-class="{ in: isOpen() }">\n  <div class="arrow"></div>\n\n  <div class="popover-inner">\n      <h3 class="popover-title" ng-bind="uibTitle" ng-if="uibTitle"></h3>\n      <div class="popover-content"\n        uib-tooltip-template-transclude="contentExp()"\n        tooltip-template-transclude-scope="originScope()"></div>\n  </div>\n</div>\n')}]),angular.module("uib/template/popover/popover.html",[]).run(["$templateCache",function(e){e.put("uib/template/popover/popover.html",'<div class="popover"\n  tooltip-animation-class="fade"\n  uib-tooltip-classes\n  ng-class="{ in: isOpen() }">\n  <div class="arrow"></div>\n\n  <div class="popover-inner">\n      <h3 class="popover-title" ng-bind="uibTitle" ng-if="uibTitle"></h3>\n      <div class="popover-content" ng-bind="content"></div>\n  </div>\n</div>\n')}]),angular.module("uib/template/tooltip/tooltip-html-popup.html",[]).run(["$templateCache",function(e){e.put("uib/template/tooltip/tooltip-html-popup.html",'<div class="tooltip"\n  tooltip-animation-class="fade"\n  uib-tooltip-classes\n  ng-class="{ in: isOpen() }">\n  <div class="tooltip-arrow"></div>\n  <div class="tooltip-inner" ng-bind-html="contentExp()"></div>\n</div>\n')}]),angular.module("uib/template/tooltip/tooltip-popup.html",[]).run(["$templateCache",function(e){e.put("uib/template/tooltip/tooltip-popup.html",'<div class="tooltip"\n  tooltip-animation-class="fade"\n  uib-tooltip-classes\n  ng-class="{ in: isOpen() }">\n  <div class="tooltip-arrow"></div>\n  <div class="tooltip-inner" ng-bind="content"></div>\n</div>\n')}]),angular.module("uib/template/tooltip/tooltip-template-popup.html",[]).run(["$templateCache",function(e){e.put("uib/template/tooltip/tooltip-template-popup.html",'<div class="tooltip"\n  tooltip-animation-class="fade"\n  uib-tooltip-classes\n  ng-class="{ in: isOpen() }">\n  <div class="tooltip-arrow"></div>\n  <div class="tooltip-inner"\n    uib-tooltip-template-transclude="contentExp()"\n    tooltip-template-transclude-scope="originScope()"></div>\n</div>\n')}]),angular.module("ui.bootstrap.timepicker").run(function(){!angular.$$csp().noInlineStyle&&!angular.$$uibTimepickerCss&&angular.element(document).find("head").prepend('<style type="text/css">.uib-time input{width:50px;}</style>'),angular.$$uibTimepickerCss=!0}),angular.module("ui.bootstrap.typeahead").run(function(){!angular.$$csp().noInlineStyle&&!angular.$$uibTypeaheadCss&&angular.element(document).find("head").prepend('<style type="text/css">[uib-typeahead-popup].dropdown-menu{display:block;}</style>'),angular.$$uibTypeaheadCss=!0}),angular.module("ui.bootstrap.position").run(function(){!angular.$$csp().noInlineStyle&&!angular.$$uibPositionCss&&angular.element(document).find("head").prepend('<style type="text/css">.uib-position-measure{display:block !important;visibility:hidden !important;position:absolute !important;top:-9999px !important;left:-9999px !important;}.uib-position-scrollbar-measure{position:absolute !important;top:-9999px !important;width:50px !important;height:50px !important;overflow:scroll !important;}.uib-position-body-scrollbar-measure{overflow:scroll !important;}</style>'),angular.$$uibPositionCss=!0}),angular.module("ui.bootstrap.tooltip").run(function(){!angular.$$csp().noInlineStyle&&!angular.$$uibTooltipCss&&angular.element(document).find("head").prepend('<style type="text/css">[uib-tooltip-popup].tooltip.top-left > .tooltip-arrow,[uib-tooltip-popup].tooltip.top-right > .tooltip-arrow,[uib-tooltip-popup].tooltip.bottom-left > .tooltip-arrow,[uib-tooltip-popup].tooltip.bottom-right > .tooltip-arrow,[uib-tooltip-popup].tooltip.left-top > .tooltip-arrow,[uib-tooltip-popup].tooltip.left-bottom > .tooltip-arrow,[uib-tooltip-popup].tooltip.right-top > .tooltip-arrow,[uib-tooltip-popup].tooltip.right-bottom > .tooltip-arrow,[uib-tooltip-html-popup].tooltip.top-left > .tooltip-arrow,[uib-tooltip-html-popup].tooltip.top-right > .tooltip-arrow,[uib-tooltip-html-popup].tooltip.bottom-left > .tooltip-arrow,[uib-tooltip-html-popup].tooltip.bottom-right > .tooltip-arrow,[uib-tooltip-html-popup].tooltip.left-top > .tooltip-arrow,[uib-tooltip-html-popup].tooltip.left-bottom > .tooltip-arrow,[uib-tooltip-html-popup].tooltip.right-top > .tooltip-arrow,[uib-tooltip-html-popup].tooltip.right-bottom > .tooltip-arrow,[uib-tooltip-template-popup].tooltip.top-left > .tooltip-arrow,[uib-tooltip-template-popup].tooltip.top-right > .tooltip-arrow,[uib-tooltip-template-popup].tooltip.bottom-left > .tooltip-arrow,[uib-tooltip-template-popup].tooltip.bottom-right > .tooltip-arrow,[uib-tooltip-template-popup].tooltip.left-top > .tooltip-arrow,[uib-tooltip-template-popup].tooltip.left-bottom > .tooltip-arrow,[uib-tooltip-template-popup].tooltip.right-top > .tooltip-arrow,[uib-tooltip-template-popup].tooltip.right-bottom > .tooltip-arrow,[uib-popover-popup].popover.top-left > .arrow,[uib-popover-popup].popover.top-right > .arrow,[uib-popover-popup].popover.bottom-left > .arrow,[uib-popover-popup].popover.bottom-right > .arrow,[uib-popover-popup].popover.left-top > .arrow,[uib-popover-popup].popover.left-bottom > .arrow,[uib-popover-popup].popover.right-top > .arrow,[uib-popover-popup].popover.right-bottom > .arrow,[uib-popover-html-popup].popover.top-left > .arrow,[uib-popover-html-popup].popover.top-right > .arrow,[uib-popover-html-popup].popover.bottom-left > .arrow,[uib-popover-html-popup].popover.bottom-right > .arrow,[uib-popover-html-popup].popover.left-top > .arrow,[uib-popover-html-popup].popover.left-bottom > .arrow,[uib-popover-html-popup].popover.right-top > .arrow,[uib-popover-html-popup].popover.right-bottom > .arrow,[uib-popover-template-popup].popover.top-left > .arrow,[uib-popover-template-popup].popover.top-right > .arrow,[uib-popover-template-popup].popover.bottom-left > .arrow,[uib-popover-template-popup].popover.bottom-right > .arrow,[uib-popover-template-popup].popover.left-top > .arrow,[uib-popover-template-popup].popover.left-bottom > .arrow,[uib-popover-template-popup].popover.right-top > .arrow,[uib-popover-template-popup].popover.right-bottom > .arrow{top:auto;bottom:auto;left:auto;right:auto;margin:0;}[uib-popover-popup].popover,[uib-popover-html-popup].popover,[uib-popover-template-popup].popover{display:block !important;}</style>'),angular.$$uibTooltipCss=!0});
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

(function(angular) {
  'use strict';

  angular.module('weed.common', ['weed.core'])
    .directive('weClose', weClose)
    .directive('weOpen', weOpen)
    .directive('weToggle', weToggle)
    .directive('weEscClose', weEscClose)
    .directive('weHardToggle', weHardToggle)
    .directive('weCloseAll', weCloseAll)
    .directive('weFillHeight', weFillHeight)
  ;

  // Dependency injection
  weClose.$inject = ['WeedApi'];
  weOpen.$inject = ['WeedApi'];
  weToggle.$inject = ['WeedApi'];
  weEscClose.$inject = ['WeedApi'];
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
    var sidebar = angular.element(document.getElementsByClassName('className'));
    body.addClass('with-sidebar');

    function openSidebar($scope){
      body.addClass('with-open-sidebar');
      sidebar.removeClass('text-below');
      $scope.open = true;
    }

    function closeSidebar($scope){
      body.removeClass('with-open-sidebar');
      sidebar.addClass('text-below');
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