const UI_WAIT_MS = 10;

//==============================================================
//
// DATE
//
//==============================================================

let minTimesheetDate = null;
let maxTimesheetDate = null;

class MonthDay {
    constructor(month, day) {
        this.month = month;
        this.day = day;
    }

    toString() {
        const monthStr = (this.month + 1).toString().padStart(2, "0");
        const dayStr = this.day.toString().padStart(2, "0");
        return `${monthStr}${dayStr}`;
    }

    valueOf() {
        return this.toString();
    }
}

function parseMonthDayStr(s) {
    // Example input: "Oct 18th" or "Feb 21st"
    const cleaned = s.replace(/(st|nd|rd|th)\s*/, "");
    const [monthStr, dayStr] = cleaned.split(" ").map(s => s.trim());
    const month = new Date(`${monthStr} 1, 2000`).getMonth(); // extract month index (0-11)
    const day = parseInt(dayStr, 10);
    return new MonthDay(month, day);
}

function parseMonthDayYearStr(dateStr) {
    // Example input: "Oct 18th, 2024"
    const [monthDayStr, yearStr] = dateStr.split(",").map(s => s.trim());
    const monthDay = parseMonthDayStr(monthDayStr);
    const year = parseInt(yearStr, 10);
    return new Date(year, monthDay.month, monthDay.day);
}

function parseWeekdayMonthDayStr(dateStr) {
    // Example input: "Wed, Oct 18th"
    const [_, monthDayStr] = dateStr.split(",").map(s => s.trim());
    return parseMonthDayStr(monthDayStr);
}

function extractTimesheetPeriod() {
    const periodTitleWrapperDiv = document.querySelector('[class *= "period-picker-component-styles__PeriodWrapper-"]');
    if (!periodTitleWrapperDiv)
        throw new Error("Cannot find period title wrapper div");

    const periodTextDiv = periodTitleWrapperDiv.querySelector('[class *= "text-component-styles__Text-"]');
    if (!periodTextDiv)
        throw new Error("Cannot find period text div");
    const periodTextStr = periodTextDiv.innerText;

    const [startDateStr, endDateStr] = periodTextStr.split(" - ").map(s => s.trim());
    minTimesheetDate = parseMonthDayYearStr(startDateStr);
    maxTimesheetDate = parseMonthDayYearStr(endDateStr);

    if (minTimesheetDate > maxTimesheetDate)
        throw new Error(`Invalid timesheet period: ${periodTextStr}`);
    if (maxTimesheetDate.getFullYear() - minTimesheetDate.getFullYear() > 1)
        throw new Error(`Invalid timesheet period (too long): ${periodTextStr}`);

    console.log(
        "Timesheet period:",
        minTimesheetDate.toDateString(),
        "-",
        maxTimesheetDate.toDateString()
    );
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
// UI AUX.
//
//==============================================================

async function waitForUi() {
    return new Promise(resolve => setTimeout(resolve, UI_WAIT_MS));
}

//==============================================================
//
// ONE ROW LOGIC
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

    static fromRow(table, row) {
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
        const rowMonthDay = parseWeekdayMonthDayStr(rowDateDiv.innerText);

        let rowDate = new Date(
            minTimesheetDate.getFullYear(),
            rowMonthDay.month,
            rowMonthDay.day
        );
        if (rowDate < minTimesheetDate) {
            rowDate = new Date(
                maxTimesheetDate.getFullYear(),
                rowMonthDay.month,
                rowMonthDay.day
            );
        }
        if (rowDate < minTimesheetDate || rowDate > maxTimesheetDate)
            throw new Error(`Row date ${rowDate.toDateString()} out of timesheet range ${minTimesheetDate.toDateString()} - ${maxTimesheetDate.toDateString()}`);

        const requiredDurationDiv = row.querySelector('[class *= "required-duration-component-styles__Timer-"]');
        const requiredDuration = requiredDurationDiv ?
            ClockTime.fromString(requiredDurationDiv.innerText) :
            ClockTime.fromMinutes(0);

        const actualDurationDiv = row.querySelector('[class *= "timer-difference-presentation-component-styles__Duration-"]');
        const actualDuration = actualDurationDiv ?
            ClockTime.fromString(actualDurationDiv.innerText) :
            ClockTime.fromMinutes(0);

        return new RowData(table, rowId, rowDate, requiredDuration, actualDuration);
    }
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
    for (const item of multiInOut[0].children) {
        const itemClockCells = item.querySelectorAll("div.clock-in-and-out-item-clock");
        clockCells.push(...itemClockCells);
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

async function processRows(table, rowFunc, seenRowIds) {
    let didSomething = false;

    const rowsDatas = Array
        .from(table.querySelectorAll('[data-rbd-draggable-id ^= "table-row-"]'))
        .filter(isExpandableRow)
        .map(row => RowData.fromRow(table, row))
        .sort((a, b) => a.rowId - b.rowId);

    for (const rowData of rowsDatas) {
        if (seenRowIds.has(rowData.rowId))
            continue;
        seenRowIds.add(rowData.rowId);
        didSomething = true;

        table.scrollTop = Math.max(rowData.getRow().offsetTop - 100, 0);
        await waitForUi();
        await rowFunc(rowData);
    }

    return didSomething;
}

async function processTable(rowFunc) {
    const table = document.querySelector('[class *= "table-component-styles__List-"]');
    if (!table)
        throw new Error("Cannot find timesheet table");

    let seenRowIds = new Set();

    table.scrollTop = 0;
    await waitForUi();

    while (true) {
        const keepGoing = await processRows(table, rowFunc, seenRowIds);
        if (!keepGoing)
            break;
    }
}

//==============================================================
//
// CLEAR
//
//==============================================================

async function clearRow(rowData) {
    await setRowStartEndTimes(rowData, null, null);
}

async function clearTimesheet() {
    await processTable(clearRow);
}

//==============================================================
//
// AUTO-FILL
//
//==============================================================

let requiredMinutes = [];
let actualMinutes = [];

function needToAdjust(rowData) {
    const today = new Date();
    const todayMidnight = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
    );
    return rowData.rowDate < todayMidnight && rowData.actualDuration < rowData.requiredDuration;
}

async function collectRequiredDuration(rowData) {
    if (!needToAdjust(rowData))
        return;
    requiredMinutes.push(rowData.requiredDuration.toMinutes());
}

function randomInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}

