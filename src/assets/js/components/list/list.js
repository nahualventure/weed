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

  angular.module('weed.list')
      .directive('weList', listDirective);

  // No dependency injections

  function listDirective(){
    return {
      restrict: 'A',
      transclude: true,
      replace: true,
      scope: {
        clickable: '@',
        selectable: '@',
        componentPosition: '@',
        color: '@',
        size: '@'
      },
      templateUrl: 'components/list/list.html',
      bindToController: true,
      controllerAs: 'list',
      controller: listController
    };
  }

  listController.$inject = ['$scope'];

  function listController($scope) {
    var vm = this;

    vm.items = [];

    vm.addItem = function addItem(item) {
      vm.items.push(item);
    };

    vm.select = function(selectedItem) {
      if (typeof vm.selectable !== 'undefined'){
        angular.forEach(vm.items, function(item){
          if(item.active && item !== selectedItem){
            item.active = false;
          }
        });
        selectedItem.active = true;
        $scope.$apply();
      }
    };
  }

})(angular);