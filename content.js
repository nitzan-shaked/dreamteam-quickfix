//==============================================================
//
// DURATION
//
//==============================================================

function parseDuration(durationText) {
    const match = durationText.replace(/[\s]/g, "").match(/(\d+)h(\d+)m/);
    if (!match) return null;
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    return { hours, minutes };
}

function addDuration(start, duration) {
    const startMinutes = start.hours * 60 + start.minutes;
    const endMinutes = startMinutes + duration.hours * 60 + duration.minutes;
    return {
        hours: Math.floor(endMinutes / 60),
        minutes: endMinutes % 60,
    };
}

function cmpDuration(d1, d2) {
    if (d1.hours < d2.hours) return -1;
    if (d1.hours > d2.hours) return +1;

    if (d1.minutes < d2.minutes) return -1;
    if (d1.minutes > d2.minutes) return +1;

    return 0;
}

//==============================================================
//
// UI MISC.
//
//==============================================================

async function waitForUi() {
    return new Promise(resolve => setTimeout(resolve, 200));
}

async function clickAndWait(element) {
    element.click();
    await waitForUi();
}

//==============================================================
//
// SET SINGLE INPUT
//
//==============================================================

function findInput() {
    return document.querySelector("input");
}

async function setInput(input, value) {
    if (value === null)
        value = "--:--";
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13
    }));
    await waitForUi();
}

async function findAndSetInput(value) {
    const input = findInput();
    if (!input) {
        console.warn("cannot find input element for value", value);
        return;
    }
    await setInput(input, value);
}

//==============================================================
//
// SET ONE ROW
//
//==============================================================

function formatTime(time) {
    return `${time.hours.toString().padStart(2, "0")}:${time.minutes.toString().padStart(2, "0")}`;
}

async function setRowValues(row, start, end) {
    const startTimeValue = start ? formatTime(start) : null;
    const endTimeValue = end ? formatTime(end) : null;

    // TRY "REGULAR" ROW FIRST

    const rowClockCells = row.querySelectorAll('[class *= "ClockTime"] [class *= "TimePresentation"]');
    if (rowClockCells.length !== 2) {
        console.warn("cannot find clock cells in row", row);
        return;
    }

    await clickAndWait(rowClockCells[0]);
    if (findInput()) {
        findAndSetInput(startTimeValue);
        await clickAndWait(rowClockCells[1]);
        findAndSetInput(endTimeValue);
        return;
    }

    // ASSUME "EXPANSION" ROW

    let expansionClockCells = document.querySelectorAll('[class *= "row-expansion-component-"] [class *= "ClockTime"] [class *= "TimePresentation"]');
    if (expansionClockCells.length !== 2) {
        console.warn("cannot find expansion row clock cells");
        return;
    }
    await clickAndWait(expansionClockCells[0]);
    await findAndSetInput(startTimeValue);

    expansionClockCells = document.querySelectorAll('[class *= "row-expansion-component-"] [class *= "ClockTime"] [class *= "TimePresentation"]');
    if (expansionClockCells.length !== 2) {
        console.warn("cannot find 2nd clock cell in expansion row");
        return;
    }
    await clickAndWait(expansionClockCells[1]);
    await findAndSetInput(endTimeValue);
}

//==============================================================
//
// MULTI-ROW LOGIC
//
//==============================================================

async function processRows(rowFunc) {
    const rows = document.querySelectorAll('[data-rbd-draggable-id ^= "table-row-"]');
    for (const row of rows) {
        const requiredDurationDiv = row.querySelector('[class *= "required-duration-component-styles__Timer-"]');
        if (!requiredDurationDiv) continue;
        const requiredDuration = parseDuration(requiredDurationDiv.innerText);

        const actualDurationDiv = row.querySelector('[class *= "timer-difference-presentation-component-styles__Duration-"]');
        if (!actualDurationDiv) continue;
        const actualDuration = parseDuration(actualDurationDiv.innerText);

        await rowFunc(row, requiredDuration, actualDuration);
    }
}

async function processTable(rowFunc) {
    const table = document.querySelector('[class *= "table-component-styles__List-"]');
    if (!table) {
        console.warn("cannot find table list element");
        return;
    }
    let currTop = 0;

    while (true) {
        table.scrollTop = currTop;
        await waitForUi();
        let currBottom = currTop + table.clientHeight;

        await processRows(rowFunc);

        if (currBottom >= table.scrollHeight) break;
        currTop = currBottom;
    }
}

//==============================================================
//
// MAIN
//
//==============================================================

async function autoFillRow(row, requiredDuration, actualDuration) {
    if (cmpDuration(actualDuration, requiredDuration) > -1) return;
    const start = { hours: 8, minutes: 0 };
    const end = addDuration(start, requiredDuration);
    await setRowValues(row, start, end);
}

async function clearRow(row, requiredDuration, actualDuration) {
    if (actualDuration.hours == 0 && actualDuration.minutes == 0) return;
    await setRowValues(row, null, null);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    rowFunc = (
        request.action === "autofill" ? autoFillRow :
        request.action === "clear" ? clearRow :
        null
    );

    if (rowFunc) {
        (async () => {
            await processTable(rowFunc);
            sendResponse({ status: "completed" });
            return true;
        })();
    } else {
        console.warn("Unknown action:", request.action);
        sendResponse({ status: "error", message: "Unknown action" });
    }
});
