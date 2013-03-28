var payload = null,
    prefs = null;

// Converts the day passed to a Date object and checks
// whether the current month is equal to the month of the
// day argument passed.
var isCurrentMonth = function(day) {
    var currentMonth = new Date().getMonth() + 1,
        thisDate = new Date(day).getMonth() + 1;

    return thisDate === currentMonth ? true : false;
},
// Gets all dates from the object, sort in ascending order
// and returns the new array.
sortDates = function(days) {
    var dates = [];

    // Gather up all of the dates
    for(var day in days) {
        if(days.hasOwnProperty(day)) {
            dates.push(day);
        }
    }
    // Sort the dates and then reverse the sort order to have
    // the dates from latest to oldest.
    return dates.sort().reverse();
},
calculateTotalTime = function(healthreport, historically) {
    var days = healthreport.data.days,
        totalTimeOpen = parseInt(healthreport.data.last['org.mozilla.appSessions.current'].totalTime, 10);

    for(var day in days) {
        if(days.hasOwnProperty(day)) {
            var monthCondition = isCurrentMonth(day) && typeof days[day]['org.mozilla.appSessions.previous'] !== 'undefined',
                historicalCondition = typeof days[day]['org.mozilla.appSessions.previous'] !== 'undefined',
                // Whether the function is called for the grand historical total or only for this month,
                // will determine the condition used in the below 'if' statement.
                activeCondition = historically ? historicalCondition : monthCondition;

            // Only total up values for the current month
            // Only proceed if we have appSessions data. 
            if(activeCondition) {

                var cleanTotalTimeArray = days[day]['org.mozilla.appSessions.previous'].cleanTotalTime,
                    abortedTotalTimeArray = days[day]['org.mozilla.appSessions.previous'].abortedTotalTime;

                // All sessions will not always have a cleanTotalTime for a day so, ensure it is not
                // undefined before iterating.
                if(typeof cleanTotalTimeArray !== 'undefined') {
                    // cleanTotalTime is an array and we need to add all of the totals together.
                    for(var cleanTotalTime in cleanTotalTimeArray) {
                        if(cleanTotalTimeArray.hasOwnProperty(cleanTotalTime)) {
                            totalTimeOpen += parseInt(cleanTotalTimeArray[cleanTotalTime], 10);
                        }
                    }
                }

                // All sessions will not always have a abortedTotalTime for a day so, ensure it is not
                // undefined before iterating.
                if(typeof abortedTotalTimeArray !== 'undefined') {
                    // cleanTotalTime is an array and we need to add all of the totals together.
                    for(var abortedTotalTime in abortedTotalTimeArray) {
                        if(abortedTotalTimeArray.hasOwnProperty(abortedTotalTime)) {
                            totalTimeOpen += parseInt(abortedTotalTimeArray[abortedTotalTime], 10);
                        }
                    }
                }
            }
        }
    }
    // Return time in minutes.
    return Math.round(totalTimeOpen / (1000*60));
},
getLastCrashDate = function(days) {
    var sortedDates = sortDates(days),
        lastCrashDate = 'No crashes recorded';

    // Loop through the dates from latest to eldest.
    for(var day in sortedDates) {
        if(sortedDates.hasOwnProperty(day)) {
            var currentDay = sortedDates[day];
            // If the current day has an entry for crashes, use this day for
            // the last crash date, break and return.
            if(typeof days[currentDay]['org.mozilla.crashes.crashes'] !== 'undefined') {
                lastCrashDate = currentDay;
                break;
            }
        }
    }
    return lastCrashDate;
},
getBookmarksTotal = function(days) {
    var sortedDates = sortDates(days),
        bookmarksTotal = 0;

    // Loop through the dates from latest to eldest.
    for(var day in sortedDates) {
        if(sortedDates.hasOwnProperty(day)) {
            var currentDay = sortedDates[day],
                places = days[currentDay]['org.mozilla.places.places'];

            if(typeof places !== 'undefined') {
                bookmarksTotal = places.bookmarks;
            }
        }
    }
    return bookmarksTotal;
},
// Calculate the total number of crashes for this month or,
// for all time.
getTotalNumberOfCrashes = function(days) {
    var crashesTotal = 0;

    for(var day in days) {
        if(days.hasOwnProperty(day)) {
            var crashes = days[day]['org.mozilla.crashes.crashes'];

            // If the current day has an entry for crashes, get in deeper
            // and look for the pending and submitted entries and total up.
            if(typeof crashes !== 'undefined') {
                // Do we have pending crashes
                if(typeof crashes.pending !== 'undefined') {
                    crashesTotal += crashes.pending;
                }

                // Do we have submitted crashes
                if(typeof crashes.submitted !== 'undefined') {
                    crashesTotal += crashes.submitted;
                }
            }
        }
    }
    return crashesTotal;
},
// Returns an addonsState object indicating the number of addons that are
// either enabled or disabled.
// @healthreport The JSON
// @type The type of addon to collect information about. Possible values are:
//       extension and plugin
getAddonStats = function(healthreport, type) {
    var addons = healthreport.data.last['org.mozilla.addons.active'],
        addonStats = {
            enabled: 0,
            disabled: 0
        };

    for(var addon in addons) {
        if(addons.hasOwnProperty(addon)) {
            var currentAddon = addons[addon];
            // Only total addons of the type specified
            // If this addon has either been disabled by the user or by
            // the app, increment the value of disable by 1.
            if(currentAddon.type === type &&
                (currentAddon.userDisabled || currentAddon.appDisabled)) {
                ++addonStats.disabled;
            // We are here just checking that we much the addon type.
            // In the previous 'if' we already determined that neither
            // currentAddon.userDisabled nor currentAddon.appDisabled is true
            // so we can safely assume here that both, the above is false.
            } else if(currentAddon.type === type) {
                ++addonStats.enabled;
            }
        }
    }
    return addonStats;
};

