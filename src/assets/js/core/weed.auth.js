(function(angular){
  'use strict';

  angular
    .module('weed.auth.jwt', ['weed.core'])
    .service('weedJWTAuthService', weedJWTAuthService)
    .factory('weedJWTInterceptor', weedJWTInterceptor);

  // Dependency injections
  weedJWTAuthService.$inject = ['$window', '$http', '$filter'];
  weedJWTInterceptor.$inject = ['$injector'];

  function weedJWTAuthService($window, $http, $filter) {
    var vm = this,
        apiData = {},
        objectFilter = $filter('filter');

    // Service Utilites

    // Parses a token
    function parseJwt(token) {
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

    // Generate local storage api token identifier
    function getLocalJWTId(apiId){
      return [apiId, '_', 'jwt'].join('');
    }

    // Saves a token
    function saveTokenForApi(apiId, token) {
      $window.localStorage[getLocalJWTId(apiId)] = token;
    }

    // Saves user data returned by login endpoint
    function saveUserDataForApi(apiId, token){
      apiData[apiId].user = parseJwt(token);
      return apiData[apiId].user;
    }

    // Given an api and a route, builds the fully described route
    function buildRoute(apiId, route){
      return [apiData[apiId].url, route].join('/');
    }

    function handleToken(apiId, route, data){
      var api = apiData[apiId],
          fRoute = buildRoute(apiId, route);

      return $http.post(fRoute, data)
        .success(function(data){
          if(data.token){

            // Saves locallly the token for given api
            saveTokenForApi(apiId, data.token);

            // saves locally the user for the given api
            saveUserDataForApi(apiId, data.token);
          }
        }
      );
    }


    // Public Interface

    //TODO: update documentation
    vm.addNewApi = function(api) {
      var defaults = {
        refreshUntilMissing: 86400, // one day
        user: {},
        loginRoute: 'token-auth/',
        refreshRoute: 'token-refresh/'
      };

      // Api data init
      apiData[api.id] = angular.extend({}, defaults, api);
    }

    // TODO: update documentation
    vm.getTokenInApi = function(apiId) {
      return $window.localStorage[getLocalJWTId(apiId)];
    }

    //TODO: update documentation
    vm.isAuthenticated = function(apiId) {
      var token = vm.getTokenInApi(apiId);
      if (token) {
        var params = parseJwt(token);
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

      return handleToken(
        apiId,
        apiData[apiId].loginRoute,
        data
      );
    }

    //TODO: update documentation
    vm.refreshToken = function(apiId) {

      return handleToken (
        apiId,
        apiData[apiId].refreshRoute,
        {
          token: vm.getTokenInApi(apiId)
        }
      );
    }

    // TODO: check if save state on server needed
    vm.logout = function(apiId) {
      $window.localStorage.removeItem(getLocalJWTId(apiId));
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

  //TODO
  function weedJWTInterceptor($injector) {
    return {
      // Automatically attach Authorization header
      request: function(config) {
        // Delay injection
        var weedJWTAuthService = $injector.get('weedJWTAuthService'),

            // Find if the current request URL is of any of our JWT apis
            api = weedJWTAuthService.getApiForURL(config.url),

            // Token declaration
            token;

        // If an api was found
        if(api){

          // Fetch token from local storage
          token = weedJWTAuthService.getTokenInApi(api.id);

          // If there is token
          if (token) {

            // Add to header
            config.headers.Authorization = 'Bearer' + token;
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