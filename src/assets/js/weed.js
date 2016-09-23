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
