const UI_WAIT_MS = 10;

//==============================================================
//
// DATE
//
//==============================================================

function parseMonthDayStr(s) {
    // Example input: "Oct 18th" or "Feb 21st"
    const cleaned = s.replace(/(st|nd|rd|th)\s*/, "");
    const [monthStr, dayStr] = cleaned.split(" ").map(s => s.trim());
    const month = new Date(`${monthStr} 1, 2000`).getMonth(); // extract month index (0-11)
    const day = parseInt(dayStr, 10);
    return [month, day];
}

function parseMonthDayYearStr(dateStr) {
    // Example input: "Oct 18th, 2024"
    const [monthDayStr, yearStr] = dateStr.split(",").map(s => s.trim());
    const [month, day] = parseMonthDayStr(monthDayStr);
    const year = parseInt(yearStr, 10);
    return new Date(year, month, day);
}

function parseWeekdayMonthDayStr(dateStr) {
    // Example input: "Wed, Oct 18th"
    const [_, monthDayStr] = dateStr.split(",").map(s => s.trim());
    return parseMonthDayStr(monthDayStr);
}

//==============================================================
//
// CLOCK-TIME
//
//==============================================================

class ClockTime {
    constructor(hours, minutes) {
        if (typeof hours !== "number" || typeof minutes !== "number")
            throw new Error("Hours and minutes must be numbers");
        if (hours < 0 || minutes < 0)
            throw new Error("Hours and minutes must be non-negative");
        if (minutes >= 60)
            throw new Error("Minutes must be less than 60");
        this.hours = hours;
        this.minutes = minutes;
    }

    toMinutes() {
        return this.hours * 60 + this.minutes;
    }

    static fromMinutes(totalMinutes) {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return new ClockTime(hours, minutes);
    }

    valueOf() {
        return this.toMinutes();
    }

    [Symbol.toPrimitive](hint) {
        return this.toMinutes();
    }

    add(other) {
        return ClockTime.fromMinutes(this.toMinutes() + other.toMinutes());
    }

    toString() {
        const hoursStr = this.hours.toString().padStart(2, "0");
        const minutesStr = this.minutes.toString().padStart(2, "0");
        return `${hoursStr}:${minutesStr}`;
    }

    static fromString(s) {
        const match = s.replace(/[\s]/g, "").match(/(\d+)h(\d+)m/);
        if (!match)
            throw new Error("Invalid ClockTime string: " + s);
        const hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        return new ClockTime(hours, minutes);
    }
}

//==============================================================
//
// LOGICAL ROW
//
//==============================================================

class RowData {
    constructor(table, rowId, rowDate, requiredDuration, actualDuration) {
        this.table = table;
        this.rowId = rowId;
        this.rowDate = rowDate;
        this.requiredDuration = requiredDuration;
        this.actualDuration = actualDuration;
    }

    getRow() {
        const row = this.table.querySelector(`[data-rbd-draggable-id="table-row-${this.rowId}"]`);
        if (!row)
            throw new Error(`Row with id ${this.rowId} not found`);
        return row;
    }

    toString() {
        return `id=${this.rowId}, date=${this.rowDate.toDateString()}, required=${this.requiredDuration.toString()}, actual=${this.actualDuration.toString()})`;
    }

