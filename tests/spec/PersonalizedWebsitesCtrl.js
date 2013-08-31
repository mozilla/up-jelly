describe("Personalized Website Controller", function() {
  this.dataService;
  this.$scope;
  this.ctrl;

  function dispatchMessage(data) {
    evt = new Event("message");
    evt.data = data;
    window.dispatchEvent(evt);
  }

  beforeEach(function() {
    module("UPDashboard");
    inject(function($rootScope, $controller, dataService) {
      this.dataService = dataService;
      this.$scope = $rootScope.$new();

      ctrl = $controller("personalizedWebsitesCtrl", {
        $scope: $scope,
        dataService: dataService,
      });
    });
  });

  it("should call refresh() when a pageloadReceived & sitePrefReceived message is broadcast", function() {
    spyOn($scope, "refresh").andCallThrough();

    dataService.rootScope.$broadcast("pageloadReceived");
    expect($scope.refresh).toHaveBeenCalled();
    dataService.rootScope.$broadcast("sitePrefReceived");
    expect($scope.refresh).toHaveBeenCalled();
  });

  it("should make requesting site list when refresh() is called", function() {
    dataService._requestingSites = [
      {
        "interests": [
          "Technology",
        ],
        "isBlocked": false,
        "isPrivileged": false,
        "name": "slashdot.org"
      },
      {
        "interests": [
          "MamaMia",
        ],
        "isBlocked": true,
        "isPrivileged": false,
        "name": "foo.com"
      },
    ];

    $scope.refresh();
    expect($scope.sites).toBeIdenticalTo([
      {
        "interests": [
          "Technology",
        ],
        "isBlocked": false,
        "isPrivileged": false,
        "name": "slashdot.org",
        "isPersonalized": true,
      },
      {
        "interests": [
          "MamaMia",
        ],
        "isBlocked": true,
        "isPrivileged": false,
        "name": "foo.com",
        "isPersonalized": false,
      },
    ]);

    dataService._requestingSites = [
      {
        "interests": [
          "Technology",
        ],
        "isBlocked": false,
        "isPrivileged": false,
        "name": "slashdot.org"
      },
    ];

    $scope.refresh();
    expect($scope.sites).toBeIdenticalTo([
      {
        "interests": [
          "Technology",
        ],
        "isBlocked": false,
        "isPrivileged": false,
        "name": "slashdot.org",
        "isPersonalized": true,
      },
    ]);

    dataService._requestingSites = null
    $scope.refresh();
    expect($scope.sites.length).toBe(0);
  });

  it("should toggle site's isPersonalized flag and send appropriate events to a browser", function() {
    var eventHandler = jasmine.createSpy("eventHandler");
    window.document.addEventListener("RemoteUserProfileCommand", eventHandler, false);

    var testIndex = 0;
    function testEvent(expectedResult) {
      var evt = eventHandler.argsForCall[testIndex][0];
      expect(eventHandler).toHaveBeenCalled();
      expect(typeof(evt)).toBe("object");
      expect(evt.detail).toBeIdenticalTo(expectedResult);
      testIndex += 1;
    }

    dataService._requestingSites = [
      {
        "interests": [
          "Technology",
        ],
        "isBlocked": false,
        "isPrivileged": false,
        "name": "slashdot.org"
      },
    ];

    $scope.refresh();
    var site = $scope.sites[0];
    expect(site.isPersonalized).toBeIdenticalTo(true);

    //the site is personalized so it should become Enabled after toggle
    $scope.toggleSite(site);
    testEvent({command: "EnableSite", data: "slashdot.org"});
    expect(site.isBlocked).toBeIdenticalTo(true);

    // refresh the page which will reset site.isPersonalized flag to false
    $scope.refresh();

    // now toggle again and make sure site is disabled and blocked is false
    $scope.toggleSite(site);
    testEvent({command: "DisableSite", data: "slashdot.org"});
    expect(site.isBlocked).toBeIdenticalTo(false);
  });
});
