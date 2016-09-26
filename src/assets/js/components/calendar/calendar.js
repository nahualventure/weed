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
        selectedobjectinside: '=',
        actualmonth: '=',
        updatefunction: '=',
        doselectedclick: '=',
        popoverIsOpen: '='
      },
      templateUrl: 'components/calendar/calendar.html',
      link: function(scope, elem, attrs) {
        moment.locale(scope.languagec);
        scope.weekArray = moment.weekdays();
        scope.selected = moment().locale(scope.languagec);
        scope.month = scope.selected.clone();
        scope.actualmonth = moment();
        var start = scope.selected.clone();
        start.date(1);
        _removeTime(start.day(0));
		    scope.findToday = false;

        //scope.openPop = true;

        _buildMonth(scope, start, scope.month, scope.actualmonth);

        scope.closePopoverNow = function(day) {
          day.openPop = false;
        };

        scope.select = function(day) {
          scope.selected = day.date;
          scope.selectedobject = day;

          if(scope.comesfromtodaywatch)
          {
            scope.comesfromtodaywatch = false;
          }
          else {
            scope.doselectedclick(day);
          }
        };

        scope.manageClickMore = function(day) {
          scope.selectedobject = day;
          scope.comesfromtodaywatch = true;
          //console.log("pruebaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
        }

        scope.today = function() {
		    scope.findToday = true;
        scope.actualmonth = moment();
		    scope.selected = moment().locale(scope.languagec);
          scope.month = scope.selected.clone();
          var start = scope.selected.clone();
          start.date(1);
          _removeTime(start.day(0));

          _buildMonth(scope, start, scope.month, scope.actualmonth);

        };

        scope.next = function() {
          var next = scope.month.clone();
          scope.actualmonth = scope.actualmonth.add(1,'months');
          _removeTime(next.month(next.month()+1).date(1));
          scope.month.month(scope.month.month()+1);
          _buildMonth(scope, next, scope.month, scope.actualmonth);
        };

        scope.previous = function() {
            var previous = scope.month.clone();
            scope.actualmonth = scope.actualmonth.add(-1,'months');
            _removeTime(previous.month(previous.month()-1).date(1));
            scope.month.month(scope.month.month()-1);
            _buildMonth(scope, previous, scope.month, scope.actualmonth);
        };

        /*scope.doOnClickElement = function(elementInside){
          scope.functionopenselect(elementInside);
        };*/

        scope.updatefunction = function() {
          var dummy = scope.month.clone();
          _removeTime(dummy.month(dummy.month()).date(1));
          _buildMonth(scope, dummy, scope.month, scope.actualmonth);
        };
      }
    };

    function _removeTime(date) {
      return date.day(0).hour(0).minute(0).second(0).millisecond(0);
    }

    function _buildMonth(scope, start, month, actualmonth) {
      scope.monthActivities = scope.activities(actualmonth);

      scope.monthActivities.then(
        function(su){
          scope.weeks = [];
          for( i = 0; i < su.length ; i++) {
            su[i].meeting.fileCount =0;
            //vm.time = datetime.format('hh:mm a');
            for(var j =0; j< su[i].meeting.meetingItems.length; j++) {
              su[i].meeting.fileCount += su[i].meeting.meetingItems[j].files.length;
              su[i].meeting.dateFormat = moment(su[i].meeting.date).format('dddd D [de] MMMM [del] YYYY');
              su[i].meeting.dateFormatInput = new Date(moment(su[i].meeting.date).format('M/D/YYYY'));
              su[i].meeting.timeFormatInput = moment(su[i].meeting.date).format('H:mm a');
            }
          }
          var done = false, date = start.clone(), monthIndex = date.month(), count = 0;
          while (!done) {
              scope.weeks.push({ days: _buildWeek(date.clone(), month, su) });
              date.add(1, "w");
              done = count++ > 2 && monthIndex !== date.month();
              monthIndex = date.month();
          }
    		  if(scope.findToday) {
    		    scope.findToday = false;
      			for(var i = 0; i < scope.weeks.length; i++) {
      			  for(var j = 0; j < scope.weeks[i].days.length; j++) {
      			    if(scope.weeks[i].days[j].isToday)
        				{
                  scope.comesfromtodaywatch = true;
        				  scope.select(scope.weeks[i].days[j]);
        				  break;
        				  i = scope.weeks.length;
        				}
      			  }
      			}
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
              activities: [],
              openPop: false
          });
          for(var j = 0; j < activities.length; j++)
          {
            if(date.isSame(activities[j].meeting.date,'year') && date.isSame(activities[j].meeting.date,'month') && date.isSame(activities[j].meeting.date,'day')){
              activities[j].formatDate  = moment(activities[j].meeting.date).format("HH:mm");
              if(!activities[j].place)
              {
                activities[j].place = activities[j].meeting.place;
              }
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
