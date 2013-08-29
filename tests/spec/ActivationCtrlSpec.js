describe("Activation Controller", function() {

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

      ctrl = $controller("activationCtrl", {
        $scope: $scope,
        dataService: dataService,
      });
    });
  });

  it("should call refresh() when a prefChanged message is broadcast", function() {
    spyOn($scope, "refresh").andCallThrough();

    dataService.rootScope.$broadcast("prefChanged");
    expect($scope.refresh).toHaveBeenCalled();
  });

  it("should change pref settings in local scope when refresh() is called", function() {
    expect($scope.prefs).toBeIdenticalTo({enabled: false});
    dataService._prefs.enabled = true;
    $scope.refresh();
    expect($scope.prefs).toBeIdenticalTo({enabled: true});

    dataService._prefs.enabled = false;
    $scope.refresh();
    expect($scope.prefs).toBeIdenticalTo({enabled: false});
  });

  it("should tell the browser to enable/disable personalization based on local pref settings upon toggle", function() {
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

    expect($scope.prefs.enabled).toBe(false);
    $scope.toggle();
    testEvent({command: "EnableUP"});

    $scope.prefs.enabled = true;
    $scope.toggle();
    testEvent({command: "DisableUP"});
  });
});
