/**
 * @ngdoc function
 * @name weed.directive: weIcon
 * @description
 * # Directive to import icons
 * Directive of the app
 */

(function(angular){
  'use strict';

  angular.module('weed.icon', ['weed.core'])
    .directive('weIcon', function() {
      return {
        restrict: 'E',
        scope: {
          icon: '@'
        },
        replace: true,
        templateUrl: 'components/icons/icon.html',
        link: function(scope, elem, attrs) {}
      };
    });
})(angular);