    static fromRow(timesheet, row) {
        const rowIdStr = row.getAttribute("data-rbd-draggable-id");
        if (!rowIdStr)
            throw new Error("rowIdStr not found in row");
        const rowIdStrMatch = rowIdStr.match(/^table-row-(\d+)$/);
        if (!rowIdStrMatch)
            throw new Error("Invalid rowIdStr format: " + rowIdStr);
        const rowId = parseInt(rowIdStrMatch[1], 10);

        const rowDateDiv = row.querySelector('[class *= "employee-attendance-summary-date-component-styles__Date-"]');
        if (!rowDateDiv)
            throw new Error("Date div not found in row: " + rowId);
        const [rowMonth, rowDay] = parseWeekdayMonthDayStr(rowDateDiv.innerText);

        const minDate = timesheet.minDate;;
        const maxDate = timesheet.maxDate;

        let rowDate = new Date(minDate.getFullYear(), rowMonth, rowDay);
        if (rowDate < minDate)
            rowDate = new Date(maxDate.getFullYear(), rowMonth, rowDay);
        if (rowDate < minDate || rowDate > maxDate)
            throw new Error(`Row date ${rowDate.toDateString()} out of timesheet range ${minDate.toDateString()} - ${maxDate.toDateString()}`);

        const requiredDurationDiv = row.querySelector('[class *= "required-duration-component-styles__Timer-"]');
        const requiredDuration = requiredDurationDiv ?
            ClockTime.fromString(requiredDurationDiv.innerText) :
            ClockTime.fromMinutes(0);

        const actualDurationDiv = row.querySelector('[class *= "timer-difference-presentation-component-styles__Duration-"]');
        const actualDuration = actualDurationDiv ?
            ClockTime.fromString(actualDurationDiv.innerText) :
            ClockTime.fromMinutes(0);

        return new RowData(
            timesheet.table,
            rowId,
            rowDate,
            requiredDuration,
            actualDuration
        );
    }
}

//==============================================================
//
// TIMESHEET
//
//==============================================================

class Timesheet {
    constructor() {
        const today = new Date().setHours(0, 0, 0, 0);

        const periodTitleWrapperDiv = document.querySelector('[class *= "period-picker-component-styles__PeriodWrapper-"]');
        if (!periodTitleWrapperDiv)
            throw new Error("Cannot find period title wrapper div");

        const periodTextDiv = periodTitleWrapperDiv.querySelector('[class *= "text-component-styles__Text-"]');
        if (!periodTextDiv)
            throw new Error("Cannot find period text div");
        const periodTextStr = periodTextDiv.innerText;

        const [startDateStr, endDateStr] = periodTextStr.split(" - ").map(s => s.trim());
        const minDate = parseMonthDayYearStr(startDateStr);
        const maxDate = parseMonthDayYearStr(endDateStr);

        if (minDate > maxDate)
            throw new Error(`Invalid timesheet period: ${periodTextStr}`);
        if (maxDate.getFullYear() - minDate.getFullYear() > 1)
            throw new Error(`Invalid timesheet period (too long): ${periodTextStr}`);

        const table = document.querySelector('[class *= "table-component-styles__List-"]');
        if (!table)
            throw new Error("Cannot find timesheet table");

        this.today = today;
        this.minDate = minDate;
        this.maxDate = maxDate;
        this.table = table;

        console.log(
            "Timesheet period:",
            minDate.toDateString(),
            "-",
            maxDate.toDateString()
        );
    }
}

//==============================================================
//
// UI AUX.
//
//==============================================================

async function waitForUi() {
    return new Promise(resolve => setTimeout(resolve, UI_WAIT_MS));
}

