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

    // Generate local storage api token identifier
    function getLocalJWTId(apiId){
      return [apiId, '_', 'jwt'].join('');
    }

    // Saves a token
    function saveTokenForApi(apiId, token) {
      $window.localStorage[getLocalJWTId(apiId)] = token;
    }

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

            // Saves locallly the token for given api
            saveTokenForApi(apiId, data.token);

            // saves locally the user for the given api
            vm._saveUserDataForApi(apiId, data.token);
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
        refreshRoute: 'token-refresh/',
        autoRefresh: {
          enabled: true,
          timeDelta: 43200 // half a day
        }
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
        var params = vm._parseJwt(token);
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
        return vm._saveUserDataForApi(apiData[apiId].token);
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

    // AVOID EXTERNAL USAGE OF THE FOLLOWING SERVICES
    // We mark them as public because we need them in our JWT interceptor

    // Saves user data returned by login endpoint
    vm._saveUserDataForApi = function(apiId, token){
      apiData[apiId].user = vm._parseJwt(token);
      return apiData[apiId].user;
    }

    // Parses a token
    vm._parseJwt = function(token) {
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

  function weedJWTInterceptor($injector) {
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
          token = authService.getTokenInApi(api.id);

          // Decrypt userData from token
          userData = authService._parseJwt(token);

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
                console.log("Token automatically refreshed");
                api.autoRefresh.enabled = true;
              })
              .error(function(d){
                console.log("Unable to refresh token atomatically");
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