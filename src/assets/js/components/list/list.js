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

  angular.module('weed.list', ['weed.core'])
      .directive('weList', listDirective);

  // No dependency injections

  function listDirective(){
    return {
      restrict: 'A',
      transclude: true,
      scope: {
        icon: '@',
        color: '@',
        size: '@',
        selectable: '@',
        componentPosition: '@',
        state: '@'
      },
      replace: true,
      templateUrl: 'components/list/list.html',
      link: listLink
    };
  }

  function listLink(scope, elem, attrs, controllers, $transclude) {
    var item = elem.find('.list-item');
    item.on("click", function(){
      this.active = false;
      item.active = true;
      item.$apply();
    });
    if (scope.selectable){
      item.selectable = true;
    }
  }

})(angular);