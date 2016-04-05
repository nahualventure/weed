(function(angular) {
  'use strict';

  angular.module('weed.common', ['weed.core'])
    .directive('weClose', weClose)
    .directive('weOpen', weOpen)
    .directive('weToggle', weToggle)
    .directive('weEscClose', weEscClose)
    .directive('weSwipeClose', weSwipeClose)
    .directive('weHardToggle', weHardToggle)
    .directive('weCloseAll', weCloseAll)
    .directive('weFillHeight', weFillHeight)
  ;

  // Dependency injection
  weClose.$inject = ['WeedApi'];
  weOpen.$inject = ['WeedApi'];
  weToggle.$inject = ['WeedApi'];
  weEscClose.$inject = ['WeedApi'];
  weSwipeClose.$inject = ['WeedApi'];
  weHardToggle.$inject = ['WeedApi'];
  weCloseAll.$inject = ['WeedApi'];
  weFillHeight.$inject = ['$window', '$document', '$timeout'];

  function weClose(weedApi) {
    var directive = {
      restrict: 'A',
      link: link
    };

    return directive;

    function link(scope, element, attrs) {
      var targetId = '';
      if (attrs.weClose) {
        targetId = attrs.weClose;
      } else {
        var parentElement= false;
        var tempElement = element.parent();
        //find parent modal
        while(parentElement === false) {
          if(tempElement[0].nodeName == 'BODY') {
            parentElement = '';
          }

          if(typeof tempElement.attr('we-closable') !== 'undefined' && tempElement.attr('we-closable') !== false) {
            parentElement = tempElement;
          }

          tempElement = tempElement.parent();
        }
        targetId = parentElement.attr('id');
      }
      element.on('click', function(e) {
        weedApi.publish(targetId, 'close');
        e.preventDefault();
      });
    }
  }

  function weOpen(weedApi) {
    var directive = {
      restrict: 'A',
      link: link
    };

    return directive;

    function link(scope, element, attrs) {
      element.on('click', function(e) {
        weedApi.publish(attrs.weOpen, 'open');
        e.preventDefault();
      });
    }
  }

  function weToggle(weedApi) {
    var directive = {
      restrict: 'A',
      link: link
    }

    return directive;

    function link(scope, element, attrs) {
      element.on('click', function(e) {
        weedApi.publish(attrs.weToggle, 'toggle');
        e.preventDefault();
      });
    }
  }

  function weEscClose(weedApi) {
    var directive = {
      restrict: 'A',
      link: link
    };

    return directive;

    function link(scope, element, attrs) {
      element.on('keyup', function(e) {
        if (e.keyCode === 27) {
          weedApi.closeActiveElements();
        }
        e.preventDefault();
      });
    }
  }

  function weSwipeClose(weedApi) {
    var directive = {
      restrict: 'A',
      link: link
    };
    return directive;

    function link($scope, element, attrs) {
      var swipeDirection;
      var hammerElem;
      if (typeof(Hammer)!=='undefined') {
        hammerElem = new Hammer(element[0]);
        // set the options for swipe (to make them a bit more forgiving in detection)
        hammerElem.get('swipe').set({
          direction: Hammer.DIRECTION_ALL,
          threshold: 5, // this is how far the swipe has to travel
          velocity: 0.5 // and this is how fast the swipe must travel
        });
      }
      // detect what direction the directive is pointing
      switch (attrs.weSwipeClose) {
        case 'right':
          swipeDirection = 'swiperight';
          break;
        case 'left':
          swipeDirection = 'swipeleft';
          break;
        case 'up':
          swipeDirection = 'swipeup';
          break;
        case 'down':
          swipeDirection = 'swipedown';
          break;
        default:
          swipeDirection = 'swipe';
      }
      if(typeof(hammerElem) !== 'undefined'){
        hammerElem.on(swipeDirection, function() {
          weedApi.publish(attrs.id, 'close');
        });
      }
    }
  }

  function weHardToggle(weedApi) {
    var directive = {
      restrict: 'A',
      link: link
    };

    return directive;

    function link(scope, element, attrs) {
      element.on('click', function(e) {
        weedApi.closeActiveElements({exclude: attrs.weHardToggle});
        weedApi.publish(attrs.weHardToggle, 'toggle');
        e.preventDefault();
      });
    }
  }

  function weCloseAll(weedApi) {
    var directive = {
      restrict: 'A',
      link: link
    };

    return directive;

    function link(scope, element, attrs) {
      element.on('click', function(e) {
        var tar = e.target;
        var avoid = ['we-toggle', 'we-hard-toggle', 'we-open', 'we-close'].filter(function(e, i){
          return e in tar.attributes;
        });

        if(avoid.length > 0){ return; }

        var activeElements = document.querySelectorAll('.is-active[we-closable]');

        if(activeElements.length && !activeElements[0].hasAttribute('we-ignore-all-close')){
          if(getParentsUntil(tar, 'we-closable') === false){
            e.preventDefault();
            weedApi.publish(activeElements[0].id, 'close');
          }
        }
        return;
      });
    }
    /** special thanks to Chris Ferdinandi for this solution.
     * http://gomakethings.com/climbing-up-and-down-the-dom-tree-with-vanilla-javascript/
     */
    function getParentsUntil(elem, parent) {
      for ( ; elem && elem !== document.body; elem = elem.parentNode ) {
        if(elem.hasAttribute(parent)){
          if(elem.classList.contains('is-active')){ return elem; }
          break;
        }
      }
      return false;
    }
  }

  function weFillHeight($window, $document, $timeout){
    return {
      restrict: 'A',
      scope: {
        footerElementId: '@',
        additionalPadding: '@',
        debounceWait: '@'
      },
      link: function (scope, element, attrs) {
        if (scope.debounceWait === 0) {
          angular.element($window).on('resize', windowResize);
        } else {
          // allow debounce wait time to be passed in.
          // if not passed in, default to a reasonable 250ms
          angular.element($window).on('resize', debounce(onWindowResize, scope.debounceWait || 250));
        }

        onWindowResize();

        // returns a fn that will trigger 'time' amount after it stops getting called.
        function debounce(fn, time) {
          var timeout;
          // every time this returned fn is called, it clears and re-sets the timeout
          return function() {
            var context = this;
            // set args so we can access it inside of inner function
            var args = arguments;
            var later = function() {
              timeout = null;
              fn.apply(context, args);
            };
            $timeout.cancel(timeout);
            timeout = $timeout(later, time);
          };
        }

        function onWindowResize() {
          var footerElement = angular.element($document[0].getElementById(scope.footerElementId));
          var footerElementHeight;

          if (footerElement.length === 1) {
              footerElementHeight = footerElement[0].offsetHeight
                    + getTopMarginAndBorderHeight(footerElement)
                    + getBottomMarginAndBorderHeight(footerElement);
          } else {
              footerElementHeight = 0;
          }

          var elementOffsetTop = element[0].offsetTop;
          var elementBottomMarginAndBorderHeight = getBottomMarginAndBorderHeight(element);

          var additionalPadding = scope.additionalPadding || 0;

          var elementHeight = $window.innerHeight
                              - elementOffsetTop
                              - elementBottomMarginAndBorderHeight
                              - footerElementHeight
                              - additionalPadding;
          element.css('height', elementHeight + 'px');
        }

        function getTopMarginAndBorderHeight(element) {
          var footerTopMarginHeight = getCssNumeric(element, 'margin-top');
          var footerTopBorderHeight = getCssNumeric(element, 'border-top-width');
          return footerTopMarginHeight + footerTopBorderHeight;
        }

        function getBottomMarginAndBorderHeight(element) {
          var footerBottomMarginHeight = getCssNumeric(element, 'margin-bottom');
          var footerBottomBorderHeight = getCssNumeric(element, 'border-bottom-width');
          return footerBottomMarginHeight + footerBottomBorderHeight;
        }

        function getCssNumeric(element, propertyName) {
          return parseInt(element.css(propertyName), 10) || 0;
        }
      }
    };
  }
})(angular);