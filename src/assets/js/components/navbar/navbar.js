/**
 * @ngdoc function
 * @name weed.directive: weNavbar
 * @description
 * # navbarDirective
 * Directive of the app
 * Depends upon weInputWrapper
 */

(function(angular){
  'use strict';

  angular.module('weed.navbar', ['weed.core'])
    .directive('weNavbarElement', function(){
      return {
        restrict: 'A',
        transclude: true,
        replace: true,
        scope: {
          position: '@',
          type: '@',
          icon: '@',
          logotype: '@',
          isotype: '@',
          placeholder: '@'
        },
        templateUrl: function(elem, attrs) {
          var template = '';
          switch (attrs.type) {
            case 'link':
              template = 'navbarElementLink.html';
              break;
            case 'logo':
              template = 'navbarElementLogo.html';
              break;
            case 'separator':
              template = 'navbarElementSeparator.html'
              break;
            default:
              template = 'navbarElement.html'
          }
          return 'components/navbar/' + template;
        }
      };
    });
})(angular);