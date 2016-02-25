(function(angular){
  'use strict';

  angular
    .module('weed.auth', ['weed.core'])
    .factory('authInterceptor', authInterceptor)
    .service('weedAuthService', weedAuthService)
    .config(function($httpProvider){}); //TODO

  // Dependency injections
  authInterceptor.$inject = ['weedAuthService'];
  weedAuthService.$inject = ['$window', '$http'];

  //TODO
  function authInterceptor(weedAuthService) {
    return {
      // automatically attach Authorization header
      request: function(config) {
        var token = weedAuthService.getToken();
        if (token) {
          config.headers.Authorization = 'Bearer' + token;
        }

        return config;
      },

      // If a token was sent back, save it
      response: function(res) {
        if(res.config.url.indexOf(API) === 0 && res.data.token) {
          weedAuthService.saveToken(res.data.token);
        }
        return res;
      }
    }
  }

  function weedAuthService($window, $http) {
    var vm = this,
        apiConfigs = {};

    // Service Utilites


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

    function saveToken(token) {
      $window.localStorage['jwt'] = token;
    }

    function getToken() {
      return $window.localStorage['jwt'];
    }


    // Public Interface

    //TODO: Actualizar Documentacion
    vm.addNewApi = function(id, url) {
      apiConfigs[id] = {
        url: url,
        jwt: ''
      };
    }

    vm.isAuthenticated = function() {
      var token = getToken();
      if (token) {
        var params = parseJwt(token);
        return Math.round(new Date().getTime() / 1000) < params.exp;
      }
      else {
        return false;
      }
    }
    //TODO
    vm.login = function(apiId, route, data) {
      return $http.post(apiConfigs[apiId].url, route, data);
    }

    vm.logout = function() {
      $window.localStorage.removeItem('jwt');
    }

  }

  function weedUserAuthService($http, API) {
    var vm = this;
    // add authentication methods here

    vm.register = function(){
      // register code goes in here
    }
  }

})(angular);