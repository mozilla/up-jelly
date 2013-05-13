"use strict";

var DataService = function($window, $rootScope) {
  this.window = $window;
  this.rootScope = $rootScope;
  this.window.addEventListener("message", this, false);
  this._prefs = {enabled: false};
  this._isFirstLoad = true;
  this._payload = null;
  this._message = "";
}


DataService.prototype = {

  ////////////////////////////////////////////////////////////////////////////////
  //// Data transmission

  handleEvent: function handleEvent(event) {

    var that = this;
    // If this is the initial load of the page, we are
    // only requesting prefs in init and then only once
    // the message for this is received do we ask for
    // the payload.
    if (this._isFirstLoad && event.data.type == 'prefs') {
      this.reqPayload();
      this._isFirstLoad = false;
    }

    // The below handles all other on demand requests for
    // prefs or payloads.
    switch (event.data.type) {
      case "prefs":
        this.rootScope.$apply(function() {
          that._prefs = event.data.content;
          that.rootScope.$broadcast("prefChanged");
        });
        break;
      case "payload":
        this.rootScope.$apply(function() {
          var payload = event.data.content;
          that._populateData(payload);
          that.rootScope.$broadcast("messageChanged");
        });
        break;
    }
  },

  disableUP: function disableUP() {
    this._sendToBrowser("DisableUP");
  },

  enableUP: function enableUP() {
    this._sendToBrowser("EnableUP");
  },

  reqPrefs: function reqPrefs() {
    this._sendToBrowser("RequestCurrentPrefs");
  },

  reqPayload: function reqPayload() {
    this._sendToBrowser("RequestCurrentPayload");
  },

  _sendToBrowser: function _sendToBrowser(type) {
    var event = new CustomEvent("RemoteUserProfileCommand", {detail: {command: type}});
    try {
      this.window.document.dispatchEvent(event);
    } catch(e) {
      console.log(e);
    }
  },

  _populateData: function _populateData(data) {
    //TODO: update data and send message to appropriate controllers
    this._message = JSON.stringify(data);
  },
}

var userProfile = angular.module("UPDashboard", [], function($interpolateProvider) {
  $interpolateProvider.startSymbol("[[");
  $interpolateProvider.endSymbol("]]");
});

userProfile.service("dataService", DataService);

userProfile.controller("activationCtrl", function($scope, dataService) {
  $scope.prefs = dataService._prefs;

  // refresh the state of the controller
  $scope.refresh = function() {
    $scope.prefs = dataService._prefs;
  }
  $scope.$on("prefChanged", $scope.refresh);

  // tell firefox we want to flip the service's state
  $scope.toggle = function() {
    if ($scope.prefs.enabled) {
      dataService.disableUP();
    }
    else {
      dataService.enableUP();
    }
  }
});
userProfile.controller("interestProfileCtrl", function($scope, dataService) {
  $scope.message = dataService._message;

  // refresh the state of the controller
  $scope.refresh = function() {
    $scope.message = dataService._message;
  }
  $scope.$on("messageChanged", $scope.refresh);
});
