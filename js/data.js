function init() {
  window.addEventListener("message", receiveMessage, false);
  reqPrefs();
  reqPayload();
}
var payload = null;
function receiveMessage(event) {
  switch (event.data.type) {
    case "prefs":
      var prefs = event.data.content;
      document.getElementById("enable").hidden  = prefs.enabled;
      document.getElementById("disable").hidden = !prefs.enabled;
      break;
    case "payload":
      payload = JSON.parse(event.data.content);
      document.getElementById("payload").textContent = JSON.stringify(payload, null, 2);
      break;
  }
}
function disableSubmission() {
  sendToBrowser("DisableDataSubmission");
}
function enableSubmission() {
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
