// Depends on angular
// Depends on angular animate

'use strict';

var weed = angular.module('weed', [
    // 'ngAnimate',
    // 'ngRoute'


]);

weed.constant('CONFIG', {
    templatesPath: '/templates/'
});

/**
 * @ngdoc function
 * @name weed.directive: weNavbar
 * @description
 * # navbarDirective
 * Directive of the app
 * TODO: to-load, button-groups
 */
'use strict';
var weed = angular.module('weed');

weed.directive('weButton', ['CONFIG', function(CONFIG) {
  return {
    restrict: 'A',
    transclude: true,
    replace: true,
    scope: {
        icon: '@',
        type: '@',
        toload: '@',
        size: '@',
        state: '@'
    },
    require: '?^weInput',
    templateUrl: 'components/button/button.html',
    link: function(scope, elem, attrs, weInputCtrl, $transclude) {
      $transclude(function(clone){
        scope.hasText = clone.length > 0;
      });
    }
  };
}]);

/**
 * @ngdoc function
 * @name weed.directive: weNavbar
 * @description
 * # navbarDirective
 * Directive of the app
 * Depends upon weIcon
 */
'use strict';
var weed = angular.module('weed');

weed.directive('weInput', ['CONFIG', function(CONFIG) {
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
/**
 * @ngdoc function
 * @name weed.directive: weIcon
 * @description
 * # Directive to import icons
 * Directive of the app
 */

'use strict';

var weedapp = angular.module('weed');

weed.directive('weIcon', ['CONFIG', function(CONFIG) {
  return {
    restrict: 'E',
    scope: {
      icon: '@'
    },
    replace: true,
    templateUrl: 'components/icons/icon.html',
    link: function(scope, elem, attrs) {}
  };
}]);


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

weed.directive('weNavbarElement', ['CONFIG', function(CONFIG) {
  return {
    restrict: 'A',
    transclude: true,
    scope: {
      position: '@',
      type: '@',
      icon: '@',
      logotype: '@',
      isotype: '@',
      placeholder: '@'
    },
    templateUrl: function(elem, attrs) {
      var template = '';
      switch (attrs.type) {
        case 'link':
          template = 'navbar_element_link.html';
          break;
        case 'logo':
          template = 'navbar_element_logo.html';
          break;
        case 'search-form':
          template = 'navbar_element_search_form.html';
          break;
        case 'separator':
          template = 'navbar_element_separator.html'
          break;
      }
      return 'components/navbar/' + template;
    }
  };
}]);

/**
 * @ngdoc function
 * @name weed.directive: weNavbar
 * @description
 * # navbarDirective
 * Directive of the app
 */
'use strict';

var weed = angular.module('weed');

weed.directive('weNavbarMainAction', ['CONFIG', function(CONFIG) {
  return {
    restrict: 'E',
    transclude: true,
    scope: {
      icon: '@'
    },
    templateUrl: 'components/navbar/navbar_element_main_action.html'
  };
}])
