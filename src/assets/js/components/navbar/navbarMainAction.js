/**
 * @ngdoc function
 * @name weed.directive: weNavbar
 * @description
 * # navbarDirective
 * Directive of the app
 */

(function(angular){
  'use strict';

  var weed = angular.module('weed');

  weed.directive('weNavbarMainAction', ['weConfig', function(weConfig) {
    return {
      restrict: 'E',
      transclude: true,
      scope: {
        icon: '@'
      },
      templateUrl: 'components/navbar/navbar_element_main_action.html'
    };
  }])
})(angular);