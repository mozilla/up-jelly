var ONE_DAY = 1000 * 60 * 60 * 24,
    ONE_WEEK = ONE_DAY * 7,
    TWO_WEEKS = ONE_DAY * 14,
    THIRTY_DAYS_IN_SECONDS = 2592000,
    PAINT_TIME_THRESHOLD = 300000,
    payload = null,
    prefs = null,
    // Is this the first load for the document?
    isFirstLoad = true;

// Converts the day passed to a Date object and checks
// whether the current month is equal to the month of the
// day argument passed.
var isCurrentMonth = function(day) {
    var currentMonth = new Date().getMonth() + 1,
        thisDate = new Date(day).getMonth() + 1;

    return thisDate === currentMonth ? true : false;
},
// Gets all dates from the object, sort in the specified
// oder and returns the new array.
sortDates = function(days, descending) {
    var dates = [];

    // Gather up all of the dates
    for(var day in days) {
        if(days.hasOwnProperty(day)) {
            dates.push(day);
        }
    }
    return descending ? dates.sort().reverse() : dates.sort();
},
// Returns the total open time
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
                            // Parse total time as int
                            var thisCleanTotalTime = parseInt(cleanTotalTimeArray[cleanTotalTime], 10);

                            // If the total time is more than thirty days in seconds, we need to divide by 1000
                            // @see https://bugzilla.mozilla.org/show_bug.cgi?id=856315
                            if(thisCleanTotalTime > THIRTY_DAYS_IN_SECONDS) {
                                // Turn the milliseconds into seconds
                                totalTimeOpen += thisCleanTotalTime / 1000;
                            } else {
                                totalTimeOpen += thisCleanTotalTime;
                            }
                        }
                    }
                }

                // All sessions will not always have a abortedTotalTime for a day so, ensure it is not
                // undefined before iterating.
                if(typeof abortedTotalTimeArray !== 'undefined') {
                    // cleanTotalTime is an array and we need to add all of the totals together.
                    for(var abortedTotalTime in abortedTotalTimeArray) {
                        if(abortedTotalTimeArray.hasOwnProperty(abortedTotalTime)) {
                            // Parse total time as int
                            var thisAbortedTotalTime = parseInt(abortedTotalTimeArray[abortedTotalTime], 10);

                            // If the total time is more than thirty days in seconds, we need to divide by 1000
                            // @see https://bugzilla.mozilla.org/show_bug.cgi?id=856315
                            if(thisAbortedTotalTime > THIRTY_DAYS_IN_SECONDS) {
                                // Turn the milliseconds into seconds
                                totalTimeOpen += thisAbortedTotalTime / 1000;
                            } else {
                             totalTimeOpen += thisAbortedTotalTime;
                            }
                        }
                    }
                }
            }
        }
    }
    // Return time in minutes.
    return Math.round(totalTimeOpen / 60);
},
getLastCrashDate = function(days) {
    var sortedDates = sortDates(days, true),
        lastCrashDate = '';

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
    var sortedDates = sortDates(days, true),
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
// Total up crashes for current day.
calculateCrashesTotal = function(crashes) {
    var crashesTotal = 0;

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
    return crashesTotal;
},
// Calculate the total number of crashes for a period of time.
// Currently support week, month and all, which is the default.
getTotalNumberOfCrashes = function(period, customPayload) {
    var crashesTotal = 0,
        days = customPayload ? customPayload.data.days : payload.data.days;

    for(var day in days) {
        if(days.hasOwnProperty(day)) {
            var crashes = days[day]['org.mozilla.crashes.crashes'];

            if(period !== 'all') {
                var today = new Date(),
                    // Test whether the current date falls within the last week.
                    weekCondition = days[day] >= today - ONE_WEEK,
                    monthCondition = isCurrentMonth(day),
                    condition = period === 'week' ? weekCondition : monthCondition;

                if(condition) {
                    crashesTotal += calculateCrashesTotal(crashes);
                }
            } else {
                crashesTotal += calculateCrashesTotal(crashes);
            }
        }
    }
    return crashesTotal;
},
getSessionsCount = function(customPayload) {
    var days = customPayload ? customPayload.data.days : payload.data.days,
        cleanSessions = 0,
        abortedSessions = 0;

    for(var day in days) {
        if(days.hasOwnProperty(day)) {
            var sessionsInfo = days[day]['org.mozilla.appSessions.previous'];

            // Test whether the current day contains either session
            // or crash data. If so, increment the session count.
            if(typeof sessionsInfo !== 'undefined') {
                // If there is a cleanTotalTime entry, get it's length
                // as this indicates the number of sessions.
                if(typeof sessionsInfo.cleanTotalTime !== 'undefined') {
                    cleanSessions += sessionsInfo.cleanTotalTime.length;
                }

                // If there is an abortedTotalTime entry, get it's length
                // as this indicates the number of sessions.
                if(typeof sessionsInfo.abortedTotalTime !== 'undefined') {
                    abortedSessions += sessionsInfo.abortedTotalTime.length;
                }
            }
        }
    }

    return cleanSessions + abortedSessions;
},
// Gets all startup times (paintTimes), or the median for each day over
// the past 14 days. Data will be returned as an obejct as follows:
// graphData = {
//     dateCount: 2,
//     startupTimes: [['1360108800000', 657], ['1360108800000', 989]]
// }
getAllStartupTimes = function(median) {
    var days = payload.data.days,
        graphData = {
            dateCount: 0,
            startupTimes: []
        },
        sortedDates = sortDates(payload.data.days, false),
        today = new Date(),
        twoWeeksAgo = new Date(today - TWO_WEEKS);

    for(var day in sortedDates) {
        var currentDay = sortedDates[day],
            // For our comparison in the below 'if' statement,
            // we need currentDay as a Date object.
            currentDayAsDate = new Date(currentDay);

        // We only want to display startup times for at most the last 14 days.
        if(currentDayAsDate >= twoWeeksAgo && sortedDates.hasOwnProperty(day)) {
            var sessionsInfo = days[currentDay]['org.mozilla.appSessions.previous'],
                paintTimes = null,
                paintTimesLength = 0,
                paintTime = 0,
                startupTimesTotal = 0;

            // Test whether the current day contains either session
            // or crash data. If so, increment the session count.
            if(typeof sessionsInfo !== 'undefined') {
                paintTimes = sessionsInfo.firstPaint;
                paintTimesLength = paintTimes.length;

                // For each day for which we have data, increase the dateCount.
                ++graphData.dateCount;

                // First test whether we need to return the median startup times.
                if(median) {
                    // If we have more than one sessions paint time for the day
                    // we need to calculate the median.
                    if(paintTimesLength > 1) {
                        var divisor = paintTimesLength,
                            startupTimeMedian = 0;

                        for(paintTime in paintTimes) {
                            // If paint time is greater than our threshold or negative, ignore it as it is
                            // probably bad data @see https://bugzilla.mozilla.org/show_bug.cgi?id=856315#c30
                            if(paintTimes.hasOwnProperty(paintTime) &&
                                    (paintTimes[paintTime] > 0 && paintTimes[paintTime] < PAINT_TIME_THRESHOLD)) {
                                startupTimesTotal = startupTimesTotal + paintTimes[paintTime];
                            }
                        }
                        // Calculate the median, convert to seconds and push onto array
                        startupTimeMedian = Math.round((startupTimesTotal / divisor) / 1000);
                        graphData.startupTimes.push([new Date(currentDay).getTime(), startupTimeMedian]);
                    } else {
                        // This day only has one session, convert to seconds, no need to calculate
                        // a median.
                        if (paintTimes[paintTime] > 0 && paintTimes[paintTime] < PAINT_TIME_THRESHOLD) {
                            graphData.startupTimes.push([new Date(currentDay).getTime(), paintTimes[paintTime] / 1000]);
                        }
                    }
                } else {
                    for(paintTime in paintTimes) {
                        if (paintTimes[paintTime] > 0 && paintTimes[paintTime] < PAINT_TIME_THRESHOLD) {
                            graphData.startupTimes.push([new Date(currentDay).getTime(), paintTimes[paintTime] / 1000]);
                        }
                    }
                }
            }
        }
    }
    var latest = new Date().getTime();
    // Add one more for the current day.
    var currentPaintTime = payload.data.last['org.mozilla.appSessions.current'].firstPaint;

    if (currentPaintTime > 0 && currentPaintTime < PAINT_TIME_THRESHOLD) {
        graphData.dateCount = graphData.dateCount + 1;
        // Add the current session's startup time to the end of the array
        graphData.startupTimes.push([
            latest,
            currentPaintTime / 1000
        ]);
     }

    return graphData;
},
// This calculates our median startup time to determine whether
// we have a slow fox. For details:
// @see https://bugzilla.mozilla.org/show_bug.cgi?id=849879
calculateMedianStartupTime = function() {
    var days = payload.data.days,
        sortedDates = sortDates(days, true),
        counter = 0,
        median = 0,
        startupTimes = [];

    for(var day in sortedDates) {
        if(sortedDates.hasOwnProperty(day)) {
            var currentDay = sortedDates[day],
                sessionsInfo = days[currentDay]['org.mozilla.appSessions.previous'],
                paintTimes = null;

            // Do we have session info?
            if(typeof sessionsInfo !== 'undefined') {
                paintTimes = sessionsInfo.firstPaint;

                // We only want the latest 10 paint times,
                // and ensure that we have paint times to add.
                if(counter < 10 && typeof paintTimes !== 'undefined') {
                    for(var paintTime in paintTimes) {
                        if (paintTime > 0 && paintTime < PAINT_TIME_THRESHOLD) {
                            startupTimes.push(paintTimes[paintTime]);
                            ++counter;
                        }
                    }
                }
            }
        }
        // Sort the paint times from fastest to slowest
        startupTimes.sort().reverse();

        // Get items 7 and 8 (75th percentile), then calculate the average
        median = Math.round(((startupTimes[6]) + (startupTimes[7]) / 2));

    }
    // Covert the median to seconds before returning.
    return median / 1000;
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
    vitalStats.push(calculateTotalTime(healthreport, true) + ' min');
    vitalStats.push(getLastCrashDate(healthreport.data.days));
    vitalStats.push(getBookmarksTotal(healthreport.data.days));

    thisMonth.push(calculateTotalTime(healthreport, false) + ' min');
    thisMonth.push(getTotalNumberOfCrashes('month'));

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
}

function receiveMessage(event) {

    // If this is the initial load of the page, we are
    // only requesting prefs in init and then only once
    // the message for this is received do we ask for
    // the payload.
    if(isFirstLoad && event.data.type === 'prefs') {
        reqPayload();
        isFirstLoad = false;
    }

    // The below handles all other on demand requests for
    // prefs or payloads.
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
  try {
    document.dispatchEvent(event);
  } catch(e) {
    console.log(e);
  }
}
