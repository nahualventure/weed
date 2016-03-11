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

  angular.module('weed.toload', ['weed.core'])
    .directive('weToload', toloadDirective);

  // Dependencies
  toloadDirective.$inject = ['$parse'];

  function toloadDirective($parse){
    return {
      restrict: 'A',
      scope: {
        method: '&weToload',
        loadingClass: '@'
      },
      link: toloadLink
    };

    function toloadLink(scope, elem, attrs, controllers, $transclude) {

      var clickHandler;

      elem.on('click', function(e){

        // If yet not loading
        if(!scope.loading){

          // Mark as loading
          scope.loading = true;

          // Add loading class
          elem.addClass(scope.loadingClass);

          // Try to get a defer from toload attribute
          var promise = scope.$apply(scope.method);

          // If it's a promise
          if(promise && promise.then){
            promise.then(
              function(data){

                // On success, set loading false
                scope.loading = false;

                // Remove loading class
                elem.removeClass(scope.loadingClass);
              },
              function(data){

                // On failure, set loading false
                scope.loading = false;

                // Remove loading class
                elem.removeClass(scope.loadingClass);
              }
            );
          }
        }
      });
    }
  }

})(angular);