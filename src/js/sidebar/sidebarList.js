/**
 * @ngdoc function
 * @name weed.directive: weNavbar
 * @description
 * # navbarDirective
 * Directive of the app
 * Depends upon weInput
 */
'use strict';

var weed = angular.module('weed');

weed.directive('weSidebarLink', ['CONFIG', function(CONFIG) {
  return {
    restrict: 'A',
    transclude: true,
    scope: {
      icon: '@',
      position '@'

    }
    templateUrl: CONFIG.templatesPath + 'sidebar/sidebar_link.html',
    linkL function(scope, elem, attrs){

    }

  };
}]);
