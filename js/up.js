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
          var broadcastMessage = that._populateData(payload);
          that.rootScope.$broadcast("pageloadReceived");
        });
        break;
      case "sitePref":
        this.rootScope.$apply(function() {
          that._setSitePermission(event.data.content);
          that.rootScope.$broadcast("sitePrefReceived");
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
    this._sendToBrowser("RequestCurrentPagePayload");
  },

  setInterestSharable: function setInterestSharable(interest, value) {
    this._sendToBrowser("SetInterestSharable", [interest, value]);
  },

  disableSite: function disableSite(site) {
    this._sendToBrowser("DisableSite",site);
  },

  enableSite: function enableSite(site) {
    this._sendToBrowser("EnableSite",site);
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

  /*
   * Unpack data payload, returns broadcast message
   *
   * @param     data
   *            Data payload
   * @returns   message to broadcast to controllers
   */
  _populateData: function _populateData(data) {
    var payload = JSON.parse(data);
    if(payload.type == "pageload") {
      this._interestsProfile = payload.content.interestsProfile;
      this._interestsHosts = payload.content.interestsHosts;
      this._requestingSites = payload.content.requestingSites;
    }
  },

  _setSitePermission:  function(data) {
    if (this._requestingSites && this._requestingSites.length) {
      // find the site and set its permissions
      this._requestingSites.forEach(site => {
        if (site.name == data.site) {
          site.isBlocked = data.isBlocked;
        }
      });
    }
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

  $scope.interests = null;
  $scope.selectedInterest = null;
  $scope.showMore = false;

  // refresh the state of the data
  $scope.refresh = function() {
    if (dataService._interestsProfile && dataService._interestsProfile.length) {
      // update interests array with interests with non-zero scores only
      var interests = [];
      for (var i=0; i < dataService._interestsProfile.length; i++) {
        if (dataService._interestsProfile[i].score > 0) {
          var interest = dataService._interestsProfile[i];
          interest.roundScore = Math.round(interest.score / 10);
          interests.push(interest);
        }
      }
      if(interests.length > 0) {
        $scope.interests = interests;
      }
    }
    else {
      $scope.interests = null;
    }
  }
  $scope.$on("pageloadReceived", $scope.refresh);

  /** detail window **/
  $scope.updateDetailWindow = function(interest, evt) {
    var detailElem = document.getElementById("interestDetailWindow");
    var yPosStr = "-0.5em";

    if (evt) {
      // if event is given, repositioning is requested
      var elem = evt.target;

      var listElem = document.getElementById("interestsList");
      var yListTop = (listElem.offsetTop - listElem.scrollTop);
      var yListBottom = yListTop + listElem.offsetHeight;

      var yPos = elem.offsetTop - elem.scrollTop;
      var detailElemHeight = detailElem.offsetHeight || 296; // element has no height if it hasn't been drawn yet. set a minimum size

      if (yPos+detailElemHeight >= yListBottom) {
        // prevent detailWindow from displaying below list
        yPos = yListBottom - detailElemHeight;
        if (yPos < yListTop) {
          // do not place detailWindow higher than the top element
          yPos = undefined;
        }
      }

      if(yPos) {
        yPosStr = yPos+"px";
      }
    }

    angular.element(detailElem).css("top", yPosStr);

    $scope.hosts = dataService._interestsHosts && dataService._interestsHosts.hasOwnProperty(interest.name) ? dataService._interestsHosts[interest.name] : [];
    interest.meta.sharable = interest.meta.sharable ? true : false; // angular expects bool values for checkboxes
    $scope.selectedInterest = interest;
  }

  /** update which interest is sharable **/
  $scope.updateSharable = function(interest) {
    dataService.setInterestSharable(interest.name, interest.meta.sharable);
  }

  /** interests view mode switching **/
  $scope.toggleInterestMode = function() {
    if ($scope.showMore) {
      $scope.selectedInterest = null;
      $scope.showMore = false;
    }
    else {
      $scope.selectedInterest = null;
      $scope.showMore = true;
    }
  }

  /** get rid of interest detail window **/
  $scope.deselectInterests = function(evt) {
    if (evt) {
      // make sure evt is not interestDetailWindow
      var detailElem = document.getElementById("interestDetailWindow");
      var elem = evt.target;
      while (elem) {
        if (elem == detailElem) {
          return;
        }
        elem = elem.parentNode;
      }
      // since we did not return - diselect an interest
      $scope.selectedInterest = null;
    }
  }

});

userProfile.controller("personalizedWebsitesCtrl", function($scope, dataService) {
  $scope.refresh = function() {
    $scope.sites = [];
    if (dataService._requestingSites && dataService._requestingSites.length) {
      $scope.sites = dataService._requestingSites;
      $scope.sites.forEach(site => {
        site.isPersonalized = site.isBlocked ? false : true;
      });
    }
  }

  $scope.toggleSite = function(site) {
    // the site.isPersonalized value is changed upon the user clicking
    // this handler is to actually propagate the change in Firefox
    if (site.isPersonalized) {
      dataService.enableSite(site.name);
      site.isBlocked = true;
    }
    else {
      dataService.disableSite(site.name);
      site.isBlocked = false;
    }
  }

  $scope.$on("sitePrefReceived", $scope.refresh);
  $scope.$on("pageloadReceived", $scope.refresh);
});
