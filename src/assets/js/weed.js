(function(angular){
  'use strict';

  angular.module(
    'weed', [
      'weed.core',
      'weed.auth',
      'weed.common',
      'weed.button',
      'weed.icon',
      'weed.forms',
      'weed.navbar',
      'weed.popup',
      'weed.tabs',
      'weed.sidebar'
    ])
    .constant('weed.config', {});
})(angular);