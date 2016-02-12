/**
 * @ngdoc function
 * @name weed.directive: weNavbar
 * @description
 * # navbarDirective
 * Directive of the app
 */
'use strict';

var weed = angular.module('weed');

weed.directive('weNavbarElement', ['CONFIG', function(CONFIG) {
    return {
        restrict: 'A',
        transclude: true,
        // replace: true,
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

            return CONFIG.templatesPath + 'navbar/' + template;
        },
        link: function(scope, elem, attrs) {
            var transcluded = elem.find('span').contents();
            scope.withLabel = transcluded.length > 0;
        }
    };
}]);
