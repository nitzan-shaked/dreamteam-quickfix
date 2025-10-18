//==============================================================
//
// DURATION
//
//==============================================================

function parseDuration(durationText) {
    const match = durationText.replace(/[\s]/g, "").match(/(\d+)h(\d+)m/);
    if (!match)
        return null;
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
// UI AUX.
//
//==============================================================

async function waitForUi() {
    return new Promise(resolve => setTimeout(resolve, 50));
}

//==============================================================
//
// SET ONE ROW
//
//==============================================================

function formatTime(time) {
    return `${time.hours.toString().padStart(2, "0")}:${time.minutes.toString().padStart(2, "0")}`;
}

async function setInput(input, valueStr) {
    if (valueStr === null)
        valueStr = "--:--";
    input.value = valueStr;
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

async function findAndSetInput(valueStr) {
    const input = document.querySelector("input");
    if (!input) {
        console.warn("cannot find input element for value", valueStr);
        return false;
    }
    await setInput(input, valueStr);
    return true;
}

async function clickClockCell(cell) {
    const innerCell = cell.querySelector('[class *= "text-component-styles__Text-"]');
    if (!innerCell) {
        console.warn("cannot find inner cell to click", cell);
        return false;
    }
    innerCell.click();
    await waitForUi();
    return true;
}

async function setClockCell(cell, value) {
    return (
        true
        && clickClockCell(cell)
        && findAndSetInput(value ? formatTime(value) : null)
    );
}

async function maybeExpandRow(row) {
    if (row.children.length !== 1)
        return row;
    const firstChild = row.children[0];

    if (firstChild.tagName !== "DIV")
        return row;

    const firstChildClass = firstChild.getAttribute("class") || "";
    if (!firstChildClass.includes("expandable-table-row-component-styles__ExpandableTableRow-"))
        return row;

    const rowCells = row.querySelectorAll('[class *= "table-cell-component-styles__TableCell-"]');
    if (rowCells.length === 0) {
        console.warn("cannot expand row");
        return null;
    }

    rowCells[0].click();
    await waitForUi();

    const leafRow = row.querySelector('[class *= "row-expansion-component-styles__RowExpansion-"]');
    if (!leafRow)
        console.warn("cannot find expansion row after expanding", row);

    return leafRow;
}

async function setRowValues(row, start, end) {
    let leafRow = await maybeExpandRow(row);
    if (!leafRow) {
        console.warn("cannot find leaf row", row);
        return false;
    }

    const clockCells = leafRow.querySelectorAll("div.clock-in-and-out-item-clock");
    if (clockCells.length !== 2) {
        console.warn("cannot find clock cells in leaf row", leafRow);
        return false;
    }

    return (
        true
        && await setClockCell(clockCells[0], start)
        && await setClockCell(clockCells[1], end  )
    );
}

//==============================================================
//
// MULTI-ROW LOGIC
//
//==============================================================

async function processRows(rowFunc, seenRowIds) {
    const rows = document.querySelectorAll('[data-rbd-draggable-id ^= "table-row-"]');
    for (const row of rows) {
        const rowId = row.getAttribute("data-rbd-draggable-id");
        if (seenRowIds.has(rowId))
            continue;
        seenRowIds.add(rowId);

        const requiredDurationDiv = row.querySelector('[class *= "required-duration-component-styles__Timer-"]');
        if (!requiredDurationDiv)
            continue;
        const requiredDuration = parseDuration(requiredDurationDiv.innerText);

        const actualDurationDiv = row.querySelector('[class *= "timer-difference-presentation-component-styles__Duration-"]');
        if (!actualDurationDiv)
            continue;
        const actualDuration = parseDuration(actualDurationDiv.innerText);

        const keepGoing = await rowFunc(row, requiredDuration, actualDuration);
        if (!keepGoing)
            return false;
    }
    return true;
}

async function processTable(rowFunc) {
    const table = document.querySelector('[class *= "table-component-styles__List-"]');
    if (!table) {
        console.warn("cannot find table");
        return;
    }

    let currTop = 0;
    let seenRowIds = new Set();
    while (true) {
        table.scrollTop = currTop;
        await waitForUi();
        let currBottom = currTop + table.clientHeight;

        const keepGoing = await processRows(rowFunc, seenRowIds);
        if (!keepGoing)
            break;

        if (currBottom >= table.scrollHeight)
            break;
        currTop = currBottom;
    }
}

//==============================================================
//
// MAIN
//
//==============================================================

async function autoFillRow(row, requiredDuration, actualDuration) {
    if (cmpDuration(actualDuration, requiredDuration) > -1)
        return true;
    const start = { hours: 8, minutes: 0 };
    const end = addDuration(start, requiredDuration);
    return await setRowValues(row, start, end);
}

async function clearRow(row, requiredDuration, actualDuration) {
    if (actualDuration.hours == 0 && actualDuration.minutes == 0)
        return true;
    return await setRowValues(row, null, null);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    rowFunc = (
        request.action === "autofill" ? autoFillRow :
        request.action === "clear" ? clearRow :
        null
    );

    if (!rowFunc) {
        sendResponse({ status: "error", message: "Unknown action" });
        return false; // Synchronous response, no need to keep channel open
    }

    (async () => {
        await processTable(rowFunc);
        sendResponse({ status: "completed" });
    })();
    return true; // Keep the message channel open for async response
});
