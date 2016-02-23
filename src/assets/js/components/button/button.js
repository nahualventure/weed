/**
 * @ngdoc function
 * @name weed.directive: weNavbar
 * @description
 * # navbarDirective
 * Directive of the app
 * TODO: to-load, button-groups
 */

(function(angular){
  'use strict';

  angular.module('weed.button', ['weed.core'])
    .directive('weButton', ['$timeout', function($timeout) {
      return {
        restrict: 'A',
        transclude: true,
        replace: true,
        scope: {
            icon: '@',
            type: '@',
            toload: '@',
            size: '@',
            state: '@'
        },
        templateUrl: 'components/button/button.html',
        link: function(scope, elem, attrs, controllers, $transclude) {
          $transclude(function(clone){
            scope.hasText = clone.length > 0;
          });

          if(scope.toload){
            elem.on('click', function(e){

              if(!scope.loading){
                scope.loading = true;

                // Stablish current width
                elem[0].style.width = elem[0].clientWidth;
                $timeout(function(){
                  angular.element(elem[0]).addClass("loading");
                  elem[0].style.width = null;
                }, 10);
              }
            });
          }
        }
      };
    }]);

})(angular);