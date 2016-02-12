/**
 * @ngdoc function
 * @name weed.directive: weNavbar
 * @description
 * # navbarDirective
 * Directive of the app
 */
'use strict';
var weed = angular.module('weed');

weed.directive('weInput', ['CONFIG', function(CONFIG) {
  return {
    restrict: 'E',
    scope: {
        rightIcon: '@',
        size: '@',
        placeholder: '@'
    },
    replace: true,
    templateUrl: CONFIG.templatesPath + 'forms/input.html',
    link: function(scope, elem, attrs) {
        console.log(attrs);
    }
  };
}]);
