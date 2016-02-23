(function(angular){
  'use strict';

  angular
    .module('weed.auth', ['weed.core'])
    .factory('authInterceptor', authInterceptor)
    .service('weedUserAuthService', weedUserAuthService)
    .service('weedAuthService', weedAuthService)
    .constant('API', 'http://127.0.0.1:8000/') // TODO: figure out what is the best way to config the base endpoint
    .config(function($httpProvider){});

  authInterceptor.$inject = ['API', 'weedAuthService'];
  weedAuthService.$inject = ['$window'];
  weedUserAuthService.$inject = ['$http', 'API'];

  function authInterceptor(API, auth) {
    return {
      // automatically attach Authorization header
      request: function(config) {
        var token = auth.getToken();
        if (config.url.indexOf(API) === 0 && token) {
          config.headers.Authorization = 'Bearer' + token;
        }

        return config;
      },

      // If a token was sent back, save it
      response: function(res) {
        if(res.config.url.indexOf(API) === 0 && res.data.token) {
          auth.saveToken(res.data.token);
        }
        return res;
      }
    }
  }

  function weedAuthService($window) {
    var self = this;

    // Add JWT methods here
    self.parseJwt = function(token) {
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

    self.saveToken = function(token) {
      $window.localStorage['jwtToken'] = token;
    }

    self.getToken = function() {
      return $window.localStorage['jwtToken'];
    }

    self.isAuthed = function() {
      var token = self.getToken();
      if (token) {
        var params = self.parseJwt(token);
        return Math.round(new Date().getTime() / 1000) < params.exp;
      }
      else {
        return false;
      }
    }

    self.logout = function() {
      $window.localStorage.removeItem('jwtToken');
    }

  }

  function weedUserAuthService($http, API) {
    var self = this;
    // add authentication methods here

    self.register = function(){
      // register code goes in here
    }

    self.login = function(username, password) {
      return $http.post(API +'token-auth/', {
        username: username,
        password: password
      })
    }
  }

})(angular);