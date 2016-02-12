/**
 * @ngdoc function
 * @name weed.directive: weIcon
 * @description
 * # Directive to import icons
 * Directive of the app
 */

 'use strict';

 var weedapp = angular.module('weed', [
     // 'ngAnimate'
 ]);

 weed.directive('weIcon', function() {
   return {
     restrict: 'A',
     scope: {
        icon: '@icon'
     },
     replace: true,
     templateUrl: CONFIG.templatesPath + 'icon/icon.js',
     link: function(scope, elem, attrs) {

     }

  };
 });
