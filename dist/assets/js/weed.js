(function(angular){
  'use strict';

  var weed = angular.module('weed', []);

  weed.constant('weConfig', {});
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

  var weed = angular.module('weed');

  weed.directive('weButton', ['weConfig', function(weConfig) {
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

  var weed = angular.module('weed');

  weed.directive('weInput', ['weConfig', function(weConfig){
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
})(angular);

'use strict';

/**
 * @ngdoc function
 * @name weed.directive: weIcon
 * @description
 * # Directive to import icons
 * Directive of the app
 */

(function(angular){
  'use strict';

  var weed = angular.module('weed');

  weed.directive('weIcon', ['weConfig', function(weConfig) {
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
})(angular);
/**
 * @ngdoc function
 * @name weed.directive: weNavbar
 * @description
 * # navbarDirective
 * Directive of the app
 * Depends upon weInput
 */

(function(angular){
  'use strict';

  var weed = angular.module('weed');

  weed.directive('weNavbarElement', ['weConfig', function(weConfig){
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

  var weed = angular.module('weed');

  weed.directive('weNavbarMainAction', ['weConfig', function(weConfig) {
    return {
      restrict: 'E',
      transclude: true,
      scope: {
        icon: '@'
      },
      templateUrl: 'components/navbar/navbar_element_main_action.html'
    };
  }])
})(angular);