/**
 * @ngdoc function
 * @name weed.directive: weNavbar
 * @description
 * # navbarDirective
 * Directive of the app
 */
'use strict';

var weed = angular.module('weed');

weed.directive('weNavbarMainAction', ['CONFIG', function(CONFIG) {
  return {
    restrict: 'E',
    transclude: true,
    // replace: true,
    scope: {
      icon: '@'
    },
    templateUrl: CONFIG.templatesPath + 'navbar/navbar_element_main_action.html',
    link: function(scope, elem, attrs) {

    }

  };
}])
