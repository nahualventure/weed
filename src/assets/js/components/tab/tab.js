/**
 * @ngdoc function
 * @name weed.directive: weNavbar
 * @description
 * # navbarDirective
 * Directive of the app
 * Depends upon weInput
 */
'use strict';

var weed = angular.module('weed');

weed.directive('tab', ['CONFIG', function(CONFIG) {
  return {
    restrict: 'A',
    transclude: true,
    templateUrl: CONFIG.templatesPath + 'tab/tab.html',
    scope: {
      heading: '@',
      icon: '@'
    },
    require: '^tabset',
    link: function(scope, elem, attr, tabsetCtrl) {
      scope.active = false
      tabsetCtrl.addTab(scope)
    }

  }
}]);

weed.directive('tabset', ['CONFIG', function(CONFIG) {
  return {
    restrict: 'A',
    transclude: true,
    scope: { },
    templateUrl: CONFIG.templatesPath + 'tab/tabset.html',
    bindToController: true,
    controllerAs: 'tabset',
    controller: function() {
      var self = this
      self.tabs = []
      self.addTab = function addTab(tab) {
        self.tabs.push(tab)
        if(self.tabs.length ===1) {
          tab.active = true
        }
      }
      self.select = function(selectedTab) {
        angular.forEach(self.tabs, function(tab){
          if(tab.active && tab !== selectedTab){
            tab.active = false;
          }
        })
        selectedTab.active = true;
      }
    }
  }
}]);
