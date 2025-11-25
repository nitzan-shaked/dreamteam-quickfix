
function saveConfig() {
    save_dreamteam_quickfix_config({
        nominalStartTime: document.getElementById("nominalStartTime").value,
        fuzzStartTime: document.getElementById("fuzzStartTime").value,
        fuzzDuration: document.getElementById("fuzzDuration").value,
        ftePercent: document.getElementById("ftePercent").value
    });
}

function loadConfig() {
    load_dreamteam_quickfix_config((cfg) => {
        document.getElementById("nominalStartTime").value = cfg.nominalStartTime;
        document.getElementById("fuzzStartTime").value = cfg.fuzzStartTime;
        document.getElementById("fuzzDuration").value = cfg.fuzzDuration;
        document.getElementById("ftePercent").value = cfg.ftePercent;
    });
}

document.addEventListener("DOMContentLoaded", () => {
    loadConfig();
    document.getElementById("nominalStartTime").addEventListener("change", saveConfig);
    document.getElementById("fuzzStartTime").addEventListener("change", saveConfig);
    document.getElementById("fuzzDuration").addEventListener("change", saveConfig);
    document.getElementById("ftePercent").addEventListener("change", saveConfig);

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
});
