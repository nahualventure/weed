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
        boolValue: '='
      },
      controller: knobController,
      controllerAs: 'ctrl',
      bindToController: true
    };

    function knobController(){
      var vm = this;

      vm.toggleBoolValue = function(){
        console.log("llega");
        vm.boolValue = !vm.boolValue;
      }
    }
  };

})(angular);