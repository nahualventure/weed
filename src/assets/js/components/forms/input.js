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

  var weed = angular.module('weed');

  weed.directive('weInput', ['weConfig', function(weConfig){
    return {
      restrict: 'E',
      transclude: {
        buttonSlot: '?inputButton',
        buttonTagSlot: '?inputButtonTag'
      },
      scope: {
          rightIcon: '@',
          leftIcon: '@',
          buttonPosition: '@',
          size: '@',
          placeholder: '@'
      },
      replace: true,
      templateUrl: 'components/forms/input.html'
    };
  }]);
})(angular);

'use strict';