async function setInput(input, valueStr) {
    if (input.value === valueStr)
        return;
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

async function setClockCell(cell, clockTime) {
    const innerCell = cell.querySelector('[class *= "text-component-styles__Text-"]');
    if (!innerCell)
        throw new Error(`clickClockCell: cannot find inner cell for ${cell}`);

    const clockTimeStr = clockTime ? clockTime.toString() : "--:--";
    if (innerCell.innerText === clockTimeStr)
        return;

    innerCell.click();
    await waitForUi();

    const inputs = document.querySelectorAll("input");
    if (inputs.length !== 1)
        throw new Error(`cannot find input element ${inputs.length} for value ${valueStr}`);
    await setInput(inputs[0], clockTimeStr);
}

function isExpandableRow(row) {
    if (row.children.length !== 1)
        return false;
    const firstChild = row.children[0];

    if (firstChild.tagName !== "DIV")
        return false;

    const firstChildClass = firstChild.getAttribute("class") || "";
    if (!firstChildClass.includes("expandable-table-row-component-styles__ExpandableTableRow-"))
        return false;

    return true;
}

async function expandRow(rowData) {
    const row = rowData.getRow();

    if (!isExpandableRow(row))
        throw new Error(`row ${row} is not expandable`);

    // already expanded?
    let leafRow = row.querySelector('[class *= "row-expansion-component-styles__RowExpansion-"]');
    if (leafRow) {
        console.log(`already expanded row ${rowData}`);
        return leafRow;
    }

    const rowCells = row.querySelectorAll('[class *= "table-cell-component-styles__TableCell-"]');
    if (rowCells.length === 0)
        throw new Error(`cannot expand row ${rowData}`);

    rowCells[0].click();
    await waitForUi();

    leafRow = row.querySelector('[class *= "row-expansion-component-styles__RowExpansion-"]');
    if (!leafRow)
        throw new Error(`cannot find expansion for row ${rowData}`);

    return leafRow;
}

async function setRowStartEndTimes(rowData, startTime, endTime) {
    console.log(
        `setting row ${rowData} to`,
        startTime ? startTime.toString() : "null",
        "-",
        endTime ? endTime.toString() : "null"
    );

    const leafRow = await expandRow(rowData);

    let clockCells = [];
    const multiInOut = leafRow.querySelectorAll('[class *= "multiple-clock-in-and-out-component-styles__ClockInAndOutItems-"]');
    if (multiInOut.length != 1)
        throw new Error(`cannot find multiple clock-in-and-out component in leaf row for row ${rowData}`);
    for (const inOutComponent of multiInOut[0].children) {
        const inAndOut = inOutComponent.querySelectorAll('[class *= "clock-in-and-out-component-styles__ClockInAndOut-"]');
        if (inAndOut.length != 1)
            throw new Error(`cannot find clock-in-and-out component in leaf row for row ${rowData}`);
        for (const obj of inAndOut[0].children) {
            if (obj.tagName !== "DIV")
                continue;
            if (!obj.getAttribute("class")?.includes("editable-component-styles__Editable-"))
                continue;
            clockCells.push(obj);
        }
    }
    if (clockCells.length < 2)
        throw new Error(`cannot find clock cells (${clockCells.length}) in leaf row for row ${rowData}`);

    await setClockCell(clockCells.shift(), startTime);
    await setClockCell(clockCells.shift(), endTime);
    while (clockCells.length)
        await setClockCell(clockCells.shift(), null);
}

//==============================================================
//
// MULTI-ROW LOGIC
//
//==============================================================

async function processRows(timesheet, rowFunc, seenRowIds) {
    const table = timesheet.table;
    let didSomething = false;

    const rowsDatas = Array
        .from(table.querySelectorAll('[data-rbd-draggable-id ^= "table-row-"]'))
        .filter(isExpandableRow)
        .map(row => RowData.fromRow(timesheet, row))
        .sort((a, b) => a.rowId - b.rowId);

    for (const rowData of rowsDatas) {
        if (seenRowIds.has(rowData.rowId))
            continue;
        seenRowIds.add(rowData.rowId);
        didSomething = true;

        table.scrollTop = Math.max(rowData.getRow().offsetTop - 100, 0);
        await waitForUi();
        await rowFunc(timesheet, rowData);
    }

    return didSomething;
}

async function processTable(timesheet, rowFunc) {
    let seenRowIds = new Set();

    timesheet.table.scrollTop = 0;
    await waitForUi();

    while (true) {
        const keepGoing = await processRows(timesheet, rowFunc, seenRowIds);
        if (!keepGoing)
            break;
    }
}

//==============================================================
//
// CLEAR
//
//==============================================================

async function clearRow(timesheet, rowData) {
    await setRowStartEndTimes(rowData, null, null);
}

async function clearTimesheet() {
    console.clear();

    console.log("*** extracting timesheet period");
    const timesheet = new Timesheet();

    console.log("*** starting clear action");
    await processTable(timesheet, clearRow);

    console.log("*** done");
}

//==============================================================
//
// AUTO-FILL
//
//==============================================================

function needToAdjust(timesheet, rowData) {
    return rowData.rowDate < timesheet.today && rowData.actualDuration < rowData.requiredDuration;
}

async function collectRequiredMinutes(timesheet, rowData) {
    if (!needToAdjust(timesheet, rowData))
        return;
    timesheet.requiredMinutes[rowData.rowId] = rowData.requiredDuration.toMinutes();
}

function randomInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}

