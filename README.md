# DreamTeam-Quickfix

DreamTeam-Quickfix is a Chrome extension that automatically fills in missing attendance hours on the DreamTeam "Attendance Summary" page. The extension interacts directly with the timesheet table, simulating user input.

## Features

- **Autofill** missing attendance days
- Configurable start time and option for fuzzing (randomizing) the actual start time and durations
- Configurable FTE% ("full-time equivalence")

## What Happens When You Click "Autofill"

1. **Table Scan**: The extension scans the timesheet table to identify all days with missing or incomplete attendance. (The table will briefly scroll from top to bottom)
2. **Randomization**: For each missing day, the extension decides on a start time (with optional random "fuzz") and on a duration (also with optional fuzz), scaled by the FTE percent. The extension then tweaks the durtaion fuzzes such that their sum is 0, guaranteeing that your total working hours is exactly what is expected.
3. **Entry**: The extension then fills in the missing entries as per step #2 above. This step obviously also involves scrolling the table.

## Issues

Sometimes a second time entry is created for some rows, and the start/end times entered by the extension are on the second entry or split between the first and the second entry. I haven't been able to fix this yet.

## Installation

1. Clone or download this repository.
2. Go to `chrome://extensions/` in Chrome.
3. Enable Developer Mode.
4. Click "Load unpacked" and select the project directory.

## Usage

- When visiting the "Attendance Summary" page in Dreamteam, click the extension icon to open the popup.
- Set your desired configuration.
- Click **Autofill** to fill missing days, or **Clear** to remove all times.