function randomizeActualDurations(tolerance) {

    actualMinutes = requiredMinutes.map(required => randomInt(
        Math.max(0, required - tolerance),
        required + tolerance
    ));

    const sumRequired = requiredMinutes.reduce((a, b) => a + b, 0);
    const sumActuals = actualMinutes.reduce((a, b) => a + b, 0);

    let diff = sumActuals - sumRequired;
    while (diff !== 0) {
        const i = randomInt(0, requiredMinutes.length - 1);
        const base = requiredMinutes[i];
        const curr = actualMinutes[i];

        let adjustment = 0;

        if (diff > 0 && curr > 0) {
            adjustment = -1;
        } else if (diff < 0 && curr < base + tolerance) {
            adjustment = 1;
        }

        actualMinutes[i] += adjustment;
        diff += adjustment;
    }
}

async function autoFillRow(rowData) {
    if (!needToAdjust(rowData))
        return;

    if (requiredMinutes.length === 0)
        throw new Error(`no required minutes left for row ${rowData}`);
    if (actualMinutes.length === 0)
        throw new Error(`no actual minutes left for row ${rowData}`);
    const reqMins = requiredMinutes.shift();
    const actMins = actualMinutes.shift();
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
    requiredMinutes = [];
    await processTable(collectRequiredDuration);
    randomizeActualDurations(15);
    await processTable(autoFillRow);
}

//==============================================================
//
// MAIN
//
//==============================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action == "clear") {
        console.clear();
        extractTimesheetPeriod();
        (async () => {
            console.log("*** starting clear action");
            await clearTimesheet();
            sendResponse({ status: "completed" });
            console.log("*** completed clear action");
        })();
        return true; // Keep the message channel open for async response
    }

    if (request.action == "autofill") {
        console.clear();
        extractTimesheetPeriod();
        (async () => {
            console.log("*** starting autofill action");
            await autoFillTimesheet();
            sendResponse({ status: "completed" });
            console.log("*** completed autofill action");
        })();
        return true; // Keep the message channel open for async response
    }

    sendResponse({ status: "error", message: "Unknown action" });
    return false; // Synchronous response, no need to keep channel open
});
