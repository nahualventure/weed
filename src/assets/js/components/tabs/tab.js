/**
 * @ngdoc function
 * @name weed.directive: weTab
 * @description
 * # navbarDirective
 * Directive of the app
 * TODO: to-load, button-groups
 */

(function(angular){
  'use strict';

  angular.module('weed.tabs', ['weed.core'])
    .directive('weTab', function() {
      return {
        restrict: 'A',
        transclude: true,
        replace: true,
        scope: {
          heading: '@',
          icon: '@'
        },
        templateUrl: 'components/tabs/tab.html',
        require: '^weTabset',
        link: function(scope, elem, attr, tabsetCtrl) {
          scope.active = false;
          tabsetCtrl.addTab(scope);
        }
      };
    });

})(angular);