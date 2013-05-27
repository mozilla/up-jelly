"use strict";

var DataService = function($window, $rootScope) {
  this.window = $window;
  this.rootScope = $rootScope;
  this.window.addEventListener("message", this, false);
  this._prefs = {enabled: false};
  this._isFirstLoad = true;
  this._payload = null;
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
      this.reqPagePayload();
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
          that.rootScope.$broadcast("dataReceived");
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

  reqPagePayload: function reqPagePayload() {
    // defaults to 5 interests
    var interestsProfileLimit = 5;
    this._sendToBrowser("RequestCurrentPagePayload", interestsProfileLimit);
  },

  _sendToBrowser: function _sendToBrowser(type, data) {
    var details = {
      detail: {
        command: type
      }
    }

    if (data) {
      details.detail.data = data;
    }

    var event = new CustomEvent("RemoteUserProfileCommand", details);
    try {
      this.window.document.dispatchEvent(event);
    } catch(e) {
      console.log(e);
    }
  },

  _populateData: function _populateData(data) {
    var parsedData = JSON.parse(data);
    this._interestsProfile = parsedData.interestsProfile;
    this._interestsHosts = parsedData.interestsHosts;
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

userProfile.controller("interestsProfileCtrl", function($scope, dataService) {

  // refresh the state of the controller
  $scope.detailWindowHasContent = false;

  $scope.refresh = function() {
    $scope.interests = dataService._interestsProfile && dataService._interestsProfile.length ? dataService._interestsProfile : [];
    for (var i=0; i < $scope.interests.length; i++) {
      $scope.interests[i].roundScore = Math.round($scope.interests[i].score / 10);
    }
    angular.element(document.querySelector("#interestsContent .bar-chart")).removeClass("hidden");
    angular.element(document.querySelector("#interestsContent .dataNotAvailable")).addClass("hidden");
    angular.element(document.querySelector("#interestsContent .detailWindow")).removeClass("hidden");
  }
  $scope.$on("dataReceived", $scope.refresh);

  $scope.updateDetailWindow = function(interest) {
    document.querySelector("#interestsContent .detailTitle").innerHTML = interest.name.toUpperCase();
    document.querySelector("#interestsContent .detailScore").innerHTML = interest.score/10;
    $scope.hosts = dataService._interestsHosts && dataService._interestsHosts.hasOwnProperty(interest.name) ? dataService._interestsHosts[interest.name] : [];

    $scope.detailWindowHasContent = true;
  }
});

userProfile.controller("personalizedWebsitesCtrl", function($scope, dataService) {
});
