function sendMessage(msg) {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    chrome.tabs.sendMessage(tab.id, { action: msg }, (response) => {
      console.log(msg, "response:", response);
    });
  });
}

document.getElementById("autofill").addEventListener("click", () => {
  sendMessage("autofill");
});

document.getElementById("clear").addEventListener("click", () => {
  sendMessage("clear");
});
