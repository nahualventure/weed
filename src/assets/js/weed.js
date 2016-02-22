(function(angular){
  'use strict';

  angular.module(
    'weed', [
      'weed.core',
      'weed.common',
      'weed.button',
      'weed.icon',
      'weed.forms',
      'weed.navbar',
      'weed.popup',
      'weed.tabs'
    ])
    .constant('weed.config', {});
})(angular);