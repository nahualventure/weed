/**
 * @ngdoc function
 * @name weed.directive: weListItem
 * @description
 * # navbarDirective
 * Directive of the app
 * TODO: to-load, button-groups
 */

(function(angular){
  'use strict';

  angular.module('weed.list', ['weed.core'])
      .directive('weListItem', listItemDirective);

  function listItemDirective() {
    return {
      restrict: 'A',
      transclude: true,
      replace: true,
      scope: {
        color: '@',
        url: '@'
      },
      templateUrl: 'components/list/list-item.html',
      require: '^weList',
      link: function(scope, elem, attr, listCtrl) {
        scope.active = false;
        listCtrl.addItem(scope);
        elem.on('click', function() {
          listCtrl.select(scope);
        });
      }
    };
  }

})(angular);