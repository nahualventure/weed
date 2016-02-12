/**
 * @ngdoc function
 * @name weed.directive: weNavbar
 * @description
 * # navbarDirective
 * Directive of the app
 */
'use strict';
var weed = angular.module('weed');

weed.directive('weButton', ['CONFIG', function(CONFIG) {
  return {
    restrict: 'A',
    transclude: true,
    scope: {
        icon: '@',
        type: '@',
        toload: '@',
        size: '@',
        state: '@'
    },
    templateUrl: CONFIG.templatesPath + 'button/button.html',
    link: function(scope, elem, attrs, ctrl, $transclude) {
      $transclude(function(clone){
        scope.hasText = clone.length > 0;
      });
    }
  };
}]);
