$(function() {

    var json = {},
        payload = {},
        output = $('#output');

    $('#custom').on('submit', function(event) {
        event.preventDefault();

        var json = $('#json').val(),
            payload = JSON.parse(json);

        $('input[name="tests"]:checked').each(function() {
            switch($(this).val()) {
                case 'total_time':
                    output.text(calculateTotalTime(payload, true) + ' minutes');
                    break;
                case 'total_time_month':
                    output.text(calculateTotalTime(payload, false) + ' minutes');
                    break;
                case 'last_crash_date':
                    output.text(getLastCrashDate(payload.data.days));
                    break;
                case 'all_crashes':
                    output.text(getTotalNumberOfCrashes('all', payload));
                    break;
                case 'all_crashes_month':
                    output.text(getTotalNumberOfCrashes('month', payload));
                    break;
                case 'bookmarks':
                    output.text(getBookmarksTotal(payload.data.days));
                    break;
                case 'sessions':
                    output.text(getSessionsCount(payload));
                    break;
            }
        });
    });
});
