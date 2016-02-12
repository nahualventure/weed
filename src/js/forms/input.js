/**
 * @ngdoc function
 * @name weed.directive: weNavbar
 * @description
 * # navbarDirective
 * Directive of the app
 * Depends upon weIcon
 */
'use strict';
var weed = angular.module('weed');

weed.directive('weInput', ['CONFIG', function(CONFIG) {
  return {
    restrict: 'E',
    transclude: {
      buttonSlot: '?inputButton',
      buttonTagSlot: '?inputButtonTag'
    },
    scope: {
        rightIcon: '@',
        leftIcon: '@',
        buttonPosition: '@',
        size: '@',
        placeholder: '@'
    },
    replace: true,
    templateUrl: CONFIG.templatesPath + 'forms/input.html'
  };
}]);