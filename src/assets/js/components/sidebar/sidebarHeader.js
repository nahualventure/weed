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

weed.directive('weSidebarHeader', ['CONFIG', function(CONFIG) {
  return {
    restrict: 'A',
    transclude: true,
    scope: {
      logo: '@',
      isotype: '@'
    }
    templateUrl: CONFIG.templatesPath + 'sidebar/sidebar_header.html',
    linkL function(scope, elem, attrs){

    }

  };
}]);
