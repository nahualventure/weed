/**
 * @ngdoc function
 * @name weed.directive: weIcon
 * @description
 * # Directive to import icons
 * Directive of the app
 */

(function(angular){
  'use strict';

  angular.module('weed.calendar', ['weed.core'])
    .directive('weCalendar', calendarDirective);


  function calendarDirective() {
    return {
      restrict: 'A',
      scope: {
        selected: '=',
        languagec: '=',
        numberposition: '='
      },
      templateUrl: 'components/calendar/calendar.html',
      link: function(scope, elem, attrs) {
        moment.locale(scope.languagec);
        scope.weekArray = moment.weekdays();
        scope.selected = moment().locale(scope.languagec);
        scope.month = scope.selected.clone();
        var start = scope.selected.clone();
        start.date(1);
        _removeTime(start.day(0));

        _buildMonth(scope, start, scope.month);

        scope.select = function(day) {
          scope.selected = day.date;
        };

        scope.next = function() {
          var next = scope.month.clone();
          _removeTime(next.month(next.month()+1)).date(1);
          scope.month.month(scope.month.month()+1);
          _buildMonth(scope, next, scope.month);
        };

        scope.previous = function() {
            var previous = scope.month.clone();
            _removeTime(previous.month(previous.month()-1).date(1));
            scope.month.month(scope.month.month()-1);
            _buildMonth(scope, previous, scope.month);
        };

        scope.today = function() {
          moment.locale(scope.languagec);
          scope.weekArray = moment.weekdays();
          scope.selected = moment().locale(scope.languagec);
          scope.month = scope.selected.clone();
          scope.month = scope.selected.clone();
          var start = scope.selected.clone();
          start.date(1);
          _removeTime(start.day(0));

          _buildMonth(scope, start, scope.month);
        };
      }
    };

    function _removeTime(date) {
      return date.day(0).hour(0).minute(0).second(0).millisecond(0);
    }

    function _buildMonth(scope, start, month) {
      scope.weeks = [];
      var done = false, date = start.clone(), monthIndex = date.month(), count = 0;
      while (!done) {
          scope.weeks.push({ days: _buildWeek(date.clone(), month) });
          date.add(1, "w");
          done = count++ > 2 && monthIndex !== date.month();
          monthIndex = date.month();
      }
    }

    function _buildWeek(date, month) {
      var days = [];
      for (var i = 0; i < 7; i++) {
          days.push({
              name: date.format("dd").substring(0, 1),
              number: date.date(),
              isCurrentMonth: date.month() === month.month(),
              isToday: date.isSame(new Date(), "day"),
              date: date,
              dateId: date.format("DD-MM-YYYY")
          });
          date = date.clone();
          console.log("------------------------------------------");
          console.log(date.format("DD-MM-YYYY"));
          console.log(moment(new Date(date._d)).format("DD-MM-YYYY"));

          date.add(1, "d");
      }
      return days;
    }
  };

})(angular);