const CONFIG_KEYS = {
    nominalStartTime: "nominalStartTime",
    fuzzStartTime: "fuzzStartTime",
    fuzzDuration: "fuzzDuration",
};

function saveConfig() {
    const nominalStartTime = document.getElementById("nominalStartTime").value;
    const fuzzStartTime = Math.max(0, parseInt(document.getElementById("fuzzStartTime").value, 10) || 0);
    const fuzzDuration = Math.max(0, parseInt(document.getElementById("fuzzDuration").value, 10) || 0);
    chrome.storage.local.set({
        [CONFIG_KEYS.nominalStartTime]: nominalStartTime,
        [CONFIG_KEYS.fuzzStartTime]: fuzzStartTime,
        [CONFIG_KEYS.fuzzDuration]: fuzzDuration
    });
}

function loadConfig() {
    chrome.storage.local.get(CONFIG_KEYS, (result) => {
        let nominalStartTime = "08:00";
        let fuzzStartTime = 15;
        let fuzzDuration = 15;

        if (result[CONFIG_KEYS.nominalStartTime] !== undefined && result[CONFIG_KEYS.nominalStartTime] !== "")
            nominalStartTime = result[CONFIG_KEYS.nominalStartTime];
        if (result[CONFIG_KEYS.fuzzStartTime] !== undefined && !isNaN(result[CONFIG_KEYS.fuzzStartTime]))
            fuzzStartTime = result[CONFIG_KEYS.fuzzStartTime];
        if (result[CONFIG_KEYS.fuzzDuration] !== undefined && !isNaN(result[CONFIG_KEYS.fuzzDuration]))
            fuzzDuration = result[CONFIG_KEYS.fuzzDuration];

        document.getElementById("nominalStartTime").value = nominalStartTime;
        document.getElementById("fuzzStartTime").value = fuzzStartTime;
        document.getElementById("fuzzDuration").value = fuzzDuration;
    });
}

document.addEventListener("DOMContentLoaded", () => {
    loadConfig();
    document.getElementById("nominalStartTime").addEventListener("change", saveConfig);
    document.getElementById("fuzzStartTime").addEventListener("change", saveConfig);
    document.getElementById("fuzzDuration").addEventListener("change", saveConfig);

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