function randomizeActualDurations(timesheet, tolerance) {

    const requiredMinutes = timesheet.requiredMinutes;

    let actualMinutes = {};
    for (const [rowId, required] of Object.entries(requiredMinutes)) {
        actualMinutes[rowId] = randomInt(
            Math.max(0, required - tolerance),
            required + tolerance
        );
    }

    const sumRequired = Object.values(requiredMinutes).reduce((a, b) => a + b, 0);
    const sumActuals = Object.values(actualMinutes).reduce((a, b) => a + b, 0);

    let diff = sumActuals - sumRequired;
    const rowIds = Object.keys(requiredMinutes);
    while (diff !== 0) {
        const randomRowId = rowIds[randomInt(0, rowIds.length - 1)];
        const base = requiredMinutes[randomRowId];
        const curr = actualMinutes[randomRowId];

        let adjustment = 0;

        if (diff > 0 && curr > 0) {
            adjustment = -1;
        } else if (diff < 0 && curr < base + tolerance) {
            adjustment = 1;
        }

        actualMinutes[randomRowId] += adjustment;
        diff += adjustment;
    }

    timesheet.actualMinutes = actualMinutes;
}

async function autoFillRow(timesheet, rowData) {
    if (!needToAdjust(timesheet, rowData))
        return;

    const requiredMinutes = timesheet.requiredMinutes;
    const actualMinutes = timesheet.actualMinutes;

    if (!(rowData.rowId in requiredMinutes))
        throw new Error(`no required minutes found for row ${rowData}`);
    if (!(rowData.rowId in actualMinutes))
        throw new Error(`no actual minutes found for row ${rowData}`);

    const reqMins = requiredMinutes[rowData.rowId];
    const actMins = actualMinutes[rowData.rowId];

    delete requiredMinutes[rowData.rowId];
    delete actualMinutes[rowData.rowId];

    if (reqMins !== rowData.requiredDuration.toMinutes())
        throw new Error(`mismatched required minutes for row ${rowData}`);

    const nominalStartTime = new ClockTime(8, 0);
    const deltaStartTimeMinutes = randomInt(-15, 15);
    const startTime = ClockTime.fromMinutes(
        nominalStartTime.toMinutes() + deltaStartTimeMinutes
    );

    const newActualDuration = ClockTime.fromMinutes(actMins);
    const endTime = startTime.add(newActualDuration);

    await setRowStartEndTimes(rowData, startTime, endTime);
}

async function autoFillTimesheet() {
    console.clear();

    console.log("*** extracting timesheet period");
    const timesheet = new Timesheet();

    console.log("*** scanning table");
    timesheet.requiredMinutes = {};
    await processTable(timesheet, collectRequiredMinutes);

    randomizeActualDurations(timesheet, 15);

    console.log("*** starting autofill action");
    await processTable(timesheet, autoFillRow);

    console.log("*** done");
}

//==============================================================
//
// MAIN
//
//==============================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action == "clear") {
        (async () => {
            await clearTimesheet();
            sendResponse({ status: "completed" });
        })();
        return true; // Keep the message channel open for async response
    }

    if (request.action == "autofill") {
        (async () => {
            await autoFillTimesheet();
            sendResponse({ status: "completed" });
        })();
        return true; // Keep the message channel open for async response
    }

    sendResponse({ status: "error", message: "Unknown action" });
    return false; // Synchronous response, no need to keep channel open
});
