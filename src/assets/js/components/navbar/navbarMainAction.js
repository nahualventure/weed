/**
 * @ngdoc function
 * @name weed.directive: weNavbar
 * @description
 * # navbarDirective
 * Directive of the app
 */

(function(angular){
  'use strict';

  angular.module('weed')
    .directive('weNavbarMainAction', function() {
      return {
        restrict: 'E',
        transclude: true,
        scope: {
          icon: '@'
        },
        templateUrl: 'components/navbar/navbar_element_main_action.html'
      };
    })
})(angular);