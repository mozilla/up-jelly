describe("DataService", function() {
  this.dataService;

  beforeEach(function() {
    module("UPDashboard");
    inject(function(dataService) {
      this.dataService = dataService;
    });
  });

  it("should populate payload data", function() {
    var data = {
      type: "pageload",
      content: {
        interestsProfile: true,
        interestsHosts: true,
        requestingSites: true,
      }
    }
    dataService._populateData(data);
    expect(dataService._interestsProfile).toBe(true);
    expect(dataService._interestsHosts).toBe(true);
    expect(dataService._requestingSites).toBe(true);
  });

  it("should change a given site's permissions", function() {
    // no content
    dataService._requestingSites = [];
    dataService._setSitePermission({site: "example.com", isBlocked: true});
    expect(dataService._requestingSites).toBeIdenticalTo([]);

    // request to change something that doesn't exist
    dataService._requestingSites = [{name: "example.com", isBlocked: false}];
    dataService._setSitePermission({site: "example2.com", isBlocked: true});
    expect(dataService._requestingSites).toBeIdenticalTo([{name: "example.com", isBlocked: false}]);

    // flipping permissions
    dataService._requestingSites = [{name: "example.com", isBlocked: false}, {name: "example2.com", isBlocked: true}];
    dataService._setSitePermission({site: "example.com", isBlocked: true});
    expect(dataService._requestingSites).toBeIdenticalTo([{name: "example.com", isBlocked: true}, {name: "example2.com", isBlocked: true}]);

  });

  it("should handle messages sent by the browser", function() {

    function dispatchMessage(data) {
      evt = new Event("message");
      evt.data = data;
      window.dispatchEvent(evt);
    }

    spyOn(dataService, "handleEvent").andCallThrough();
    spyOn(dataService.rootScope, "$broadcast").andCallThrough();

    /** first load **/
    spyOn(dataService, "reqPagePayload");
    expect(dataService._isFirstLoad).toBe(true);
    dispatchMessage({type: "prefs"});
    expect(dataService._isFirstLoad).toBe(false);
    expect(dataService.reqPagePayload).toHaveBeenCalled();

    /** prefs **/
    expect(dataService._prefs.enabled).toBe(false);

    // no change
    dispatchMessage({type: "prefs", content: {enabled: false}});
    expect(dataService.handleEvent).toHaveBeenCalled();
    expect(dataService._prefs.enabled).toBe(false);
    expect(dataService.rootScope.$broadcast).not.toHaveBeenCalled();

    // pref change
    dispatchMessage({type: "prefs", content: {enabled: true}});
    expect(dataService.handleEvent).toHaveBeenCalled();
    expect(dataService._prefs.enabled).toBe(true);
    expect(dataService.rootScope.$broadcast).toHaveBeenCalledWith("prefChanged");

    /** pageload **/
    dispatchMessage(UPTestData.payloadSample);
    expect(dataService.handleEvent).toHaveBeenCalled();
    expect(dataService.rootScope.$broadcast).toHaveBeenCalledWith("pageloadReceived");

    /** site prefs **/
    dispatchMessage({type: "sitePref", content: {site: "example.com", isBlocked: true}});
    expect(dataService.handleEvent).toHaveBeenCalled();
    expect(dataService.rootScope.$broadcast).toHaveBeenCalledWith("sitePrefReceived");
  });

  it("should send structured data to the browser", function() {
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

    // test the raw _sendToBrowser function
    dataService._sendToBrowser("Joke", "rigmarole");
    testEvent({command: "Joke", data: "rigmarole"});

    // test wrappers for sentToBrowser
    
    dataService.disableAPI();
    testEvent({command: "DisableAPI"});

    dataService.enableAPI();
    testEvent({command: "EnableAPI"});

    dataService.reqPrefs();
    testEvent({command: "RequestCurrentPrefs"});

    dataService.reqPagePayload();
    testEvent({command: "RequestCurrentPagePayload"});

    dataService.setInterestSharable("coffee", true);
    testEvent({command: "SetInterestSharable", data: ["coffee", true]});
    dataService.setInterestSharable("meetings", false);
    testEvent({command: "SetInterestSharable", data: ["meetings", false]});
    dataService.setInterestSharable("meetings");
    testEvent({command: "SetInterestSharable", data: ["meetings", undefined]});
    dataService.setInterestSharable();
    testEvent({command: "SetInterestSharable", data: [undefined, undefined]});

    dataService.disableSite();
    testEvent({command: "DisableSite"});
    dataService.disableSite("example.com");
    testEvent({command: "DisableSite", data: "example.com"});

    dataService.enableSite();
    testEvent({command: "EnableSite"});
    dataService.enableSite("example.com");
    testEvent({command: "EnableSite", data: "example.com"});
  });
});
