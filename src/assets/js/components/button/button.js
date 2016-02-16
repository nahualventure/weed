/**
 * @ngdoc function
 * @name weed.directive: weNavbar
 * @description
 * # navbarDirective
 * Directive of the app
 * TODO: to-load, button-groups
 */

(function(angular){
  'use strict';

  var weed = angular.module('weed');

  weed.directive('weButton', ['weConfig', function(weConfig) {
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

})(angular);