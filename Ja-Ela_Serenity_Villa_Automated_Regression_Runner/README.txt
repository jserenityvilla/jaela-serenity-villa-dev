# Ja-Ela Serenity Villa - Automated Regression Runner

## Files

- `run-regression.ps1` - PowerShell runner
- `tests/regression.spec.js` - Playwright browser tests

## Prerequisites

- Windows
- Node.js 20+
- VS Code
- Live Server extension
- Microsoft Excel desktop application for automatic workbook updating

## Important

Run this against the local DEV project only:

http://127.0.0.1:5502/

Do not point this first runner at the production website.

## Installation

Open PowerShell in:

C:\Users\kmoha\OneDrive\AirBNB\jaela-serenity-villa-dev-clean

Then run:

Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

.\run-regression.ps1

The script will:

1. Check Node.js.
2. Install Playwright if required.
3. Install Chromium if required.
4. Check that Live Server is running.
5. Run the browser tests.
6. Write results to `tests\regression-results.json`.
7. Update `Ja-Ela_Serenity_Villa_DEV_Regression_Test_Script.xlsx`.
8. Print PASS / FAIL / SKIPPED totals.

## Before running

1. Open the project folder in VS Code.
2. Open `pages\booking.html`.
3. Click `Go Live`.
4. Confirm the browser opens:
   http://127.0.0.1:5502/pages/booking.html
5. Close the Excel workbook if it is already open.
6. Run the PowerShell script.

## Excel

The workbook should be located at:

C:\Users\kmoha\OneDrive\AirBNB\jaela-serenity-villa-dev-clean\Ja-Ela_Serenity_Villa_DEV_Regression_Test_Script.xlsx

The script updates:

- Actual Result
- Status
- Defect / Notes

It does not overwrite the test steps or expected results.

## First run scope

The first runner is deliberately conservative. It automatically tests the non-destructive parts of the application. Tests that would create, confirm or cancel Firestore bookings are marked SKIPPED until a controlled test-data strategy is agreed.

After this first run is working, the next version can automate the complete booking lifecycle using a dedicated test booking and cleanup.
