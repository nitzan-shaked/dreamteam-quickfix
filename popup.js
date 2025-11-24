const CONFIG_KEYS = {
    nominalStartTime: "nominalStartTime",
    fuzzStartTime: "fuzzStartTime",
    fuzzDuration: "fuzzDuration",
    ftePercent: "ftePercent",
};

function saveConfig() {
    const nominalStartTime = document.getElementById("nominalStartTime").value;
    const fuzzStartTime = Math.max(0, parseInt(document.getElementById("fuzzStartTime").value, 10) || 0);
    const fuzzDuration = Math.max(0, parseInt(document.getElementById("fuzzDuration").value, 10) || 0);
    const ftePercent = Math.max(1, parseInt(document.getElementById("ftePercent").value, 10) || 100);
    chrome.storage.local.set({
        [CONFIG_KEYS.nominalStartTime]: nominalStartTime,
        [CONFIG_KEYS.fuzzStartTime]: fuzzStartTime,
        [CONFIG_KEYS.fuzzDuration]: fuzzDuration,
        [CONFIG_KEYS.ftePercent]: ftePercent
    });
}

function loadConfig() {
    chrome.storage.local.get(CONFIG_KEYS, (result) => {
        let nominalStartTime = "08:00";
        let fuzzStartTime = 15;
        let fuzzDuration = 15;
        let ftePercent = 100;

        if (result[CONFIG_KEYS.nominalStartTime] !== undefined && result[CONFIG_KEYS.nominalStartTime] !== "")
            nominalStartTime = result[CONFIG_KEYS.nominalStartTime];
        if (result[CONFIG_KEYS.fuzzStartTime] !== undefined && !isNaN(result[CONFIG_KEYS.fuzzStartTime]))
            fuzzStartTime = result[CONFIG_KEYS.fuzzStartTime];
        if (result[CONFIG_KEYS.fuzzDuration] !== undefined && !isNaN(result[CONFIG_KEYS.fuzzDuration]))
            fuzzDuration = result[CONFIG_KEYS.fuzzDuration];
        if (result[CONFIG_KEYS.ftePercent] !== undefined && !isNaN(result[CONFIG_KEYS.ftePercent]) && result[CONFIG_KEYS.ftePercent] > 0)
            ftePercent = result[CONFIG_KEYS.ftePercent];

        document.getElementById("nominalStartTime").value = nominalStartTime;
        document.getElementById("fuzzStartTime").value = fuzzStartTime;
        document.getElementById("fuzzDuration").value = fuzzDuration;
        document.getElementById("ftePercent").value = ftePercent;
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
