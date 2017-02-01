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
 */angular.module("ui.bootstrap",["ui.bootstrap.tpls","ui.bootstrap.timepicker","ui.bootstrap.typeahead","ui.bootstrap.debounce","ui.bootstrap.position","ui.bootstrap.tooltip","ui.bootstrap.stackedMap","ui.bootstrap.popover","ui.bootstrap.datepicker","ui.bootstrap.dateparser","ui.bootstrap.isClass"]),angular.module("ui.bootstrap.tpls",["uib/template/timepicker/timepicker.html","uib/template/typeahead/typeahead-match.html","uib/template/typeahead/typeahead-popup.html","uib/template/tooltip/tooltip-html-popup.html","uib/template/tooltip/tooltip-popup.html","uib/template/tooltip/tooltip-template-popup.html","uib/template/popover/popover-html.html","uib/template/popover/popover-template.html","uib/template/popover/popover.html","uib/template/datepicker/datepicker.html","uib/template/datepicker/day.html","uib/template/datepicker/month.html","uib/template/datepicker/year.html"]),angular.module("ui.bootstrap.timepicker",[]).constant("uibTimepickerConfig",{hourStep:1,minuteStep:1,secondStep:1,showMeridian:!0,showSeconds:!1,meridians:null,readonlyInput:!1,mousewheel:!0,arrowkeys:!0,showSpinners:!0,templateUrl:"uib/template/timepicker/timepicker.html"}).controller("UibTimepickerController",["$scope","$element","$attrs","$parse","$log","$locale","uibTimepickerConfig",function(e,t,n,i,o,a,r){function l(){var t=+e.hours,n=e.showMeridian?t>0&&13>t:t>=0&&24>t;return n&&""!==e.hours?(e.showMeridian&&(12===t&&(t=0),e.meridian===$[1]&&(t+=12)),t):void 0}function p(){var t=+e.minutes,n=t>=0&&60>t;return n&&""!==e.minutes?t:void 0}function s(){var t=+e.seconds;return t>=0&&60>t?t:void 0}function u(e,t){return null===e?"":angular.isDefined(e)&&e.toString().length<2&&!t?"0"+e:e.toString()}function c(e){d(),w.$setViewValue(new Date(v)),h(e)}function d(){w.$setValidity("time",!0),e.invalidHours=!1,e.invalidMinutes=!1,e.invalidSeconds=!1}function h(t){if(w.$modelValue){var n=v.getHours(),i=v.getMinutes(),o=v.getSeconds();e.showMeridian&&(n=0===n||12===n?12:n%12),e.hours="h"===t?n:u(n,!D),"m"!==t&&(e.minutes=u(i)),e.meridian=v.getHours()<12?$[0]:$[1],"s"!==t&&(e.seconds=u(o)),e.meridian=v.getHours()<12?$[0]:$[1]}else e.hours=null,e.minutes=null,e.seconds=null,e.meridian=$[0]}function m(e){v=g(v,e),c()}function f(e,t){return g(e,60*t)}function g(e,t){var n=new Date(e.getTime()+1e3*t),i=new Date(e);return i.setHours(n.getHours(),n.getMinutes(),n.getSeconds()),i}function b(){return!(null!==e.hours&&""!==e.hours||null!==e.minutes&&""!==e.minutes||e.showSeconds&&(!e.showSeconds||null!==e.seconds&&""!==e.seconds))}var v=new Date,y=[],w={$setViewValue:angular.noop},$=angular.isDefined(n.meridians)?e.$parent.$eval(n.meridians):r.meridians||a.DATETIME_FORMATS.AMPMS,D=angular.isDefined(n.padHours)?e.$parent.$eval(n.padHours):!0;e.tabindex=angular.isDefined(n.tabindex)?n.tabindex:0,t.removeAttr("tabindex"),this.init=function(t,i){w=t,w.$render=this.render,w.$formatters.unshift(function(e){return e?new Date(e):null});var o=i.eq(0),a=i.eq(1),l=i.eq(2),p=angular.isDefined(n.mousewheel)?e.$parent.$eval(n.mousewheel):r.mousewheel;p&&this.setupMousewheelEvents(o,a,l);var s=angular.isDefined(n.arrowkeys)?e.$parent.$eval(n.arrowkeys):r.arrowkeys;s&&this.setupArrowkeyEvents(o,a,l),e.readonlyInput=angular.isDefined(n.readonlyInput)?e.$parent.$eval(n.readonlyInput):r.readonlyInput,this.setupInputEvents(o,a,l)};var k=r.hourStep;n.hourStep&&y.push(e.$parent.$watch(i(n.hourStep),function(e){k=+e}));var M=r.minuteStep;n.minuteStep&&y.push(e.$parent.$watch(i(n.minuteStep),function(e){M=+e}));var x;y.push(e.$parent.$watch(i(n.min),function(e){var t=new Date(e);x=isNaN(t)?void 0:t}));var T;y.push(e.$parent.$watch(i(n.max),function(e){var t=new Date(e);T=isNaN(t)?void 0:t}));var S=!1;n.ngDisabled&&y.push(e.$parent.$watch(i(n.ngDisabled),function(e){S=e})),e.noIncrementHours=function(){var e=f(v,60*k);return S||e>T||v>e&&x>e},e.noDecrementHours=function(){var e=f(v,60*-k);return S||x>e||e>v&&e>T},e.noIncrementMinutes=function(){var e=f(v,M);return S||e>T||v>e&&x>e},e.noDecrementMinutes=function(){var e=f(v,-M);return S||x>e||e>v&&e>T},e.noIncrementSeconds=function(){var e=g(v,C);return S||e>T||v>e&&x>e},e.noDecrementSeconds=function(){var e=g(v,-C);return S||x>e||e>v&&e>T},e.noToggleMeridian=function(){return v.getHours()<12?S||f(v,720)>T:S||f(v,-720)<x};var C=r.secondStep;n.secondStep&&y.push(e.$parent.$watch(i(n.secondStep),function(e){C=+e})),e.showSeconds=r.showSeconds,n.showSeconds&&y.push(e.$parent.$watch(i(n.showSeconds),function(t){e.showSeconds=!!t})),e.showMeridian=r.showMeridian,n.showMeridian&&y.push(e.$parent.$watch(i(n.showMeridian),function(t){if(e.showMeridian=!!t,w.$error.time){var n=l(),i=p();angular.isDefined(n)&&angular.isDefined(i)&&(v.setHours(n),c())}else h()})),this.setupMousewheelEvents=function(t,n,i){var o=function(e){e.originalEvent&&(e=e.originalEvent);var t=e.wheelDelta?e.wheelDelta:-e.deltaY;return e.detail||t>0};t.bind("mousewheel wheel",function(t){S||e.$apply(o(t)?e.incrementHours():e.decrementHours()),t.preventDefault()}),n.bind("mousewheel wheel",function(t){S||e.$apply(o(t)?e.incrementMinutes():e.decrementMinutes()),t.preventDefault()}),i.bind("mousewheel wheel",function(t){S||e.$apply(o(t)?e.incrementSeconds():e.decrementSeconds()),t.preventDefault()})},this.setupArrowkeyEvents=function(t,n,i){t.bind("keydown",function(t){S||(38===t.which?(t.preventDefault(),e.incrementHours(),e.$apply()):40===t.which&&(t.preventDefault(),e.decrementHours(),e.$apply()))}),n.bind("keydown",function(t){S||(38===t.which?(t.preventDefault(),e.incrementMinutes(),e.$apply()):40===t.which&&(t.preventDefault(),e.decrementMinutes(),e.$apply()))}),i.bind("keydown",function(t){S||(38===t.which?(t.preventDefault(),e.incrementSeconds(),e.$apply()):40===t.which&&(t.preventDefault(),e.decrementSeconds(),e.$apply()))})},this.setupInputEvents=function(t,n,i){if(e.readonlyInput)return e.updateHours=angular.noop,e.updateMinutes=angular.noop,void(e.updateSeconds=angular.noop);var o=function(t,n,i){w.$setViewValue(null),w.$setValidity("time",!1),angular.isDefined(t)&&(e.invalidHours=t),angular.isDefined(n)&&(e.invalidMinutes=n),angular.isDefined(i)&&(e.invalidSeconds=i)};e.updateHours=function(){var e=l(),t=p();w.$setDirty(),angular.isDefined(e)&&angular.isDefined(t)?(v.setHours(e),v.setMinutes(t),x>v||v>T?o(!0):c("h")):o(!0)},t.bind("blur",function(){w.$setTouched(),b()?d():null===e.hours||""===e.hours?o(!0):!e.invalidHours&&e.hours<10&&e.$apply(function(){e.hours=u(e.hours,!D)})}),e.updateMinutes=function(){var e=p(),t=l();w.$setDirty(),angular.isDefined(e)&&angular.isDefined(t)?(v.setHours(t),v.setMinutes(e),x>v||v>T?o(void 0,!0):c("m")):o(void 0,!0)},n.bind("blur",function(){w.$setTouched(),b()?d():null===e.minutes?o(void 0,!0):!e.invalidMinutes&&e.minutes<10&&e.$apply(function(){e.minutes=u(e.minutes)})}),e.updateSeconds=function(){var e=s();w.$setDirty(),angular.isDefined(e)?(v.setSeconds(e),c("s")):o(void 0,void 0,!0)},i.bind("blur",function(){b()?d():!e.invalidSeconds&&e.seconds<10&&e.$apply(function(){e.seconds=u(e.seconds)})})},this.render=function(){var t=w.$viewValue;isNaN(t)?(w.$setValidity("time",!1),o.error('Timepicker directive: "ng-model" value must be a Date object, a number of milliseconds since 01.01.1970 or a string representing an RFC2822 or ISO 8601 date.')):(t&&(v=t),x>v||v>T?(w.$setValidity("time",!1),e.invalidHours=!0,e.invalidMinutes=!0):d(),h())},e.showSpinners=angular.isDefined(n.showSpinners)?e.$parent.$eval(n.showSpinners):r.showSpinners,e.incrementHours=function(){e.noIncrementHours()||m(60*k*60)},e.decrementHours=function(){e.noDecrementHours()||m(60*-k*60)},e.incrementMinutes=function(){e.noIncrementMinutes()||m(60*M)},e.decrementMinutes=function(){e.noDecrementMinutes()||m(60*-M)},e.incrementSeconds=function(){e.noIncrementSeconds()||m(C)},e.decrementSeconds=function(){e.noDecrementSeconds()||m(-C)},e.toggleMeridian=function(){var t=p(),n=l();e.noToggleMeridian()||(angular.isDefined(t)&&angular.isDefined(n)?m(720*(v.getHours()<12?60:-60)):e.meridian=e.meridian===$[0]?$[1]:$[0])},e.blur=function(){w.$setTouched()},e.$on("$destroy",function(){for(;y.length;)y.shift()()})}]).directive("uibTimepicker",["uibTimepickerConfig",function(e){return{require:["uibTimepicker","?^ngModel"],controller:"UibTimepickerController",controllerAs:"timepicker",replace:!0,scope:{},templateUrl:function(t,n){return n.templateUrl||e.templateUrl},link:function(e,t,n,i){var o=i[0],a=i[1];a&&o.init(a,t.find("input"))}}}]),angular.module("ui.bootstrap.typeahead",["ui.bootstrap.debounce","ui.bootstrap.position"]).factory("uibTypeaheadParser",["$parse",function(e){var t=/^\s*([\s\S]+?)(?:\s+as\s+([\s\S]+?))?\s+for\s+(?:([\$\w][\$\w\d]*))\s+in\s+([\s\S]+?)$/;return{parse:function(n){var i=n.match(t);if(!i)throw new Error('Expected typeahead specification in form of "_modelValue_ (as _label_)? for _item_ in _collection_" but got "'+n+'".');return{itemName:i[3],source:e(i[4]),viewMapper:e(i[2]||i[1]),modelMapper:e(i[1])}}}}]).controller("UibTypeaheadController",["$scope","$element","$attrs","$compile","$parse","$q","$timeout","$document","$window","$rootScope","$$debounce","$uibPosition","uibTypeaheadParser",function(e,t,n,i,o,a,r,l,p,s,u,c,d){function h(){R.moveInProgress||(R.moveInProgress=!0,R.$digest()),Z()}function m(){R.position=E?c.offset(t):c.position(t),R.position.top+=t.prop("offsetHeight")}var f,g,b=[9,13,27,38,40],v=200,y=e.$eval(n.typeaheadMinLength);y||0===y||(y=1),e.$watch(n.typeaheadMinLength,function(e){y=e||0===e?e:1});var w=e.$eval(n.typeaheadWaitMs)||0,$=e.$eval(n.typeaheadEditable)!==!1;e.$watch(n.typeaheadEditable,function(e){$=e!==!1});var D,k,M=o(n.typeaheadLoading).assign||angular.noop,x=n.typeaheadShouldSelect?o(n.typeaheadShouldSelect):function(e,t){var n=t.$event;return 13===n.which||9===n.which},T=o(n.typeaheadOnSelect),S=angular.isDefined(n.typeaheadSelectOnBlur)?e.$eval(n.typeaheadSelectOnBlur):!1,C=o(n.typeaheadNoResults).assign||angular.noop,O=n.typeaheadInputFormatter?o(n.typeaheadInputFormatter):void 0,E=n.typeaheadAppendToBody?e.$eval(n.typeaheadAppendToBody):!1,I=n.typeaheadAppendTo?e.$eval(n.typeaheadAppendTo):null,F=e.$eval(n.typeaheadFocusFirst)!==!1,A=n.typeaheadSelectOnExact?e.$eval(n.typeaheadSelectOnExact):!1,H=o(n.typeaheadIsOpen).assign||angular.noop,P=e.$eval(n.typeaheadShowHint)||!1,N=o(n.ngModel),U=o(n.ngModel+"($$$p)"),Y=function(t,n){return angular.isFunction(N(e))&&g&&g.$options&&g.$options.getterSetter?U(t,{$$$p:n}):N.assign(t,n)},V=d.parse(n.uibTypeahead),R=e.$new(),z=e.$on("$destroy",function(){R.$destroy()});R.$on("$destroy",z);var q="typeahead-"+R.$id+"-"+Math.floor(1e4*Math.random());t.attr({"aria-autocomplete":"list","aria-expanded":!1,"aria-owns":q});var W,_;P&&(W=angular.element("<div></div>"),W.css("position","relative"),t.after(W),_=t.clone(),_.attr("placeholder",""),_.attr("tabindex","-1"),_.val(""),_.css({position:"absolute",top:"0px",left:"0px","border-color":"transparent","box-shadow":"none",opacity:1,background:"none 0% 0% / auto repeat scroll padding-box border-box rgb(255, 255, 255)",color:"#999"}),t.css({position:"relative","vertical-align":"top","background-color":"transparent"}),W.append(_),_.after(t));var j=angular.element("<div uib-typeahead-popup></div>");j.attr({id:q,matches:"matches",active:"activeIdx",select:"select(activeIdx, evt)","move-in-progress":"moveInProgress",query:"query",position:"position","assign-is-open":"assignIsOpen(isOpen)",debounce:"debounceUpdate"}),angular.isDefined(n.typeaheadTemplateUrl)&&j.attr("template-url",n.typeaheadTemplateUrl),angular.isDefined(n.typeaheadPopupTemplateUrl)&&j.attr("popup-template-url",n.typeaheadPopupTemplateUrl);var G=function(){P&&_.val("")},L=function(){R.matches=[],R.activeIdx=-1,t.attr("aria-expanded",!1),G()},B=function(e){return q+"-option-"+e};R.$watch("activeIdx",function(e){0>e?t.removeAttr("aria-activedescendant"):t.attr("aria-activedescendant",B(e))});var K=function(e,t){return R.matches.length>t&&e?e.toUpperCase()===R.matches[t].label.toUpperCase():!1},X=function(n,i){var o={$viewValue:n};M(e,!0),C(e,!1),a.when(V.source(e,o)).then(function(a){var r=n===f.$viewValue;if(r&&D)if(a&&a.length>0){R.activeIdx=F?0:-1,C(e,!1),R.matches.length=0;for(var l=0;l<a.length;l++)o[V.itemName]=a[l],R.matches.push({id:B(l),label:V.viewMapper(R,o),model:a[l]});if(R.query=n,m(),t.attr("aria-expanded",!0),A&&1===R.matches.length&&K(n,0)&&(angular.isNumber(R.debounceUpdate)||angular.isObject(R.debounceUpdate)?u(function(){R.select(0,i)},angular.isNumber(R.debounceUpdate)?R.debounceUpdate:R.debounceUpdate["default"]):R.select(0,i)),P){var p=R.matches[0].label;_.val(angular.isString(n)&&n.length>0&&p.slice(0,n.length).toUpperCase()===n.toUpperCase()?n+p.slice(n.length):"")}}else L(),C(e,!0);r&&M(e,!1)},function(){L(),M(e,!1),C(e,!0)})};E&&(angular.element(p).on("resize",h),l.find("body").on("scroll",h));var Z=u(function(){R.matches.length&&m(),R.moveInProgress=!1},v);R.moveInProgress=!1,R.query=void 0;var J,Q=function(e){J=r(function(){X(e)},w)},et=function(){J&&r.cancel(J)};L(),R.assignIsOpen=function(t){H(e,t)},R.select=function(i,o){var a,l,p={};k=!0,p[V.itemName]=l=R.matches[i].model,a=V.modelMapper(e,p),Y(e,a),f.$setValidity("editable",!0),f.$setValidity("parse",!0),T(e,{$item:l,$model:a,$label:V.viewMapper(e,p),$event:o}),L(),R.$eval(n.typeaheadFocusOnSelect)!==!1&&r(function(){t[0].focus()},0,!1)},t.on("keydown",function(t){if(0!==R.matches.length&&-1!==b.indexOf(t.which)){var n=x(e,{$event:t});if(-1===R.activeIdx&&n||9===t.which&&t.shiftKey)return L(),void R.$digest();t.preventDefault();var i;switch(t.which){case 27:t.stopPropagation(),L(),e.$digest();break;case 38:R.activeIdx=(R.activeIdx>0?R.activeIdx:R.matches.length)-1,R.$digest(),i=j.find("li")[R.activeIdx],i.parentNode.scrollTop=i.offsetTop;break;case 40:R.activeIdx=(R.activeIdx+1)%R.matches.length,R.$digest(),i=j.find("li")[R.activeIdx],i.parentNode.scrollTop=i.offsetTop;break;default:n&&R.$apply(function(){angular.isNumber(R.debounceUpdate)||angular.isObject(R.debounceUpdate)?u(function(){R.select(R.activeIdx,t)},angular.isNumber(R.debounceUpdate)?R.debounceUpdate:R.debounceUpdate["default"]):R.select(R.activeIdx,t)})}}}),t.bind("focus",function(e){D=!0,0!==y||f.$viewValue||r(function(){X(f.$viewValue,e)},0)}),t.bind("blur",function(e){S&&R.matches.length&&-1!==R.activeIdx&&!k&&(k=!0,R.$apply(function(){angular.isObject(R.debounceUpdate)&&angular.isNumber(R.debounceUpdate.blur)?u(function(){R.select(R.activeIdx,e)},R.debounceUpdate.blur):R.select(R.activeIdx,e)})),!$&&f.$error.editable&&(f.$setViewValue(),f.$setValidity("editable",!0),f.$setValidity("parse",!0),t.val("")),D=!1,k=!1});var tt=function(n){t[0]!==n.target&&3!==n.which&&0!==R.matches.length&&(L(),s.$$phase||e.$digest())};l.on("click",tt),e.$on("$destroy",function(){l.off("click",tt),(E||I)&&nt.remove(),E&&(angular.element(p).off("resize",h),l.find("body").off("scroll",h)),j.remove(),P&&W.remove()});var nt=i(j)(R);E?l.find("body").append(nt):I?angular.element(I).eq(0).append(nt):t.after(nt),this.init=function(t,n){f=t,g=n,R.debounceUpdate=f.$options&&o(f.$options.debounce)(e),f.$parsers.unshift(function(t){return D=!0,0===y||t&&t.length>=y?w>0?(et(),Q(t)):X(t):(M(e,!1),et(),L()),$?t:t?void f.$setValidity("editable",!1):(f.$setValidity("editable",!0),null)}),f.$formatters.push(function(t){var n,i,o={};return $||f.$setValidity("editable",!0),O?(o.$model=t,O(e,o)):(o[V.itemName]=t,n=V.viewMapper(e,o),o[V.itemName]=void 0,i=V.viewMapper(e,o),n!==i?n:t)})}}]).directive("uibTypeahead",function(){return{controller:"UibTypeaheadController",require:["ngModel","^?ngModelOptions","uibTypeahead"],link:function(e,t,n,i){i[2].init(i[0],i[1])}}}).directive("uibTypeaheadPopup",["$$debounce",function(e){return{scope:{matches:"=",query:"=",active:"=",position:"&",moveInProgress:"=",select:"&",assignIsOpen:"&",debounce:"&"},replace:!0,templateUrl:function(e,t){return t.popupTemplateUrl||"uib/template/typeahead/typeahead-popup.html"},link:function(t,n,i){t.templateUrl=i.templateUrl,t.isOpen=function(){var e=t.matches.length>0;return t.assignIsOpen({isOpen:e}),e},t.isActive=function(e){return t.active===e},t.selectActive=function(e){t.active=e},t.selectMatch=function(n,i){var o=t.debounce();angular.isNumber(o)||angular.isObject(o)?e(function(){t.select({activeIdx:n,evt:i})},angular.isNumber(o)?o:o["default"]):t.select({activeIdx:n,evt:i})}}}}]).directive("uibTypeaheadMatch",["$templateRequest","$compile","$parse",function(e,t,n){return{scope:{index:"=",match:"=",query:"="},link:function(i,o,a){var r=n(a.templateUrl)(i.$parent)||"uib/template/typeahead/typeahead-match.html";e(r).then(function(e){var n=angular.element(e.trim());o.replaceWith(n),t(n)(i)})}}}]).filter("uibTypeaheadHighlight",["$sce","$injector","$log",function(e,t,n){function i(e){return e.replace(/([.?*+^$[\]\\(){}|-])/g,"\\$1")}function o(e){return/<.*>/g.test(e)}var a;return a=t.has("$sanitize"),function(t,r){return!a&&o(t)&&n.warn("Unsafe use of typeahead please use ngSanitize"),t=r?(""+t).replace(new RegExp(i(r),"gi"),"<strong>$&</strong>"):t,a||(t=e.trustAsHtml(t)),t}}]),angular.module("ui.bootstrap.debounce",[]).factory("$$debounce",["$timeout",function(e){return function(t,n){var i;return function(){var o=this,a=Array.prototype.slice.call(arguments);i&&e.cancel(i),i=e(function(){t.apply(o,a)},n)}}}]),angular.module("ui.bootstrap.position",[]).factory("$uibPosition",["$document","$window",function(e,t){var n,i,o={normal:/(auto|scroll)/,hidden:/(auto|scroll|hidden)/},a={auto:/\s?auto?\s?/i,primary:/^(top|bottom|left|right)$/,secondary:/^(top|bottom|left|right|center)$/,vertical:/^(top|bottom)$/},r=/(HTML|BODY)/;return{getRawNode:function(e){return e.nodeName?e:e[0]||e},parseStyle:function(e){return e=parseFloat(e),isFinite(e)?e:0},offsetParent:function(n){function i(e){return"static"===(t.getComputedStyle(e).position||"static")}n=this.getRawNode(n);for(var o=n.offsetParent||e[0].documentElement;o&&o!==e[0].documentElement&&i(o);)o=o.offsetParent;return o||e[0].documentElement},scrollbarWidth:function(o){if(o){if(angular.isUndefined(i)){var a=e.find("body");a.addClass("uib-position-body-scrollbar-measure"),i=t.innerWidth-a[0].clientWidth,i=isFinite(i)?i:0,a.removeClass("uib-position-body-scrollbar-measure")}return i}if(angular.isUndefined(n)){var r=angular.element('<div class="uib-position-scrollbar-measure"></div>');e.find("body").append(r),n=r[0].offsetWidth-r[0].clientWidth,n=isFinite(n)?n:0,r.remove()}return n},scrollbarPadding:function(e){e=this.getRawNode(e);var n=t.getComputedStyle(e),i=this.parseStyle(n.paddingRight),o=this.parseStyle(n.paddingBottom),a=this.scrollParent(e,!1,!0),l=this.scrollbarWidth(a,r.test(a.tagName));return{scrollbarWidth:l,widthOverflow:a.scrollWidth>a.clientWidth,right:i+l,originalRight:i,heightOverflow:a.scrollHeight>a.clientHeight,bottom:o+l,originalBottom:o}},isScrollable:function(e,n){e=this.getRawNode(e);var i=n?o.hidden:o.normal,a=t.getComputedStyle(e);return i.test(a.overflow+a.overflowY+a.overflowX)},scrollParent:function(n,i,a){n=this.getRawNode(n);var r=i?o.hidden:o.normal,l=e[0].documentElement,p=t.getComputedStyle(n);if(a&&r.test(p.overflow+p.overflowY+p.overflowX))return n;var s="absolute"===p.position,u=n.parentElement||l;if(u===l||"fixed"===p.position)return l;for(;u.parentElement&&u!==l;){var c=t.getComputedStyle(u);if(s&&"static"!==c.position&&(s=!1),!s&&r.test(c.overflow+c.overflowY+c.overflowX))break;u=u.parentElement}return u},position:function(n,i){n=this.getRawNode(n);var o=this.offset(n);if(i){var a=t.getComputedStyle(n);o.top-=this.parseStyle(a.marginTop),o.left-=this.parseStyle(a.marginLeft)}var r=this.offsetParent(n),l={top:0,left:0};return r!==e[0].documentElement&&(l=this.offset(r),l.top+=r.clientTop-r.scrollTop,l.left+=r.clientLeft-r.scrollLeft),{width:Math.round(angular.isNumber(o.width)?o.width:n.offsetWidth),height:Math.round(angular.isNumber(o.height)?o.height:n.offsetHeight),top:Math.round(o.top-l.top),left:Math.round(o.left-l.left)}},offset:function(n){n=this.getRawNode(n);var i=n.getBoundingClientRect();return{width:Math.round(angular.isNumber(i.width)?i.width:n.offsetWidth),height:Math.round(angular.isNumber(i.height)?i.height:n.offsetHeight),top:Math.round(i.top+(t.pageYOffset||e[0].documentElement.scrollTop)),left:Math.round(i.left+(t.pageXOffset||e[0].documentElement.scrollLeft))}},viewportOffset:function(n,i,o){n=this.getRawNode(n),o=o!==!1?!0:!1;var a=n.getBoundingClientRect(),r={top:0,left:0,bottom:0,right:0},l=i?e[0].documentElement:this.scrollParent(n),p=l.getBoundingClientRect();if(r.top=p.top+l.clientTop,r.left=p.left+l.clientLeft,l===e[0].documentElement&&(r.top+=t.pageYOffset,r.left+=t.pageXOffset),r.bottom=r.top+l.clientHeight,r.right=r.left+l.clientWidth,o){var s=t.getComputedStyle(l);r.top+=this.parseStyle(s.paddingTop),r.bottom-=this.parseStyle(s.paddingBottom),r.left+=this.parseStyle(s.paddingLeft),r.right-=this.parseStyle(s.paddingRight)}return{top:Math.round(a.top-r.top),bottom:Math.round(r.bottom-a.bottom),left:Math.round(a.left-r.left),right:Math.round(r.right-a.right)}},parsePlacement:function(e){var t=a.auto.test(e);return t&&(e=e.replace(a.auto,"")),e=e.split("-"),e[0]=e[0]||"top",a.primary.test(e[0])||(e[0]="top"),e[1]=e[1]||"center",a.secondary.test(e[1])||(e[1]="center"),e[2]=t?!0:!1,e},positionElements:function(e,n,i,o){e=this.getRawNode(e),n=this.getRawNode(n);var r=angular.isDefined(n.offsetWidth)?n.offsetWidth:n.prop("offsetWidth"),l=angular.isDefined(n.offsetHeight)?n.offsetHeight:n.prop("offsetHeight");i=this.parsePlacement(i);var p=o?this.offset(e):this.position(e),s={top:0,left:0,placement:""};if(i[2]){var u=this.viewportOffset(e,o),c=t.getComputedStyle(n),d={width:r+Math.round(Math.abs(this.parseStyle(c.marginLeft)+this.parseStyle(c.marginRight))),height:l+Math.round(Math.abs(this.parseStyle(c.marginTop)+this.parseStyle(c.marginBottom)))};if(i[0]="top"===i[0]&&d.height>u.top&&d.height<=u.bottom?"bottom":"bottom"===i[0]&&d.height>u.bottom&&d.height<=u.top?"top":"left"===i[0]&&d.width>u.left&&d.width<=u.right?"right":"right"===i[0]&&d.width>u.right&&d.width<=u.left?"left":i[0],i[1]="top"===i[1]&&d.height-p.height>u.bottom&&d.height-p.height<=u.top?"bottom":"bottom"===i[1]&&d.height-p.height>u.top&&d.height-p.height<=u.bottom?"top":"left"===i[1]&&d.width-p.width>u.right&&d.width-p.width<=u.left?"right":"right"===i[1]&&d.width-p.width>u.left&&d.width-p.width<=u.right?"left":i[1],"center"===i[1])if(a.vertical.test(i[0])){var h=p.width/2-r/2;u.left+h<0&&d.width-p.width<=u.right?i[1]="left":u.right+h<0&&d.width-p.width<=u.left&&(i[1]="right")}else{var m=p.height/2-d.height/2;u.top+m<0&&d.height-p.height<=u.bottom?i[1]="top":u.bottom+m<0&&d.height-p.height<=u.top&&(i[1]="bottom")}}switch(i[0]){case"top":s.top=p.top-l;break;case"bottom":s.top=p.top+p.height;break;case"left":s.left=p.left-r;break;case"right":s.left=p.left+p.width}switch(i[1]){case"top":s.top=p.top;break;case"bottom":s.top=p.top+p.height-l;break;case"left":s.left=p.left;break;case"right":s.left=p.left+p.width-r;break;case"center":a.vertical.test(i[0])?s.left=p.left+p.width/2-r/2:s.top=p.top+p.height/2-l/2}return s.top=Math.round(s.top),s.left=Math.round(s.left),s.placement="center"===i[1]?i[0]:i[0]+"-"+i[1],s},positionArrow:function(e,n){e=this.getRawNode(e);var i=e.querySelector(".tooltip-inner, .popover-inner");if(i){var o=angular.element(i).hasClass("tooltip-inner"),r=e.querySelector(o?".tooltip-arrow":".arrow");if(r){var l={top:"",bottom:"",left:"",right:""};if(n=this.parsePlacement(n),"center"===n[1])return void angular.element(r).css(l);var p="border-"+n[0]+"-width",s=t.getComputedStyle(r)[p],u="border-";u+=a.vertical.test(n[0])?n[0]+"-"+n[1]:n[1]+"-"+n[0],u+="-radius";var c=t.getComputedStyle(o?i:e)[u];switch(n[0]){case"top":l.bottom=o?"0":"-"+s;break;case"bottom":l.top=o?"0":"-"+s;break;case"left":l.right=o?"0":"-"+s;break;case"right":l.left=o?"0":"-"+s}l[n[1]]=c,angular.element(r).css(l)}}}}}]),angular.module("ui.bootstrap.tooltip",["ui.bootstrap.position","ui.bootstrap.stackedMap"]).provider("$uibTooltip",function(){function e(e){var t=/[A-Z]/g,n="-";return e.replace(t,function(e,t){return(t?n:"")+e.toLowerCase()})}var t={placement:"top",placementClassPrefix:"",animation:!0,popupDelay:0,popupCloseDelay:0,useContentExp:!1},n={mouseenter:"mouseleave",click:"click",outsideClick:"outsideClick",focus:"blur",none:""},i={};this.options=function(e){angular.extend(i,e)},this.setTriggers=function(e){angular.extend(n,e)},this.$get=["$window","$compile","$timeout","$document","$uibPosition","$interpolate","$rootScope","$parse","$$stackedMap",function(o,a,r,l,p,s,u,c,d){function h(e){if(27===e.which){var t=m.top();t&&(t.value.close(),m.removeTop(),t=null)}}var m=d.createNew();return l.on("keypress",h),u.$on("$destroy",function(){l.off("keypress",h)}),function(o,u,d,h){function f(e){var t=(e||h.trigger||d).split(" "),i=t.map(function(e){return n[e]||e});return{show:t,hide:i}}h=angular.extend({},t,i,h);var g=e(o),b=s.startSymbol(),v=s.endSymbol(),y="<div "+g+'-popup uib-title="'+b+"title"+v+'" '+(h.useContentExp?'content-exp="contentExp()" ':'content="'+b+"content"+v+'" ')+'placement="'+b+"placement"+v+'" popup-class="'+b+"popupClass"+v+'" animation="animation" is-open="isOpen" origin-scope="origScope" class="uib-position-measure"></div>';return{compile:function(){var e=a(y);return function(t,n,i){function a(){Y.isOpen?d():s()}function s(){(!U||t.$eval(i[u+"Enable"]))&&(y(),D(),Y.popupDelay?I||(I=r(g,Y.popupDelay,!1)):g())}function d(){b(),Y.popupCloseDelay?F||(F=r(v,Y.popupCloseDelay,!1)):v()}function g(){return b(),y(),Y.content?(w(),void Y.$evalAsync(function(){Y.isOpen=!0,k(!0),W()})):angular.noop}function b(){I&&(r.cancel(I),I=null),A&&(r.cancel(A),A=null)}function v(){Y&&Y.$evalAsync(function(){Y&&(Y.isOpen=!1,k(!1),Y.animation?E||(E=r($,150,!1)):$())})}function y(){F&&(r.cancel(F),F=null),E&&(r.cancel(E),E=null)}function w(){C||(O=Y.$new(),C=e(O,function(e){P?l.find("body").append(e):n.after(e)}),M())}function $(){b(),y(),x(),C&&(C.remove(),C=null),O&&(O.$destroy(),O=null)}function D(){Y.title=i[u+"Title"],Y.content=z?z(t):i[o],Y.popupClass=i[u+"Class"],Y.placement=angular.isDefined(i[u+"Placement"])?i[u+"Placement"]:h.placement;var e=p.parsePlacement(Y.placement);H=e[1]?e[0]+"-"+e[1]:e[0];var n=parseInt(i[u+"PopupDelay"],10),a=parseInt(i[u+"PopupCloseDelay"],10);Y.popupDelay=isNaN(n)?h.popupDelay:n,Y.popupCloseDelay=isNaN(a)?h.popupCloseDelay:a}function k(e){R&&angular.isFunction(R.assign)&&R.assign(t,e)}function M(){q.length=0,z?(q.push(t.$watch(z,function(e){Y.content=e,!e&&Y.isOpen&&v()})),q.push(O.$watch(function(){V||(V=!0,O.$$postDigest(function(){V=!1,Y&&Y.isOpen&&W()}))}))):q.push(i.$observe(o,function(e){Y.content=e,!e&&Y.isOpen?v():W()})),q.push(i.$observe(u+"Title",function(e){Y.title=e,Y.isOpen&&W()})),q.push(i.$observe(u+"Placement",function(e){Y.placement=e?e:h.placement,Y.isOpen&&W()}))}function x(){q.length&&(angular.forEach(q,function(e){e()}),q.length=0)}function T(e){Y&&Y.isOpen&&C&&(n[0].contains(e.target)||C[0].contains(e.target)||d())}function S(){var e=i[u+"Trigger"];_(),N=f(e),"none"!==N.show&&N.show.forEach(function(e,t){"outsideClick"===e?(n.on("click",a),l.on("click",T)):e===N.hide[t]?n.on(e,a):e&&(n.on(e,s),n.on(N.hide[t],d)),n.on("keypress",function(e){27===e.which&&d()})})}var C,O,E,I,F,A,H,P=angular.isDefined(h.appendToBody)?h.appendToBody:!1,N=f(void 0),U=angular.isDefined(i[u+"Enable"]),Y=t.$new(!0),V=!1,R=angular.isDefined(i[u+"IsOpen"])?c(i[u+"IsOpen"]):!1,z=h.useContentExp?c(i[o]):!1,q=[],W=function(){C&&C.html()&&(A||(A=r(function(){var e=p.positionElements(n,C,Y.placement,P);C.css({top:e.top+"px",left:e.left+"px"}),C.hasClass(e.placement.split("-")[0])||(C.removeClass(H.split("-")[0]),C.addClass(e.placement.split("-")[0])),C.hasClass(h.placementClassPrefix+e.placement)||(C.removeClass(h.placementClassPrefix+H),C.addClass(h.placementClassPrefix+e.placement)),C.hasClass("uib-position-measure")?(p.positionArrow(C,e.placement),C.removeClass("uib-position-measure")):H!==e.placement&&p.positionArrow(C,e.placement),H=e.placement,A=null},0,!1)))};Y.origScope=t,Y.isOpen=!1,m.add(Y,{close:v}),Y.contentExp=function(){return Y.content},i.$observe("disabled",function(e){e&&b(),e&&Y.isOpen&&v()}),R&&t.$watch(R,function(e){Y&&!e===Y.isOpen&&a()});var _=function(){N.show.forEach(function(e){"outsideClick"===e?n.off("click",a):(n.off(e,s),n.off(e,a))}),N.hide.forEach(function(e){"outsideClick"===e?l.off("click",T):n.off(e,d)})};S();var j=t.$eval(i[u+"Animation"]);Y.animation=angular.isDefined(j)?!!j:h.animation;var G,L=u+"AppendToBody";G=L in i&&void 0===i[L]?!0:t.$eval(i[L]),P=angular.isDefined(G)?G:P,t.$on("$destroy",function(){_(),$(),m.remove(Y),Y=null})}}}}}]}).directive("uibTooltipTemplateTransclude",["$animate","$sce","$compile","$templateRequest",function(e,t,n,i){return{link:function(o,a,r){var l,p,s,u=o.$eval(r.tooltipTemplateTranscludeScope),c=0,d=function(){p&&(p.remove(),p=null),l&&(l.$destroy(),l=null),s&&(e.leave(s).then(function(){p=null}),p=s,s=null)};o.$watch(t.parseAsResourceUrl(r.uibTooltipTemplateTransclude),function(t){var r=++c;t?(i(t,!0).then(function(i){if(r===c){var o=u.$new(),p=i,h=n(p)(o,function(t){d(),e.enter(t,a)});l=o,s=h,l.$emit("$includeContentLoaded",t)}},function(){r===c&&(d(),o.$emit("$includeContentError",t))}),o.$emit("$includeContentRequested",t)):d()}),o.$on("$destroy",d)}}}]).directive("uibTooltipClasses",["$uibPosition",function(e){return{restrict:"A",link:function(t,n,i){if(t.placement){var o=e.parsePlacement(t.placement);n.addClass(o[0])}t.popupClass&&n.addClass(t.popupClass),t.animation()&&n.addClass(i.tooltipAnimationClass)}}}]).directive("uibTooltipPopup",function(){return{replace:!0,scope:{content:"@",placement:"@",popupClass:"@",animation:"&",isOpen:"&"},templateUrl:"uib/template/tooltip/tooltip-popup.html"}}).directive("uibTooltip",["$uibTooltip",function(e){return e("uibTooltip","tooltip","mouseenter")}]).directive("uibTooltipTemplatePopup",function(){return{replace:!0,scope:{contentExp:"&",placement:"@",popupClass:"@",animation:"&",isOpen:"&",originScope:"&"},templateUrl:"uib/template/tooltip/tooltip-template-popup.html"}}).directive("uibTooltipTemplate",["$uibTooltip",function(e){return e("uibTooltipTemplate","tooltip","mouseenter",{useContentExp:!0})}]).directive("uibTooltipHtmlPopup",function(){return{replace:!0,scope:{contentExp:"&",placement:"@",popupClass:"@",animation:"&",isOpen:"&"},templateUrl:"uib/template/tooltip/tooltip-html-popup.html"}}).directive("uibTooltipHtml",["$uibTooltip",function(e){return e("uibTooltipHtml","tooltip","mouseenter",{useContentExp:!0})}]),angular.module("ui.bootstrap.stackedMap",[]).factory("$$stackedMap",function(){return{createNew:function(){var e=[];return{add:function(t,n){e.push({key:t,value:n})},get:function(t){for(var n=0;n<e.length;n++)if(t===e[n].key)return e[n]},keys:function(){for(var t=[],n=0;n<e.length;n++)t.push(e[n].key);return t},top:function(){return e[e.length-1]},remove:function(t){for(var n=-1,i=0;i<e.length;i++)if(t===e[i].key){n=i;break}return e.splice(n,1)[0]},removeTop:function(){return e.splice(e.length-1,1)[0]},length:function(){return e.length}}}}}),angular.module("ui.bootstrap.popover",["ui.bootstrap.tooltip"]).directive("uibPopoverTemplatePopup",function(){return{replace:!0,scope:{uibTitle:"@",contentExp:"&",placement:"@",popupClass:"@",animation:"&",isOpen:"&",originScope:"&"},templateUrl:"uib/template/popover/popover-template.html"}}).directive("uibPopoverTemplate",["$uibTooltip",function(e){return e("uibPopoverTemplate","popover","click",{useContentExp:!0})}]).directive("uibPopoverHtmlPopup",function(){return{replace:!0,scope:{contentExp:"&",uibTitle:"@",placement:"@",popupClass:"@",animation:"&",isOpen:"&"},templateUrl:"uib/template/popover/popover-html.html"}}).directive("uibPopoverHtml",["$uibTooltip",function(e){return e("uibPopoverHtml","popover","click",{useContentExp:!0})}]).directive("uibPopoverPopup",function(){return{replace:!0,scope:{uibTitle:"@",content:"@",placement:"@",popupClass:"@",animation:"&",isOpen:"&"},templateUrl:"uib/template/popover/popover.html"}
}).directive("uibPopover",["$uibTooltip",function(e){return e("uibPopover","popover","click")}]),angular.module("ui.bootstrap.datepicker",["ui.bootstrap.dateparser","ui.bootstrap.isClass"]).value("$datepickerSuppressError",!1).value("$datepickerLiteralWarning",!0).constant("uibDatepickerConfig",{datepickerMode:"day",formatDay:"dd",formatMonth:"MMMM",formatYear:"yyyy",formatDayHeader:"EEE",formatDayTitle:"MMMM yyyy",formatMonthTitle:"yyyy",maxDate:null,maxMode:"year",minDate:null,minMode:"day",ngModelOptions:{},shortcutPropagation:!1,showWeeks:!0,yearColumns:5,yearRows:4}).controller("UibDatepickerController",["$scope","$attrs","$parse","$interpolate","$locale","$log","dateFilter","uibDatepickerConfig","$datepickerLiteralWarning","$datepickerSuppressError","uibDateParser",function(e,t,n,i,o,a,r,l,p,s,u){function c(t){e.datepickerMode=t,e.datepickerOptions.datepickerMode=t}{var d=this,h={$setViewValue:angular.noop},m={},f=[];!!t.datepickerOptions}e.datepickerOptions||(e.datepickerOptions={}),this.modes=["day","month","year"],["customClass","dateDisabled","datepickerMode","formatDay","formatDayHeader","formatDayTitle","formatMonth","formatMonthTitle","formatYear","maxDate","maxMode","minDate","minMode","showWeeks","shortcutPropagation","startingDay","yearColumns","yearRows"].forEach(function(t){switch(t){case"customClass":case"dateDisabled":e[t]=e.datepickerOptions[t]||angular.noop;break;case"datepickerMode":e.datepickerMode=angular.isDefined(e.datepickerOptions.datepickerMode)?e.datepickerOptions.datepickerMode:l.datepickerMode;break;case"formatDay":case"formatDayHeader":case"formatDayTitle":case"formatMonth":case"formatMonthTitle":case"formatYear":d[t]=angular.isDefined(e.datepickerOptions[t])?i(e.datepickerOptions[t])(e.$parent):l[t];break;case"showWeeks":case"shortcutPropagation":case"yearColumns":case"yearRows":d[t]=angular.isDefined(e.datepickerOptions[t])?e.datepickerOptions[t]:l[t];break;case"startingDay":d.startingDay=angular.isDefined(e.datepickerOptions.startingDay)?e.datepickerOptions.startingDay:angular.isNumber(l.startingDay)?l.startingDay:(o.DATETIME_FORMATS.FIRSTDAYOFWEEK+8)%7;break;case"maxDate":case"minDate":e.$watch("datepickerOptions."+t,function(e){e?angular.isDate(e)?d[t]=u.fromTimezone(new Date(e),m.timezone):(p&&a.warn("Literal date support has been deprecated, please switch to date object usage"),d[t]=new Date(r(e,"medium"))):d[t]=l[t]?u.fromTimezone(new Date(l[t]),m.timezone):null,d.refreshView()});break;case"maxMode":case"minMode":e.datepickerOptions[t]?e.$watch(function(){return e.datepickerOptions[t]},function(n){d[t]=e[t]=angular.isDefined(n)?n:datepickerOptions[t],("minMode"===t&&d.modes.indexOf(e.datepickerOptions.datepickerMode)<d.modes.indexOf(d[t])||"maxMode"===t&&d.modes.indexOf(e.datepickerOptions.datepickerMode)>d.modes.indexOf(d[t]))&&(e.datepickerMode=d[t],e.datepickerOptions.datepickerMode=d[t])}):d[t]=e[t]=l[t]||null}}),e.uniqueId="datepicker-"+e.$id+"-"+Math.floor(1e4*Math.random()),e.disabled=angular.isDefined(t.disabled)||!1,angular.isDefined(t.ngDisabled)&&f.push(e.$parent.$watch(t.ngDisabled,function(t){e.disabled=t,d.refreshView()})),e.isActive=function(t){return 0===d.compare(t.date,d.activeDate)?(e.activeDateId=t.uid,!0):!1},this.init=function(t){h=t,m=t.$options||l.ngModelOptions,e.datepickerOptions.initDate?(d.activeDate=u.fromTimezone(e.datepickerOptions.initDate,m.timezone)||new Date,e.$watch("datepickerOptions.initDate",function(e){e&&(h.$isEmpty(h.$modelValue)||h.$invalid)&&(d.activeDate=u.fromTimezone(e,m.timezone),d.refreshView())})):d.activeDate=new Date;var n=h.$modelValue?new Date(h.$modelValue):new Date;this.activeDate=isNaN(n)?u.fromTimezone(new Date,m.timezone):u.fromTimezone(n,m.timezone),h.$render=function(){d.render()}},this.render=function(){if(h.$viewValue){var e=new Date(h.$viewValue),t=!isNaN(e);t?this.activeDate=u.fromTimezone(e,m.timezone):s||a.error('Datepicker directive: "ng-model" value must be a Date object')}this.refreshView()},this.refreshView=function(){if(this.element){e.selectedDt=null,this._refreshView(),e.activeDt&&(e.activeDateId=e.activeDt.uid);var t=h.$viewValue?new Date(h.$viewValue):null;t=u.fromTimezone(t,m.timezone),h.$setValidity("dateDisabled",!t||this.element&&!this.isDisabled(t))}},this.createDateObject=function(t,n){var i=h.$viewValue?new Date(h.$viewValue):null;i=u.fromTimezone(i,m.timezone);var o=new Date;o=u.fromTimezone(o,m.timezone);var a=this.compare(t,o),r={date:t,label:u.filter(t,n),selected:i&&0===this.compare(t,i),disabled:this.isDisabled(t),past:0>a,current:0===a,future:a>0,customClass:this.customClass(t)||null};return i&&0===this.compare(t,i)&&(e.selectedDt=r),d.activeDate&&0===this.compare(r.date,d.activeDate)&&(e.activeDt=r),r},this.isDisabled=function(t){return e.disabled||this.minDate&&this.compare(t,this.minDate)<0||this.maxDate&&this.compare(t,this.maxDate)>0||e.dateDisabled&&e.dateDisabled({date:t,mode:e.datepickerMode})},this.customClass=function(t){return e.customClass({date:t,mode:e.datepickerMode})},this.split=function(e,t){for(var n=[];e.length>0;)n.push(e.splice(0,t));return n},e.select=function(t){if(e.datepickerMode===d.minMode){var n=h.$viewValue?u.fromTimezone(new Date(h.$viewValue),m.timezone):new Date(0,0,0,0,0,0,0);n.setFullYear(t.getFullYear(),t.getMonth(),t.getDate()),n=u.toTimezone(n,m.timezone),h.$setViewValue(n),h.$render()}else d.activeDate=t,c(d.modes[d.modes.indexOf(e.datepickerMode)-1]),e.$emit("uib:datepicker.mode");e.$broadcast("uib:datepicker.focus")},e.move=function(e){var t=d.activeDate.getFullYear()+e*(d.step.years||0),n=d.activeDate.getMonth()+e*(d.step.months||0);d.activeDate.setFullYear(t,n,1),d.refreshView()},e.toggleMode=function(t){t=t||1,e.datepickerMode===d.maxMode&&1===t||e.datepickerMode===d.minMode&&-1===t||(c(d.modes[d.modes.indexOf(e.datepickerMode)+t]),e.$emit("uib:datepicker.mode"))},e.keys={13:"enter",32:"space",33:"pageup",34:"pagedown",35:"end",36:"home",37:"left",38:"up",39:"right",40:"down"};var g=function(){d.element[0].focus()};e.$on("uib:datepicker.focus",g),e.keydown=function(t){var n=e.keys[t.which];if(n&&!t.shiftKey&&!t.altKey&&!e.disabled)if(t.preventDefault(),d.shortcutPropagation||t.stopPropagation(),"enter"===n||"space"===n){if(d.isDisabled(d.activeDate))return;e.select(d.activeDate)}else!t.ctrlKey||"up"!==n&&"down"!==n?(d.handleKeyDown(n,t),d.refreshView()):e.toggleMode("up"===n?1:-1)},e.$on("$destroy",function(){for(;f.length;)f.shift()()})}]).controller("UibDaypickerController",["$scope","$element","dateFilter",function(e,t,n){function i(e,t){return 1!==t||e%4!==0||e%100===0&&e%400!==0?a[t]:29}function o(e){var t=new Date(e);t.setDate(t.getDate()+4-(t.getDay()||7));var n=t.getTime();return t.setMonth(0),t.setDate(1),Math.floor(Math.round((n-t)/864e5)/7)+1}var a=[31,28,31,30,31,30,31,31,30,31,30,31];this.step={months:1},this.element=t,this.init=function(t){angular.extend(t,this),e.showWeeks=t.showWeeks,t.refreshView()},this.getDates=function(e,t){for(var n,i=new Array(t),o=new Date(e),a=0;t>a;)n=new Date(o),i[a++]=n,o.setDate(o.getDate()+1);return i},this._refreshView=function(){var t=this.activeDate.getFullYear(),i=this.activeDate.getMonth(),a=new Date(this.activeDate);a.setFullYear(t,i,1);var r=this.startingDay-a.getDay(),l=r>0?7-r:-r,p=new Date(a);l>0&&p.setDate(-l+1);for(var s=this.getDates(p,42),u=0;42>u;u++)s[u]=angular.extend(this.createDateObject(s[u],this.formatDay),{secondary:s[u].getMonth()!==i,uid:e.uniqueId+"-"+u});e.labels=new Array(7);for(var c=0;7>c;c++)e.labels[c]={abbr:n(s[c].date,this.formatDayHeader),full:n(s[c].date,"EEEE")};if(e.title=n(this.activeDate,this.formatDayTitle),e.rows=this.split(s,7),e.showWeeks){e.weekNumbers=[];for(var d=(11-this.startingDay)%7,h=e.rows.length,m=0;h>m;m++)e.weekNumbers.push(o(e.rows[m][d].date))}},this.compare=function(e,t){var n=new Date(e.getFullYear(),e.getMonth(),e.getDate()),i=new Date(t.getFullYear(),t.getMonth(),t.getDate());return n.setFullYear(e.getFullYear()),i.setFullYear(t.getFullYear()),n-i},this.handleKeyDown=function(e){var t=this.activeDate.getDate();if("left"===e)t-=1;else if("up"===e)t-=7;else if("right"===e)t+=1;else if("down"===e)t+=7;else if("pageup"===e||"pagedown"===e){var n=this.activeDate.getMonth()+("pageup"===e?-1:1);this.activeDate.setMonth(n,1),t=Math.min(i(this.activeDate.getFullYear(),this.activeDate.getMonth()),t)}else"home"===e?t=1:"end"===e&&(t=i(this.activeDate.getFullYear(),this.activeDate.getMonth()));this.activeDate.setDate(t)}}]).controller("UibMonthpickerController",["$scope","$element","dateFilter",function(e,t,n){this.step={years:1},this.element=t,this.init=function(e){angular.extend(e,this),e.refreshView()},this._refreshView=function(){for(var t,i=new Array(12),o=this.activeDate.getFullYear(),a=0;12>a;a++)t=new Date(this.activeDate),t.setFullYear(o,a,1),i[a]=angular.extend(this.createDateObject(t,this.formatMonth),{uid:e.uniqueId+"-"+a});e.title=n(this.activeDate,this.formatMonthTitle),e.rows=this.split(i,3)},this.compare=function(e,t){var n=new Date(e.getFullYear(),e.getMonth()),i=new Date(t.getFullYear(),t.getMonth());return n.setFullYear(e.getFullYear()),i.setFullYear(t.getFullYear()),n-i},this.handleKeyDown=function(e){var t=this.activeDate.getMonth();if("left"===e)t-=1;else if("up"===e)t-=3;else if("right"===e)t+=1;else if("down"===e)t+=3;else if("pageup"===e||"pagedown"===e){var n=this.activeDate.getFullYear()+("pageup"===e?-1:1);this.activeDate.setFullYear(n)}else"home"===e?t=0:"end"===e&&(t=11);this.activeDate.setMonth(t)}}]).controller("UibYearpickerController",["$scope","$element","dateFilter",function(e,t){function n(e){return parseInt((e-1)/o,10)*o+1}var i,o;this.element=t,this.yearpickerInit=function(){i=this.yearColumns,o=this.yearRows*i,this.step={years:o}},this._refreshView=function(){for(var t,a=new Array(o),r=0,l=n(this.activeDate.getFullYear());o>r;r++)t=new Date(this.activeDate),t.setFullYear(l+r,0,1),a[r]=angular.extend(this.createDateObject(t,this.formatYear),{uid:e.uniqueId+"-"+r});e.title=[a[0].label,a[o-1].label].join(" - "),e.rows=this.split(a,i),e.columns=i},this.compare=function(e,t){return e.getFullYear()-t.getFullYear()},this.handleKeyDown=function(e){var t=this.activeDate.getFullYear();"left"===e?t-=1:"up"===e?t-=i:"right"===e?t+=1:"down"===e?t+=i:"pageup"===e||"pagedown"===e?t+=("pageup"===e?-1:1)*o:"home"===e?t=n(this.activeDate.getFullYear()):"end"===e&&(t=n(this.activeDate.getFullYear())+o-1),this.activeDate.setFullYear(t)}}]).directive("uibDatepicker",function(){return{replace:!0,templateUrl:function(e,t){return t.templateUrl||"uib/template/datepicker/datepicker.html"},scope:{datepickerOptions:"=?"},require:["uibDatepicker","^ngModel"],controller:"UibDatepickerController",controllerAs:"datepicker",link:function(e,t,n,i){var o=i[0],a=i[1];o.init(a)}}}).directive("uibDaypicker",function(){return{replace:!0,templateUrl:function(e,t){return t.templateUrl||"uib/template/datepicker/day.html"},require:["^uibDatepicker","uibDaypicker"],controller:"UibDaypickerController",link:function(e,t,n,i){var o=i[0],a=i[1];a.init(o)}}}).directive("uibMonthpicker",function(){return{replace:!0,templateUrl:function(e,t){return t.templateUrl||"uib/template/datepicker/month.html"},require:["^uibDatepicker","uibMonthpicker"],controller:"UibMonthpickerController",link:function(e,t,n,i){var o=i[0],a=i[1];a.init(o)}}}).directive("uibYearpicker",function(){return{replace:!0,templateUrl:function(e,t){return t.templateUrl||"uib/template/datepicker/year.html"},require:["^uibDatepicker","uibYearpicker"],controller:"UibYearpickerController",link:function(e,t,n,i){var o=i[0];angular.extend(o,i[1]),o.yearpickerInit(),o.refreshView()}}}),angular.module("ui.bootstrap.dateparser",[]).service("uibDateParser",["$log","$locale","dateFilter","orderByFilter",function(e,t,n,i){function o(e,t){var n=[],o=e.split(""),a=e.indexOf("'");if(a>-1){var r=!1;e=e.split("");for(var l=a;l<e.length;l++)r?("'"===e[l]&&(l+1<e.length&&"'"===e[l+1]?(e[l+1]="$",o[l+1]=""):(o[l]="",r=!1)),e[l]="$"):"'"===e[l]&&(e[l]="$",o[l]="",r=!0);e=e.join("")}return angular.forEach(h,function(i){var a=e.indexOf(i.key);if(a>-1){e=e.split(""),o[a]="("+i.regex+")",e[a]="$";for(var r=a+1,l=a+i.key.length;l>r;r++)o[r]="",e[r]="$";e=e.join(""),n.push({index:a,key:i.key,apply:i[t],matcher:i.regex})}}),{regex:new RegExp("^"+o.join("")+"$"),map:i(n,"index")}}function a(e,t,n){return 1>n?!1:1===t&&n>28?29===n&&(e%4===0&&e%100!==0||e%400===0):3===t||5===t||8===t||10===t?31>n:!0}function r(e){return parseInt(e,10)}function l(e,t){return e&&t?c(e,t):e}function p(e,t){return e&&t?c(e,t,!0):e}function s(e,t){e=e.replace(/:/g,"");var n=Date.parse("Jan 01, 1970 00:00:00 "+e)/6e4;return isNaN(n)?t:n}function u(e,t){return e=new Date(e.getTime()),e.setMinutes(e.getMinutes()+t),e}function c(e,t,n){n=n?-1:1;var i=e.getTimezoneOffset(),o=s(t,i);return u(e,n*(o-i))}var d,h,m=/[\\\^\$\*\+\?\|\[\]\(\)\.\{\}]/g;this.init=function(){d=t.id,this.parsers={},this.formatters={},h=[{key:"yyyy",regex:"\\d{4}",apply:function(e){this.year=+e},formatter:function(e){var t=new Date;return t.setFullYear(Math.abs(e.getFullYear())),n(t,"yyyy")}},{key:"yy",regex:"\\d{2}",apply:function(e){e=+e,this.year=69>e?e+2e3:e+1900},formatter:function(e){var t=new Date;return t.setFullYear(Math.abs(e.getFullYear())),n(t,"yy")}},{key:"y",regex:"\\d{1,4}",apply:function(e){this.year=+e},formatter:function(e){var t=new Date;return t.setFullYear(Math.abs(e.getFullYear())),n(t,"y")}},{key:"M!",regex:"0?[1-9]|1[0-2]",apply:function(e){this.month=e-1},formatter:function(e){var t=e.getMonth();return/^[0-9]$/.test(t)?n(e,"MM"):n(e,"M")}},{key:"MMMM",regex:t.DATETIME_FORMATS.MONTH.join("|"),apply:function(e){this.month=t.DATETIME_FORMATS.MONTH.indexOf(e)},formatter:function(e){return n(e,"MMMM")}},{key:"MMM",regex:t.DATETIME_FORMATS.SHORTMONTH.join("|"),apply:function(e){this.month=t.DATETIME_FORMATS.SHORTMONTH.indexOf(e)},formatter:function(e){return n(e,"MMM")}},{key:"MM",regex:"0[1-9]|1[0-2]",apply:function(e){this.month=e-1},formatter:function(e){return n(e,"MM")}},{key:"M",regex:"[1-9]|1[0-2]",apply:function(e){this.month=e-1},formatter:function(e){return n(e,"M")}},{key:"d!",regex:"[0-2]?[0-9]{1}|3[0-1]{1}",apply:function(e){this.date=+e},formatter:function(e){var t=e.getDate();return/^[1-9]$/.test(t)?n(e,"dd"):n(e,"d")}},{key:"dd",regex:"[0-2][0-9]{1}|3[0-1]{1}",apply:function(e){this.date=+e},formatter:function(e){return n(e,"dd")}},{key:"d",regex:"[1-2]?[0-9]{1}|3[0-1]{1}",apply:function(e){this.date=+e},formatter:function(e){return n(e,"d")}},{key:"EEEE",regex:t.DATETIME_FORMATS.DAY.join("|"),formatter:function(e){return n(e,"EEEE")}},{key:"EEE",regex:t.DATETIME_FORMATS.SHORTDAY.join("|"),formatter:function(e){return n(e,"EEE")}},{key:"HH",regex:"(?:0|1)[0-9]|2[0-3]",apply:function(e){this.hours=+e},formatter:function(e){return n(e,"HH")}},{key:"hh",regex:"0[0-9]|1[0-2]",apply:function(e){this.hours=+e},formatter:function(e){return n(e,"hh")}},{key:"H",regex:"1?[0-9]|2[0-3]",apply:function(e){this.hours=+e},formatter:function(e){return n(e,"H")}},{key:"h",regex:"[0-9]|1[0-2]",apply:function(e){this.hours=+e},formatter:function(e){return n(e,"h")}},{key:"mm",regex:"[0-5][0-9]",apply:function(e){this.minutes=+e},formatter:function(e){return n(e,"mm")}},{key:"m",regex:"[0-9]|[1-5][0-9]",apply:function(e){this.minutes=+e},formatter:function(e){return n(e,"m")}},{key:"sss",regex:"[0-9][0-9][0-9]",apply:function(e){this.milliseconds=+e},formatter:function(e){return n(e,"sss")}},{key:"ss",regex:"[0-5][0-9]",apply:function(e){this.seconds=+e},formatter:function(e){return n(e,"ss")}},{key:"s",regex:"[0-9]|[1-5][0-9]",apply:function(e){this.seconds=+e},formatter:function(e){return n(e,"s")}},{key:"a",regex:t.DATETIME_FORMATS.AMPMS.join("|"),apply:function(e){12===this.hours&&(this.hours=0),"PM"===e&&(this.hours+=12)},formatter:function(e){return n(e,"a")}},{key:"Z",regex:"[+-]\\d{4}",apply:function(e){var t=e.match(/([+-])(\d{2})(\d{2})/),n=t[1],i=t[2],o=t[3];this.hours+=r(n+i),this.minutes+=r(n+o)},formatter:function(e){return n(e,"Z")}},{key:"ww",regex:"[0-4][0-9]|5[0-3]",formatter:function(e){return n(e,"ww")}},{key:"w",regex:"[0-9]|[1-4][0-9]|5[0-3]",formatter:function(e){return n(e,"w")}},{key:"GGGG",regex:t.DATETIME_FORMATS.ERANAMES.join("|").replace(/\s/g,"\\s"),formatter:function(e){return n(e,"GGGG")}},{key:"GGG",regex:t.DATETIME_FORMATS.ERAS.join("|"),formatter:function(e){return n(e,"GGG")}},{key:"GG",regex:t.DATETIME_FORMATS.ERAS.join("|"),formatter:function(e){return n(e,"GG")}},{key:"G",regex:t.DATETIME_FORMATS.ERAS.join("|"),formatter:function(e){return n(e,"G")}}]},this.init(),this.filter=function(e,n){if(!angular.isDate(e)||isNaN(e)||!n)return"";n=t.DATETIME_FORMATS[n]||n,t.id!==d&&this.init(),this.formatters[n]||(this.formatters[n]=o(n,"formatter"));var i=this.formatters[n],a=i.map,r=n;return a.reduce(function(t,n,i){var o=r.match(new RegExp("(.*)"+n.key));o&&angular.isString(o[1])&&(t+=o[1],r=r.replace(o[1]+n.key,""));var l=i===a.length-1?r:"";return n.apply?t+n.apply.call(null,e)+l:t+l},"")},this.parse=function(n,i,r){if(!angular.isString(n)||!i)return n;i=t.DATETIME_FORMATS[i]||i,i=i.replace(m,"\\$&"),t.id!==d&&this.init(),this.parsers[i]||(this.parsers[i]=o(i,"apply"));var l=this.parsers[i],p=l.regex,s=l.map,u=n.match(p),c=!1;if(u&&u.length){var h,f;angular.isDate(r)&&!isNaN(r.getTime())?h={year:r.getFullYear(),month:r.getMonth(),date:r.getDate(),hours:r.getHours(),minutes:r.getMinutes(),seconds:r.getSeconds(),milliseconds:r.getMilliseconds()}:(r&&e.warn("dateparser:","baseDate is not a valid date"),h={year:1900,month:0,date:1,hours:0,minutes:0,seconds:0,milliseconds:0});for(var g=1,b=u.length;b>g;g++){var v=s[g-1];"Z"===v.matcher&&(c=!0),v.apply&&v.apply.call(h,u[g])}var y=c?Date.prototype.setUTCFullYear:Date.prototype.setFullYear,w=c?Date.prototype.setUTCHours:Date.prototype.setHours;return a(h.year,h.month,h.date)&&(!angular.isDate(r)||isNaN(r.getTime())||c?(f=new Date(0),y.call(f,h.year,h.month,h.date),w.call(f,h.hours||0,h.minutes||0,h.seconds||0,h.milliseconds||0)):(f=new Date(r),y.call(f,h.year,h.month,h.date),w.call(f,h.hours,h.minutes,h.seconds,h.milliseconds))),f}},this.toTimezone=l,this.fromTimezone=p,this.timezoneToOffset=s,this.addDateMinutes=u,this.convertTimezoneToLocal=c}]),angular.module("ui.bootstrap.isClass",[]).directive("uibIsClass",["$animate",function(e){var t=/^\s*([\s\S]+?)\s+on\s+([\s\S]+?)\s*$/,n=/^\s*([\s\S]+?)\s+for\s+([\s\S]+?)\s*$/;return{restrict:"A",compile:function(i,o){function a(e,t){p.push(e),s.push({scope:e,element:t}),m.forEach(function(t){r(t,e)}),e.$on("$destroy",l)}function r(t,i){var o=t.match(n),a=i.$eval(o[1]),r=o[2],l=u[t];if(!l){var p=function(t){var n=null;s.some(function(e){var i=e.scope.$eval(d);return i===t?(n=e,!0):void 0}),l.lastActivated!==n&&(l.lastActivated&&e.removeClass(l.lastActivated.element,a),n&&e.addClass(n.element,a),l.lastActivated=n)};u[t]=l={lastActivated:null,scope:i,watchFn:p,compareWithExp:r,watcher:i.$watch(r,p)}}l.watchFn(i.$eval(r))}function l(e){var t=e.targetScope,n=p.indexOf(t);if(p.splice(n,1),s.splice(n,1),p.length){var i=p[0];angular.forEach(u,function(e){e.scope===t&&(e.watcher=i.$watch(e.compareWithExp,e.watchFn),e.scope=i)})}else u={}}var p=[],s=[],u={},c=o.uibIsClass.match(t),d=c[2],h=c[1],m=h.split(",");return a}}}]),angular.module("uib/template/timepicker/timepicker.html",[]).run(["$templateCache",function(e){e.put("uib/template/timepicker/timepicker.html",'<table class="uib-timepicker">\n  <tbody>\n    <tr class="text-center" ng-show="::showSpinners">\n      <td class="uib-increment hours"><a ng-click="incrementHours()" ng-class="{disabled: noIncrementHours()}" class="btn btn-link" ng-disabled="noIncrementHours()" tabindex="{{::tabindex}}"><span class="glyphicon glyphicon-chevron-up"></span></a></td>\n      <td>&nbsp;</td>\n      <td class="uib-increment minutes"><a ng-click="incrementMinutes()" ng-class="{disabled: noIncrementMinutes()}" class="btn btn-link" ng-disabled="noIncrementMinutes()" tabindex="{{::tabindex}}"><span class="glyphicon glyphicon-chevron-up"></span></a></td>\n      <td ng-show="showSeconds">&nbsp;</td>\n      <td ng-show="showSeconds" class="uib-increment seconds"><a ng-click="incrementSeconds()" ng-class="{disabled: noIncrementSeconds()}" class="btn btn-link" ng-disabled="noIncrementSeconds()" tabindex="{{::tabindex}}"><span class="glyphicon glyphicon-chevron-up"></span></a></td>\n      <td ng-show="showMeridian"></td>\n    </tr>\n    <tr>\n      <td class="form-group uib-time hours" ng-class="{\'has-error\': invalidHours}">\n        <input type="text" placeholder="HH" ng-model="hours" ng-change="updateHours()" class="form-control text-center" ng-readonly="::readonlyInput" maxlength="2" tabindex="{{::tabindex}}" ng-disabled="noIncrementHours()" ng-blur="blur()">\n      </td>\n      <td class="uib-separator">:</td>\n      <td class="form-group uib-time minutes" ng-class="{\'has-error\': invalidMinutes}">\n        <input type="text" placeholder="MM" ng-model="minutes" ng-change="updateMinutes()" class="form-control text-center" ng-readonly="::readonlyInput" maxlength="2" tabindex="{{::tabindex}}" ng-disabled="noIncrementMinutes()" ng-blur="blur()">\n      </td>\n      <td ng-show="showSeconds" class="uib-separator">:</td>\n      <td class="form-group uib-time seconds" ng-class="{\'has-error\': invalidSeconds}" ng-show="showSeconds">\n        <input type="text" placeholder="SS" ng-model="seconds" ng-change="updateSeconds()" class="form-control text-center" ng-readonly="readonlyInput" maxlength="2" tabindex="{{::tabindex}}" ng-disabled="noIncrementSeconds()" ng-blur="blur()">\n      </td>\n      <td ng-show="showMeridian" class="uib-time am-pm"><button type="button" ng-class="{disabled: noToggleMeridian()}" class="btn btn-default text-center" ng-click="toggleMeridian()" ng-disabled="noToggleMeridian()" tabindex="{{::tabindex}}">{{meridian}}</button></td>\n    </tr>\n    <tr class="text-center" ng-show="::showSpinners">\n      <td class="uib-decrement hours"><a ng-click="decrementHours()" ng-class="{disabled: noDecrementHours()}" class="btn btn-link" ng-disabled="noDecrementHours()" tabindex="{{::tabindex}}"><span class="glyphicon glyphicon-chevron-down"></span></a></td>\n      <td>&nbsp;</td>\n      <td class="uib-decrement minutes"><a ng-click="decrementMinutes()" ng-class="{disabled: noDecrementMinutes()}" class="btn btn-link" ng-disabled="noDecrementMinutes()" tabindex="{{::tabindex}}"><span class="glyphicon glyphicon-chevron-down"></span></a></td>\n      <td ng-show="showSeconds">&nbsp;</td>\n      <td ng-show="showSeconds" class="uib-decrement seconds"><a ng-click="decrementSeconds()" ng-class="{disabled: noDecrementSeconds()}" class="btn btn-link" ng-disabled="noDecrementSeconds()" tabindex="{{::tabindex}}"><span class="glyphicon glyphicon-chevron-down"></span></a></td>\n      <td ng-show="showMeridian"></td>\n    </tr>\n  </tbody>\n</table>\n')}]),angular.module("uib/template/typeahead/typeahead-match.html",[]).run(["$templateCache",function(e){e.put("uib/template/typeahead/typeahead-match.html",'<a href\n   tabindex="-1"\n   ng-bind-html="match.label | uibTypeaheadHighlight:query"\n   ng-attr-title="{{match.label}}"></a>\n')}]),angular.module("uib/template/typeahead/typeahead-popup.html",[]).run(["$templateCache",function(e){e.put("uib/template/typeahead/typeahead-popup.html",'<ul class="dropdown-menu" ng-show="isOpen() && !moveInProgress" ng-style="{top: position().top+\'px\', left: position().left+\'px\'}" role="listbox" aria-hidden="{{!isOpen()}}">\n    <li ng-repeat="match in matches track by $index" ng-class="{active: isActive($index) }" ng-mouseenter="selectActive($index)" ng-click="selectMatch($index, $event)" role="option" id="{{::match.id}}">\n        <div uib-typeahead-match index="$index" match="match" query="query" template-url="templateUrl"></div>\n    </li>\n</ul>\n')}]),angular.module("uib/template/tooltip/tooltip-html-popup.html",[]).run(["$templateCache",function(e){e.put("uib/template/tooltip/tooltip-html-popup.html",'<div class="tooltip"\n  tooltip-animation-class="fade"\n  uib-tooltip-classes\n  ng-class="{ in: isOpen() }">\n  <div class="tooltip-arrow"></div>\n  <div class="tooltip-inner" ng-bind-html="contentExp()"></div>\n</div>\n')}]),angular.module("uib/template/tooltip/tooltip-popup.html",[]).run(["$templateCache",function(e){e.put("uib/template/tooltip/tooltip-popup.html",'<div class="tooltip"\n  tooltip-animation-class="fade"\n  uib-tooltip-classes\n  ng-class="{ in: isOpen() }">\n  <div class="tooltip-arrow"></div>\n  <div class="tooltip-inner" ng-bind="content"></div>\n</div>\n')}]),angular.module("uib/template/tooltip/tooltip-template-popup.html",[]).run(["$templateCache",function(e){e.put("uib/template/tooltip/tooltip-template-popup.html",'<div class="tooltip"\n  tooltip-animation-class="fade"\n  uib-tooltip-classes\n  ng-class="{ in: isOpen() }">\n  <div class="tooltip-arrow"></div>\n  <div class="tooltip-inner"\n    uib-tooltip-template-transclude="contentExp()"\n    tooltip-template-transclude-scope="originScope()"></div>\n</div>\n')}]),angular.module("uib/template/popover/popover-html.html",[]).run(["$templateCache",function(e){e.put("uib/template/popover/popover-html.html",'<div class="popover"\n  tooltip-animation-class="fade"\n  uib-tooltip-classes\n  ng-class="{ in: isOpen() }">\n  <div class="arrow"></div>\n\n  <div class="popover-inner">\n      <h3 class="popover-title" ng-bind="uibTitle" ng-if="uibTitle"></h3>\n      <div class="popover-content" ng-bind-html="contentExp()"></div>\n  </div>\n</div>\n')}]),angular.module("uib/template/popover/popover-template.html",[]).run(["$templateCache",function(e){e.put("uib/template/popover/popover-template.html",'<div class="popover"\n  tooltip-animation-class="fade"\n  uib-tooltip-classes\n  ng-class="{ in: isOpen() }">\n  <div class="arrow"></div>\n\n  <div class="popover-inner">\n      <h3 class="popover-title" ng-bind="uibTitle" ng-if="uibTitle"></h3>\n      <div class="popover-content"\n        uib-tooltip-template-transclude="contentExp()"\n        tooltip-template-transclude-scope="originScope()"></div>\n  </div>\n</div>\n')}]),angular.module("uib/template/popover/popover.html",[]).run(["$templateCache",function(e){e.put("uib/template/popover/popover.html",'<div class="popover"\n  tooltip-animation-class="fade"\n  uib-tooltip-classes\n  ng-class="{ in: isOpen() }">\n  <div class="arrow"></div>\n\n  <div class="popover-inner">\n      <h3 class="popover-title" ng-bind="uibTitle" ng-if="uibTitle"></h3>\n      <div class="popover-content" ng-bind="content"></div>\n  </div>\n</div>\n')}]),angular.module("uib/template/datepicker/datepicker.html",[]).run(["$templateCache",function(e){e.put("uib/template/datepicker/datepicker.html",'<div class="uib-datepicker" ng-switch="datepickerMode" role="application" ng-keydown="keydown($event)">\n  <uib-daypicker ng-switch-when="day" tabindex="0"></uib-daypicker>\n  <uib-monthpicker ng-switch-when="month" tabindex="0"></uib-monthpicker>\n  <uib-yearpicker ng-switch-when="year" tabindex="0"></uib-yearpicker>\n</div>\n')}]),angular.module("uib/template/datepicker/day.html",[]).run(["$templateCache",function(e){e.put("uib/template/datepicker/day.html",'<table class="uib-daypicker" role="grid" aria-labelledby="{{::uniqueId}}-title" aria-activedescendant="{{activeDateId}}">\n  <thead>\n    <tr>\n      <th><button type="button" class="btn btn-default btn-sm pull-left uib-left" ng-click="move(-1)" tabindex="-1"><i class="glyphicon glyphicon-chevron-left"></i></button></th>\n      <th colspan="{{::5 + showWeeks}}"><button id="{{::uniqueId}}-title" role="heading" aria-live="assertive" aria-atomic="true" type="button" class="btn btn-default btn-sm uib-title" ng-click="toggleMode()" ng-disabled="datepickerMode === maxMode" tabindex="-1"><strong>{{title}}</strong></button></th>\n      <th><button type="button" class="btn btn-default btn-sm pull-right uib-right" ng-click="move(1)" tabindex="-1"><i class="glyphicon glyphicon-chevron-right"></i></button></th>\n    </tr>\n    <tr>\n      <th ng-if="showWeeks" class="text-center"></th>\n      <th ng-repeat="label in ::labels track by $index" class="text-center"><small aria-label="{{::label.full}}">{{::label.abbr}}</small></th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr class="uib-weeks" ng-repeat="row in rows track by $index">\n      <td ng-if="showWeeks" class="text-center h6"><em>{{ weekNumbers[$index] }}</em></td>\n      <td ng-repeat="dt in row" class="uib-day text-center" role="gridcell"\n        id="{{::dt.uid}}"\n        ng-class="::dt.customClass">\n        <button type="button" class="btn btn-default btn-sm"\n          uib-is-class="\n            \'btn-info\' for selectedDt,\n            \'active\' for activeDt\n            on dt"\n          ng-click="select(dt.date)"\n          ng-disabled="::dt.disabled"\n          tabindex="-1"><span ng-class="::{\'text-muted\': dt.secondary, \'text-info\': dt.current}">{{::dt.label}}</span></button>\n      </td>\n    </tr>\n  </tbody>\n</table>\n')}]),angular.module("uib/template/datepicker/month.html",[]).run(["$templateCache",function(e){e.put("uib/template/datepicker/month.html",'<table class="uib-monthpicker" role="grid" aria-labelledby="{{::uniqueId}}-title" aria-activedescendant="{{activeDateId}}">\n  <thead>\n    <tr>\n      <th><button type="button" class="btn btn-default btn-sm pull-left uib-left" ng-click="move(-1)" tabindex="-1"><i class="glyphicon glyphicon-chevron-left"></i></button></th>\n      <th><button id="{{::uniqueId}}-title" role="heading" aria-live="assertive" aria-atomic="true" type="button" class="btn btn-default btn-sm uib-title" ng-click="toggleMode()" ng-disabled="datepickerMode === maxMode" tabindex="-1"><strong>{{title}}</strong></button></th>\n      <th><button type="button" class="btn btn-default btn-sm pull-right uib-right" ng-click="move(1)" tabindex="-1"><i class="glyphicon glyphicon-chevron-right"></i></button></th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr class="uib-months" ng-repeat="row in rows track by $index">\n      <td ng-repeat="dt in row" class="uib-month text-center" role="gridcell"\n        id="{{::dt.uid}}"\n        ng-class="::dt.customClass">\n        <button type="button" class="btn btn-default"\n          uib-is-class="\n            \'btn-info\' for selectedDt,\n            \'active\' for activeDt\n            on dt"\n          ng-click="select(dt.date)"\n          ng-disabled="::dt.disabled"\n          tabindex="-1"><span ng-class="::{\'text-info\': dt.current}">{{::dt.label}}</span></button>\n      </td>\n    </tr>\n  </tbody>\n</table>\n')}]),angular.module("uib/template/datepicker/year.html",[]).run(["$templateCache",function(e){e.put("uib/template/datepicker/year.html",'<table class="uib-yearpicker" role="grid" aria-labelledby="{{::uniqueId}}-title" aria-activedescendant="{{activeDateId}}">\n  <thead>\n    <tr>\n      <th><button type="button" class="btn btn-default btn-sm pull-left uib-left" ng-click="move(-1)" tabindex="-1"><i class="glyphicon glyphicon-chevron-left"></i></button></th>\n      <th colspan="{{::columns - 2}}"><button id="{{::uniqueId}}-title" role="heading" aria-live="assertive" aria-atomic="true" type="button" class="btn btn-default btn-sm uib-title" ng-click="toggleMode()" ng-disabled="datepickerMode === maxMode" tabindex="-1"><strong>{{title}}</strong></button></th>\n      <th><button type="button" class="btn btn-default btn-sm pull-right uib-right" ng-click="move(1)" tabindex="-1"><i class="glyphicon glyphicon-chevron-right"></i></button></th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr class="uib-years" ng-repeat="row in rows track by $index">\n      <td ng-repeat="dt in row" class="uib-year text-center" role="gridcell"\n        id="{{::dt.uid}}"\n        ng-class="::dt.customClass">\n        <button type="button" class="btn btn-default"\n          uib-is-class="\n            \'btn-info\' for selectedDt,\n            \'active\' for activeDt\n            on dt"\n          ng-click="select(dt.date)"\n          ng-disabled="::dt.disabled"\n          tabindex="-1"><span ng-class="::{\'text-info\': dt.current}">{{::dt.label}}</span></button>\n      </td>\n    </tr>\n  </tbody>\n</table>\n')
}]),angular.module("ui.bootstrap.timepicker").run(function(){!angular.$$csp().noInlineStyle&&!angular.$$uibTimepickerCss&&angular.element(document).find("head").prepend('<style type="text/css">.uib-time input{width:50px;}</style>'),angular.$$uibTimepickerCss=!0}),angular.module("ui.bootstrap.typeahead").run(function(){!angular.$$csp().noInlineStyle&&!angular.$$uibTypeaheadCss&&angular.element(document).find("head").prepend('<style type="text/css">[uib-typeahead-popup].dropdown-menu{display:block;}</style>'),angular.$$uibTypeaheadCss=!0}),angular.module("ui.bootstrap.position").run(function(){!angular.$$csp().noInlineStyle&&!angular.$$uibPositionCss&&angular.element(document).find("head").prepend('<style type="text/css">.uib-position-measure{display:block !important;visibility:hidden !important;position:absolute !important;top:-9999px !important;left:-9999px !important;}.uib-position-scrollbar-measure{position:absolute !important;top:-9999px !important;width:50px !important;height:50px !important;overflow:scroll !important;}.uib-position-body-scrollbar-measure{overflow:scroll !important;}</style>'),angular.$$uibPositionCss=!0}),angular.module("ui.bootstrap.tooltip").run(function(){!angular.$$csp().noInlineStyle&&!angular.$$uibTooltipCss&&angular.element(document).find("head").prepend('<style type="text/css">[uib-tooltip-popup].tooltip.top-left > .tooltip-arrow,[uib-tooltip-popup].tooltip.top-right > .tooltip-arrow,[uib-tooltip-popup].tooltip.bottom-left > .tooltip-arrow,[uib-tooltip-popup].tooltip.bottom-right > .tooltip-arrow,[uib-tooltip-popup].tooltip.left-top > .tooltip-arrow,[uib-tooltip-popup].tooltip.left-bottom > .tooltip-arrow,[uib-tooltip-popup].tooltip.right-top > .tooltip-arrow,[uib-tooltip-popup].tooltip.right-bottom > .tooltip-arrow,[uib-tooltip-html-popup].tooltip.top-left > .tooltip-arrow,[uib-tooltip-html-popup].tooltip.top-right > .tooltip-arrow,[uib-tooltip-html-popup].tooltip.bottom-left > .tooltip-arrow,[uib-tooltip-html-popup].tooltip.bottom-right > .tooltip-arrow,[uib-tooltip-html-popup].tooltip.left-top > .tooltip-arrow,[uib-tooltip-html-popup].tooltip.left-bottom > .tooltip-arrow,[uib-tooltip-html-popup].tooltip.right-top > .tooltip-arrow,[uib-tooltip-html-popup].tooltip.right-bottom > .tooltip-arrow,[uib-tooltip-template-popup].tooltip.top-left > .tooltip-arrow,[uib-tooltip-template-popup].tooltip.top-right > .tooltip-arrow,[uib-tooltip-template-popup].tooltip.bottom-left > .tooltip-arrow,[uib-tooltip-template-popup].tooltip.bottom-right > .tooltip-arrow,[uib-tooltip-template-popup].tooltip.left-top > .tooltip-arrow,[uib-tooltip-template-popup].tooltip.left-bottom > .tooltip-arrow,[uib-tooltip-template-popup].tooltip.right-top > .tooltip-arrow,[uib-tooltip-template-popup].tooltip.right-bottom > .tooltip-arrow,[uib-popover-popup].popover.top-left > .arrow,[uib-popover-popup].popover.top-right > .arrow,[uib-popover-popup].popover.bottom-left > .arrow,[uib-popover-popup].popover.bottom-right > .arrow,[uib-popover-popup].popover.left-top > .arrow,[uib-popover-popup].popover.left-bottom > .arrow,[uib-popover-popup].popover.right-top > .arrow,[uib-popover-popup].popover.right-bottom > .arrow,[uib-popover-html-popup].popover.top-left > .arrow,[uib-popover-html-popup].popover.top-right > .arrow,[uib-popover-html-popup].popover.bottom-left > .arrow,[uib-popover-html-popup].popover.bottom-right > .arrow,[uib-popover-html-popup].popover.left-top > .arrow,[uib-popover-html-popup].popover.left-bottom > .arrow,[uib-popover-html-popup].popover.right-top > .arrow,[uib-popover-html-popup].popover.right-bottom > .arrow,[uib-popover-template-popup].popover.top-left > .arrow,[uib-popover-template-popup].popover.top-right > .arrow,[uib-popover-template-popup].popover.bottom-left > .arrow,[uib-popover-template-popup].popover.bottom-right > .arrow,[uib-popover-template-popup].popover.left-top > .arrow,[uib-popover-template-popup].popover.left-bottom > .arrow,[uib-popover-template-popup].popover.right-top > .arrow,[uib-popover-template-popup].popover.right-bottom > .arrow{top:auto;bottom:auto;left:auto;right:auto;margin:0;}[uib-popover-popup].popover,[uib-popover-html-popup].popover,[uib-popover-template-popup].popover{display:block !important;}</style>'),angular.$$uibTooltipCss=!0}),angular.module("ui.bootstrap.datepicker").run(function(){!angular.$$csp().noInlineStyle&&!angular.$$uibDatepickerCss&&angular.element(document).find("head").prepend('<style type="text/css">.uib-datepicker .uib-title{width:100%;}.uib-day button,.uib-month button,.uib-year button{min-width:100%;}.uib-left,.uib-right{width:100%}</style>'),angular.$$uibDatepickerCss=!0});
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