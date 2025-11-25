const _DREAMTEAM_QUICKFIX_CFG_KEYS = {
    nominalStartTime: "nominalStartTime",
    fuzzStartTime: "fuzzStartTime",
    fuzzDuration: "fuzzDuration",
    ftePercent: "ftePercent"
};

function load_dreamteam_quickfix_config(callback) {
    chrome.storage.local.get(_DREAMTEAM_QUICKFIX_CFG_KEYS, (result) => {
        let config = {
            nominalStartTime: "08:00",
            fuzzStartTime: 15,
            fuzzDuration: 15,
            ftePercent: 100
        };

        if (result[_DREAMTEAM_QUICKFIX_CFG_KEYS.nominalStartTime] !== undefined && result[_DREAMTEAM_QUICKFIX_CFG_KEYS.nominalStartTime] !== "")
            config.nominalStartTime = result[_DREAMTEAM_QUICKFIX_CFG_KEYS.nominalStartTime];
        if (result[_DREAMTEAM_QUICKFIX_CFG_KEYS.fuzzStartTime] !== undefined && !isNaN(result[_DREAMTEAM_QUICKFIX_CFG_KEYS.fuzzStartTime]))
            config.fuzzStartTime = result[_DREAMTEAM_QUICKFIX_CFG_KEYS.fuzzStartTime];
        if (result[_DREAMTEAM_QUICKFIX_CFG_KEYS.fuzzDuration] !== undefined && !isNaN(result[_DREAMTEAM_QUICKFIX_CFG_KEYS.fuzzDuration]))
            config.fuzzDuration = result[_DREAMTEAM_QUICKFIX_CFG_KEYS.fuzzDuration];
        if (result[_DREAMTEAM_QUICKFIX_CFG_KEYS.ftePercent] !== undefined && !isNaN(result[_DREAMTEAM_QUICKFIX_CFG_KEYS.ftePercent]))
            config.ftePercent = result[_DREAMTEAM_QUICKFIX_CFG_KEYS.ftePercent];

        config.fuzzStartTime = Math.max(0, config.fuzzStartTime);
        config.fuzzDuration = Math.max(0, config.fuzzDuration);
        config.ftePercent = Math.max(1, config.ftePercent);

        callback(config);
    });
}

function save_dreamteam_quickfix_config(config) {
    chrome.storage.local.set({
        [_DREAMTEAM_QUICKFIX_CFG_KEYS.nominalStartTime]: config.nominalStartTime,
        [_DREAMTEAM_QUICKFIX_CFG_KEYS.fuzzStartTime]: Math.max(0, config.fuzzStartTime),
        [_DREAMTEAM_QUICKFIX_CFG_KEYS.fuzzDuration]: Math.max(0, config.fuzzDuration),
        [_DREAMTEAM_QUICKFIX_CFG_KEYS.ftePercent]: Math.max(1, config.ftePercent)
    });
}
