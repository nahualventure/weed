/**
 * @ngdoc function
 * @name weed.directive: weNavbar
 * @description
 * # navbarDirective
 * Directive of the app
 * TODO: to-load, button-groups
 */
'use strict';
var weed = angular.module('weed');

weed.directive('weButton', ['CONFIG', function(CONFIG) {
  return {
    restrict: 'A',
    transclude: true,
    replace: true,
    scope: {
        icon: '@',
        type: '@',
        toload: '@',
        size: '@',
        state: '@'
    },
    require: '?^weInput',
    templateUrl: 'components/button/button.html',
    link: function(scope, elem, attrs, weInputCtrl, $transclude) {
      $transclude(function(clone){
        scope.hasText = clone.length > 0;
      });
    }
  };
}]);
