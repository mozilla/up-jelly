describe("Interests Profile Controller", function() {
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

      ctrl = $controller("interestsProfileCtrl", {
        $scope: $scope,
        dataService: dataService,
      });
    });
  });

  it("should call refresh() when a pageloadReceived message is broadcast", function() {
    spyOn($scope, "refresh").andCallThrough();

    dataService.rootScope.$broadcast("pageloadReceived");
    expect($scope.refresh).toHaveBeenCalled();
  });

  it("should calculate rounded scores when refresh() is called", function() {
    expect($scope.interests).toBe(null);
    dataService._interestsProfile = [
      {name: "Thing 1", score: 100},
      {name: "Thing 2", score: 95},
      {name: "Thing 3", score: 54},
      {name: "Thing 4", score: 0},
      {name: "Thing 5", score: 46},
      {name: "Thing 6", score: 31},
    ];
    $scope.refresh();
    expect($scope.interests).toBeIdenticalTo([{name: "Thing 1", score: 100, roundScore: 10}, {name: "Thing 2", score: 95, roundScore: 10}, {name: "Thing 3", score: 54, roundScore: 5}, {name: "Thing 5", score: 46, roundScore: 5}, {name: "Thing 6", score: 31, roundScore: 3}]);

    dataService._interestsProfile = [
      {name: "Thing 1", score: 95},
    ];
    $scope.refresh();
    expect($scope.interests).toBeIdenticalTo([{name: "Thing 1", score: 95, roundScore: 10}]);

    dataService._interestsProfile = null
    $scope.refresh();
    expect($scope.interests).toBe(null);
  });

  it("should update host list when an interest is selected", function() {
    //dispatchMessage(UPTestData.payloadSample);
    dataService._interestsHosts = UPTestData.payloadSample.content.interestsHosts;
    dataService._interestsProfile = UPTestData.payloadSample.content.interestsProfile;
    dataService._requestingSites = UPTestData.payloadSample.content.requestingSites;
    expect($scope.selectedInterest).toBe(null);
    expect($scope.hosts).toBe(null);

    function testInterest(interest) {
      interest = dataService._interestsProfile[0];
      $scope.updateDetailWindow(interest);
      expect($scope.hosts).toBeIdenticalTo(dataService._interestsHosts[interest.name])
      expect($scope.selectedInterest).toBeIdenticalTo(interest);
    }

    // pick the top interests and make sure the controller's host list belongs to it
    testInterest(dataService._interestsProfile[0]);
    // do it for the next one
    testInterest(dataService._interestsProfile[1]);
  });

  it("should tell the browser to update sharing status for an interest", function() {
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

    var interest = UPTestData.payloadSample.content.interestsProfile[0];

    interest.meta.sharable = false;
    $scope.updateSharable(interest);
    testEvent({command: "SetInterestSharable", data: [interest.name, false]});

    interest.meta.sharable = true;
    $scope.updateSharable(interest);
    testEvent({command: "SetInterestSharable", data: [interest.name, true]});
  });

  it("should reset selections when interest modes are toggled", function() {
    $scope.selectedInterest = "some setting";
    $scope.showMore = false;
    $scope.toggleInterestMode();
    expect($scope.selectedInterest).toBe(null);
    expect($scope.showMore).toBe(true);

    $scope.selectedInterest = "some setting";
    $scope.showMore = true;
    $scope.toggleInterestMode();
    expect($scope.selectedInterest).toBe(null);
    expect($scope.showMore).toBe(false);
  });
});
