(function () {

    function hookButton(buttonId, actionName, inProgressText) {
        let button = document.getElementById(buttonId);

        button.addEventListener("click", () => {
            const origText = button.textContent;
            button.textContent = inProgressText;
            button.classList.add("disabled");

            chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
                chrome.tabs.sendMessage(tab.id, { action: actionName }, (response) => {
                    console.log(`${actionName} response:`, response);
                    button.classList.remove("disabled");
                    button.textContent = origText;
                    window.close();
                });
            });

        });
    }

    hookButton("autofill", "autofill", "Filling...");
    hookButton("clear", "clear", "Clearing...");

})();
