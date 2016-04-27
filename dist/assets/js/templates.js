angular.module("weed").run(["$templateCache",function(n){n.put("components/forms/inputWrapper.html","<div class=\"input-wrapper\" ng-class=\"\n    {\n      'input-small': size=='small',\n      'input-large': size=='large',\n      'input-tiny': size=='tiny',\n\n      'loffset-50': leftIcon !== undefined,\n      'roffset-50': rightIcon !== undefined,\n\n      'component-position-left': componentPosition === 'left',\n      'component-position-right': componentPosition === 'right'\n    }\n  \">\n  <span ng-transclude></span>\n</div>")}]);
angular.module("weed").run(["$templateCache",function(n){n.put("components/icons/icon.html",'<i class="ic ic-{{ icon }}"></i>\n')}]);
angular.module("weed").run(["$templateCache",function(n){n.put("components/button/button.html","<a class=\"button {{ state }}\"\n  ng-class=\"{\n    'button-primary': type === 'primary',\n    'button-success': type === 'success',\n    'button-warning': type === 'warning',\n    'button-danger': type === 'danger',\n    'button-info': type === 'info',\n    'button-gray': type === 'gray',\n    'button-inverse': type === 'inverse',\n\n    'button-small': size === 'small',\n    'button-large': size === 'large',\n    'button-tiny': size === 'tiny',\n\n    'only-icon': !hasText,\n    'loading': loading\n  }\">\n\n  <!-- If icon has been given -->\n"+'  <we-icon ng-show="icon !== undefined" icon="{{ icon }}"></we-icon>\n\n  <!-- Text -->\n  <span class="text" ng-if="hasText">\n    <ng-transclude></ng-transclude>\n  </span>\n\n  <!-- If it\'s loading -->\n  <div ng-if="loading" class="loader">...</div>\n</a>')}]);
angular.module("weed").run(["$templateCache",function(a){a.put("components/navbar/navbar.html",'<div class="navbar" ng-transclude></div>\n')}]);
angular.module("weed").run(["$templateCache",function(n){n.put("components/navbar/navbarElement.html","<div class=\"navbar-element\"\n  ng-class=\"{\n    'pull-left': position === 'left',\n    'pull-right': position === 'right'\n  }\" ng-transclude>\n</div>\n")}]);
angular.module("weed").run(["$templateCache",function(n){n.put("components/navbar/navbarElementLink.html",'<a class="navbar-element navbar-link" \n  ng-class="\n    {\n      \'pull-left\': position === \'left\',\n      \'pull-right\': position === \'right\'\n    }">\n\n  <span class ="navbar-element-floater">\n    <we-icon ng-if="icon !== undefined" icon="{{ icon }}"></we-icon>\n    <span ng-transclude></span>\n  </span>\n</a>\n')}]);
angular.module("weed").run(["$templateCache",function(n){n.put("components/navbar/navbarElementLogo.html",'<a class="navbar-element logo"\n  ng-class="{\n    \'pull-left\': position === \'left\',\n    \'pull-right\': position === \'right\'\n  }">\n\n  <span class="navbar-element-floater navbar-isotype"\n    style="background-image: url({{ isotype }})"></span>\n\n  <span class="navbar-element-floater navbar-logotype"\n    style="background-image: url({{ logotype }})"></span>\n</a>\n')}]);
angular.module("weed").run(["$templateCache",function(n){n.put("components/navbar/navbarElementMainAction.html",'<a class="navbar-main-action">\n  <i class="icon icon-{{ icon }}"></i>\n</a>\n')}]);
angular.module("weed").run(["$templateCache",function(a){a.put("components/navbar/navbarElementSeparator.html","<div class=\"navbar-separator\" ng-class=\"{ 'pull-left': position==='left', 'pull-right': position==='right'  }\">\n\n</div>\n")}]);
angular.module("weed").run(["$templateCache",function(n){n.put("components/navbar/navbarElementUser.html","<a class=\"navbar-element navbar-user\" \n  ng-class=\"\n    {\n      'pull-left': position === 'left',\n      'pull-right': position === 'right',\n      'no-picture': !userPicture\n    }\">\n\n  <span class=\"navbar-element-floater\">\n"+'    <img ng-attr-src="{{ userPicture }}" ng-if="userPicture" class="picture">\n\n    <span class="user" ng-if="hasText">\n      <span class="name"><ng-transclude></ng-transclude></span>\n      <span class="role">{{ userRole }}</span>\n    </span>\n\n  </span>\n</a>')}]);
angular.module("weed").run(["$templateCache",function(p){p.put("components/popup/popup.html",'<div\n  class="grid frame popup-grid-wrapper"\n  ng-class="{\'is-active\': popup.active}"\n  ng-show="popup.active"\n  we-closable>\n  <div class="popup-veil" we-close></div>\n  <div class="row middle-s">\n    <div class="col shrink">\n      <div class="popup" ng-transclude></div>\n    </div>\n  </div>\n</div>')}]);
angular.module("weed").run(["$templateCache",function(n){n.put("components/popup/popupTitle.html",'<div class="popup-title-bar">\n  <ng-transclude></ng-transclude>\n\n  <button we-close class="popup-close"></button>\n</div>')}]);
angular.module("weed").run(["$templateCache",function(e){e.put("components/sidebar/sidebar.html",'<div class="sidebar" ng-transclude></div>')}]);
angular.module("weed").run(["$templateCache",function(a){a.put("components/sidebar/sidebarHeader.html",'<a class="header">\n  <span class="sidebar-isotype"\n    style="background-image: url({{ isotype }})"></span>\n\n  <span class="sidebar-logotype"\n    style="background-image: url({{ logotype }})"></span>\n</a>')}]);
angular.module("weed").run(["$templateCache",function(n){n.put("components/sidebar/sidebarLink.html",'<a ng-class="{\n    \'sidebar-bottom-action\': position === \'bottom\'\n  }"\n  we-title="{{ title }}">\n\n  <span class="icon-container">\n    <we-icon icon="{{ icon }}"></we-icon>\n  </span>\n  <span class="center">&nbsp;</span>\n  <span class="text">\n    <ng-transclude></ng-transclude>\n  </span>\n</a>\n')}]);
angular.module("weed").run(["$templateCache",function(t){t.put("components/tabs/tab.html",'<div class="tab-content" ng-show="active" ng-transclude></div>')}]);
angular.module("weed").run(["$templateCache",function(n){n.put("components/tabs/tabset.html",'<div class="tabset" ng-class="{\'vertical-icon\': tabset.iconPosition === \'above\'}">\n  <ul class="tabs">\n    <li\n      class="tab"\n      ng-repeat="tab in tabset.tabs"\n      ng-class="{\n        \'active\': tab.active,\n        \'only-icon\': !tab.heading\n      }">\n\n      <a ng-click="tabset.select(tab)">\n        <we-icon icon="{{ tab.icon }}" ng-show="{{ tab.icon !== undefined }}"></we-icon>\n        <span ng-show="tab.heading !== undefined" class="text">{{ tab.heading }}</span>\n      </a>\n    </li>\n  </ul>\n\n  <ng-transclude>\n  </ng-transclude>\n</div>')}]);