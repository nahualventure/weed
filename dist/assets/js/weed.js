(function(angular){
  'use strict';

  angular.module('weed', [])
    .constant('weConfig', {});
})(angular);
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

  angular.module('weed')
    .directive('weButton', function() {
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
        templateUrl: 'components/button/button.html',
        link: function(scope, elem, attrs, controllers, $transclude) {
          $transclude(function(clone){
            scope.hasText = clone.length > 0;
          });
        }
      };
    });

})(angular);
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

  angular.module('weed')
    .directive('weInputWrapper', function(){
      return {
        restrict: 'A',
        transclude: true,
        scope: {
            rightIcon: '@',
            leftIcon: '@',
            componentPosition: '@',
            size: '@',
            placeholder: '@'
        },
        replace: true,
        templateUrl: 'components/forms/inputWrapper.html'
      };
    });
})(angular);
/**
 * @ngdoc function
 * @name weed.directive: weIcon
 * @description
 * # Directive to import icons
 * Directive of the app
 */

(function(angular){
  'use strict';

  angular.module('weed')
    .directive('weIcon', function() {
      return {
        restrict: 'E',
        scope: {
          icon: '@'
        },
        replace: true,
        templateUrl: 'components/icons/icon.html',
        link: function(scope, elem, attrs) {}
      };
    });
})(angular);
/**
 * @ngdoc function
 * @name weed.directive: weNavbar
 * @description
 * # navbarDirective
 * Directive of the app
 * Depends upon weInputWrapper
 */

(function(angular){
  'use strict';

  angular.module('weed')
    .directive('weNavbarElement', function(){
      return {
        restrict: 'A',
        transclude: true,
        replace: true,
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
              template = 'navbarElementLink.html';
              break;
            case 'logo':
              template = 'navbarElementLogo.html';
              break;
            case 'separator':
              template = 'navbarElementSeparator.html'
              break;
            default:
              template = 'navbarElement.html'
          }
          return 'components/navbar/' + template;
        }
      };
    });
})(angular);
/**
 * @ngdoc function
 * @name weed.directive: weNavbar
 * @description
 * # navbarDirective
 * Directive of the app
 */

(function(angular){
  'use strict';

  angular.module('weed')
    .directive('weNavbarMainAction', function() {
      return {
        restrict: 'E',
        transclude: true,
        scope: {
          icon: '@'
        },
        templateUrl: 'components/navbar/navbar_element_main_action.html'
      };
    })
})(angular);