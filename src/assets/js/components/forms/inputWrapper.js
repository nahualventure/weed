/**
 * @ngdoc function
 * @name weed.directive: weNavbar
 * @description
 * # navbarDirective
 * Directive of the app
 * Depends upon weIcon
 */

(function(angular){
  'use strict';

  angular.module('weed')
    .directive('weInputWrapper', function(){
      return {
        restrict: 'A',
        transclude: true,
        scope: {
            rightIcon: '@',
            leftIcon: '@',
            componentPosition: '@',
            size: '@',
            placeholder: '@'
        },
        replace: true,
        templateUrl: 'components/forms/inputWrapper.html'
      };
    });
})(angular);