// Populates the front end templates located in index.html
var populateData = function(healthreport) {

    // Get all containers for the data
    var vitalStatsValueContainers = $('#vital_stats .statsBoxSection-value'),
        currentMonthValueContainers = $('#current_month .statsBoxSection-value'),
        addonsValueContainers = $('#addons .statsBoxSection-value'),
        pluginValuesContainer = $('#plugins .statsBoxSection-value'),
        vitalStats = [],
        thisMonth = [],
        addons = [],
        plugins = [],
        extensionsInfo = getAddonStats(healthreport, 'extension'),
        pluginsInfo = getAddonStats(healthreport, 'plugin');

    // Create all of the needed data arrays.
    vitalStats.push(healthreport.geckoAppInfo.platformVersion);
    vitalStats.push(calculateTotalTime(healthreport, true) + ' minutes');
    vitalStats.push(getLastCrashDate(healthreport.data.days));
    vitalStats.push(getBookmarksTotal(healthreport.data.days));

    thisMonth.push(calculateTotalTime(healthreport, false) + ' minutes');
    thisMonth.push(getTotalNumberOfCrashes(healthreport.data.days));

    addons.push(extensionsInfo.enabled);
    addons.push(extensionsInfo.disabled);

    plugins.push(pluginsInfo.enabled);
    plugins.push(pluginsInfo.disabled);

    // Populate vital statistics
    vitalStatsValueContainers.each(function(index) {
        $(this).text(vitalStats[index]);
    });

    // Populate data for this month
    currentMonthValueContainers.each(function(index) {
        $(this).text(thisMonth[index]);
    });

    // Populate data for addons
    addonsValueContainers.each(function(index) {
        $(this).text(addons[index]);
    });

    // Populate data for plugins
    pluginValuesContainer.each(function(index) {
        $(this).text(plugins[index]);
    });
};

function init() {
  window.addEventListener("message", receiveMessage, false);
  reqPrefs();
  reqPayload();
}

function receiveMessage(event) {
  switch (event.data.type) {
    case "prefs":
        prefs = event.data.content;
        if(prefs.enabled) {
            showStatusPanel($(".enabledPanel"), true, false);
        } else {
            showStatusPanel($(".disabledPanel"), false, false);
        }
        break;
    case "payload":
      payload = JSON.parse(event.data.content);
      populateData(payload);
      document.querySelector(".rawdata-display pre").textContent = JSON.stringify(payload, null, 2);
      break;
  }
}

function disableSubmission() {
    sendToBrowser("DisableDataSubmission");
}
function enableSubmission() {
    sendToBrowser("EnableDataSubmission");
}
function reqPrefs() {
  sendToBrowser("RequestCurrentPrefs");
}
function reqPayload() {
  sendToBrowser("RequestCurrentPayload");
}
function sendToBrowser(type) {
  var event = new CustomEvent("RemoteHealthReportCommand", {detail: {command: type}});
  document.dispatchEvent(event);
}
