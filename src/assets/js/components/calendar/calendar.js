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
        selectedobject: '=',
        selected: '=',
        languagec: '=',
        numberposition: '=',
        activities: '=',
        limit: '=',
        functionopenselect:'=',
        selectedobjectinside: '='
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
          scope.selectedobject = day;
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

        scope.doOnClickElement = function(elementInside){
          scope.selectedobjectinside = elementInside;
          scope.functionopenselect();
        };
      }
    };

    function _removeTime(date) {
      return date.day(0).hour(0).minute(0).second(0).millisecond(0);
    }

    function _buildMonth(scope, start, month) {
      scope.monthActivities = scope.activities()

      scope.monthActivities.then(
        function(su){
          scope.weeks = [];
          var done = false, date = start.clone(), monthIndex = date.month(), count = 0;
          while (!done) {
              scope.weeks.push({ days: _buildWeek(date.clone(), month, su) });
              date.add(1, "w");
              done = count++ > 2 && monthIndex !== date.month();
              monthIndex = date.month();
          }
        },
        function(err){
          $log.log("ERROR: ",error);
        }
      );
    }

    function _buildWeek(date, month, activities) {
      var days = [];
      for (var i = 0; i < 7; i++) {
          days.push({
              name: date.format("dd").substring(0, 1),
              number: date.date(),
              isCurrentMonth: date.month() === month.month(),
              isToday: date.isSame(new Date(), "day"),
              date: date,
              dateId: date.format("DD-MM-YYYY"),
              activities: []
          });
          for(var j = 0; j < activities.length; j++)
          {
            if(date.isSame(activities[j].date,'year') && date.isSame(activities[j].date,'month') && date.isSame(activities[j].date,'day')){
              activities[j].formatDate  = moment(activities[j].date).format("HH:mm");
              days[days.length-1].activities.push(activities[j]);
            }
          }
          date = date.clone();

          date.add(1, "d");
      }
      return days;
    }
  };

})(angular);
