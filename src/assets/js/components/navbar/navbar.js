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
    .directive('weNavbar', navbarDirective)
    .directive('weNavbarElement', navbarElementDirective)
    .directive('weNavbarMainAction', navbarMainActionDirective);

  // No dependencies

  function navbarDirective(){
    return {
      restrict: 'E',
      link: function(){
        var body = angular.element(document.querySelector('body'));
        body.addClass('with-navbar');
      },
      templateUrl: 'components/navbar/navbar.html',
      transclude: true,
      replace: true
    }
  }

  function navbarElementDirective(){
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
        placeholder: '@',
        userPicture: '@',
        userRole: '@'
      },
      link: function(scope, elem, attrs, controllers, $transclude){
        // Check if there is text
        $transclude(function(clone){
          scope.hasText = clone.length > 0;
        });
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
          case 'user':
            template = 'navbarElementUser.html'
            break;
          default:
            template = 'navbarElement.html'
        }
        return 'components/navbar/' + template;
      }
    };
  }

  function navbarMainActionDirective() {
    return {
      restrict: 'E',
      transclude: true,
      scope: {
        icon: '@'
      },
      templateUrl: 'components/navbar/navbar_element_main_action.html'
    };
  }
})(angular);