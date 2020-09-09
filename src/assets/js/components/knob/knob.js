/**
 * @ngdoc function
 * @name weed.directive: weIcon
 * @description
 * # Directive to import icons
 * Directive of the app
 */

(function(angular){
  'use strict';

  angular.module('weed.knob', ['weed.knob'])
    .directive('weKnob', iconDirective);

  // No dependencies

  function iconDirective() {
    return {
      restrict: 'A',
      replace: true,
      templateUrl: 'components/knob/knob.html',
      scope: {
        boolValue: '=',
        onChange: '&?',
        size: '@',
        isDisabled: '=?'
      },
      controller: knobController,
      controllerAs: 'ctrl',
      bindToController: true
    };

    function knobController($timeout){
      var vm = this;

      vm.toggleBoolValue = function(){
        if (vm.isDisabled) {
          return;
        }

        vm.boolValue = !vm.boolValue;
        $timeout(function() {
          if (vm.onChange) {
            vm.onChange();
          }
        }, 0);
      }
    }
  }

})(angular);
