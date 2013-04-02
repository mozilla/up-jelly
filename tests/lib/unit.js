// Load the JSON for the test

asyncTest('bookmarks', function() {

    $.getJSON('/tests/json/single_session.json', function(payload) {
        var bookmarksCount = getBookmarksTotal(payload.data.days);
        equal(bookmarksCount, 8, 'We were expecting 8 bookmarks and got ' + bookmarksCount);
        start();
    });
});
