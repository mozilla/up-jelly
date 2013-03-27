var currentUIState = false,
    payload = null,
    prefs = null;

function init() {
  window.addEventListener("message", receiveMessage, false);
  reqPrefs();
  reqPayload();
}

function receiveMessage(event) {
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
      document.querySelector(".rawdata-display pre").textContent = JSON.stringify(payload, null, 2);
      break;
  }
}

function disableSubmission() {
    console.log("disable");
    sendToBrowser("DisableDataSubmission");
}
function enableSubmission() {
    console.log("enable");
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
  document.dispatchEvent(event);
}
