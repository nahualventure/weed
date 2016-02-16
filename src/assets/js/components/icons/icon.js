/**
 * @ngdoc function
 * @name weed.directive: weIcon
 * @description
 * # Directive to import icons
 * Directive of the app
 */

'use strict';

var weedapp = angular.module('weed');

weed.directive('weIcon', ['CONFIG', function(CONFIG) {
  return {
    restrict: 'E',
    scope: {
      icon: '@'
    },
    replace: true,
    templateUrl: 'components/icons/icon.html',
    link: function(scope, elem, attrs) {}
  };
}]);
