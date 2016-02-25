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
    .directive('weButton', buttonDirective);

  // No dependency injections

  function buttonDirective(){
    return {
      restrict: 'A',
      transclude: true,
      replace: true,
      scope: {
          icon: '@',
          type: '@',
          toload: '&?',
          size: '@',
          state: '@'
      },
      templateUrl: 'components/button/button.html',
      link: buttonLink
    };
  }

  function buttonLink(scope, elem, attrs, controllers, $transclude) {
    var buttonCurrentWidth,
        buttonCurrentHeight,
        loaderWidth,
        oLoader;

    // Check if there is text
    $transclude(function(clone){
      scope.hasText = clone.length > 0;
    });

    // If load behavior attached
    if(scope.toload){
      elem.on('click', function(e){

        // If yet not loading
        if(!scope.loading){

          // Try to get a defer from toload attribute
          var promise = scope.$apply(scope.toload);

          // If it's a promise
          if(promise.then){
            promise.then(
              function(data){

                // On success, set loading false
                scope.loading = false;
              },
              function(data){

                // On failure, set loading false
                scope.loading = false;
              }
            );
          }

          scope.loading = true;

          // Refresh bindings
          scope.$apply();

          // Sizing utilities
          buttonCurrentWidth = elem[0].clientWidth;
          buttonCurrentHeight = elem[0].clientHeight;
          loaderWidth = buttonCurrentHeight / 5.0;

          // Fetch loader
          oLoader = angular.element(elem[0].querySelector('.loader'));

          // Set loader position
          oLoader.css('left', (buttonCurrentWidth - loaderWidth)/2.0);
        }
      });
    }
  }

})(angular);