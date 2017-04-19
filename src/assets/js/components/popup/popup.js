(function() {
  'use strict';

  angular.module('weed.popup', ['weed.core'])
    .directive('wePopup', popupDirective);

  // Weed api injection
  popupDirective.$inject = ['WeedApi'];

  function popupDirective(weedApi) {

    var body = angular.element(document.querySelector('body'));

    var directive = {
      restrict: 'A',
      transclude: true,
      scope: {
        avoidCloseOutside: '@',
        afterclose: '='
      },
      replace: true,
      link: popupLink,
      templateUrl: 'components/popup/popup.html',
      controllerAs: 'popup',
      controller: popupController
    };

    popupController.$inject = ['$scope'];

    return directive;


    function popupController($scope){
      var vm = this;

      vm.active = false;

      vm.open = function(directiveId){
        vm.active = true;
        body.addClass('with-open-popup');
        $scope.$apply();
        document.getElementById(directiveId).focus();
      }

      vm.close = function(){
        vm.active = false;
        body.removeClass('with-open-popup');
        if(typeof $scope.afterclose !== 'undefined'){
          $scope.afterclose();
        }
        $scope.$apply();
      }
    }

    // TODO: unmock this directive
    function popupLink($scope, elem, attrs, controller) {
      weedApi.subscribe(attrs.id, function(id, message){
        switch(message){
          case 'show':
          case 'open':
            controller.open(attrs.id);
            break;
          case 'hide':
          case 'close':
            controller.close();
            break;
        }
      });
    }
  }

  function popupTitle(weedApi) {

    var directive = {
      restrict: 'A',
      transclude: true,
      scope: {},
      replace: true,
      link: popupLink,
      templateUrl: 'components/popup/popupTitle.html',
    };

    return directive;

    // TODO: unmock this directive
    function popupLink($scope, elem, attrs, controller) {
      weedApi.subscribe(attrs.id, function(id, message){
        switch(message){
          case 'show':
          case 'open':
            console.log("Open(#" + id + "): " + message);
        }
      });
    }
  }
})(angular);
