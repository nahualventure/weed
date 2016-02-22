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

  angular.module('weed.tabs')
    .directive('weTabset', function() {
      return {
        restrict: 'A',
        transclude: true,
        replace: true,
        scope: {
          iconPosition: '@'
        },
        templateUrl: 'components/tabs/tabset.html',
        bindToController: true,
        controllerAs: 'tabset',
        link: function($scope, iElm, iAttrs, controller) {
          console.log($scope);
        },
        controller: function() {
          var self = this;

          self.tabs = [];

          self.addTab = function addTab(tab) {
            self.tabs.push(tab);

            if(self.tabs.length === 1) {
              tab.active = true;
            }
          };

          self.select = function(selectedTab) {
            angular.forEach(self.tabs, function(tab){
              if(tab.active && tab !== selectedTab){
                tab.active = false;
              }
            });

            selectedTab.active = true;
          };
        }
      };
    });

})(angular);