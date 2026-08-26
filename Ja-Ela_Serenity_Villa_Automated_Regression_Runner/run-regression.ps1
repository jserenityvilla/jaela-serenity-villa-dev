# ============================================================
# Ja-Ela Serenity Villa
# Automated Regression Test Runner
# ============================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Ja-Ela Serenity Villa - Automated Regression Test" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# ------------------------------------------------------------
# Project Root
# ------------------------------------------------------------

$ProjectRoot = Split-Path $PSScriptRoot -Parent

$TestScript = Join-Path `
    $ProjectRoot `
    "tests\Verify-JaElaSerenityVilla.ps1"

# ------------------------------------------------------------
# Check Test Script
# ------------------------------------------------------------

Write-Host "Project Root:" -ForegroundColor Yellow
Write-Host $ProjectRoot
Write-Host ""

Write-Host "Regression Script:" -ForegroundColor Yellow
Write-Host $TestScript
Write-Host ""

if (-not (Test-Path $TestScript)) {

    Write-Host "ERROR: Regression test script was not found." `
        -ForegroundColor Red

    Write-Host ""
    Write-Host "Expected:"
    Write-Host $TestScript

    exit 1
}

Write-Host "Regression test script found." `
    -ForegroundColor Green

Write-Host ""

# ------------------------------------------------------------
# Run Existing Regression Test
# ------------------------------------------------------------

Write-Host "Starting regression testing..." `
    -ForegroundColor Cyan

Write-Host ""

& powershell.exe `
    -NoProfile `
    -ExecutionPolicy Bypass `
    -File $TestScript

$TestExitCode = $LASTEXITCODE

# ------------------------------------------------------------
# Result
# ------------------------------------------------------------

Write-Host ""

Write-Host "============================================================" `
    -ForegroundColor Cyan

if ($TestExitCode -eq 0) {

    Write-Host " REGRESSION TEST: PASSED" `
        -ForegroundColor Green

}
else {

    Write-Host " REGRESSION TEST: FAILED" `
        -ForegroundColor Red

}

Write-Host " Exit Code: $TestExitCode"
Write-Host "============================================================" `
    -ForegroundColor Cyan

Write-Host ""

# ------------------------------------------------------------
# Locate Latest Reports
# ------------------------------------------------------------

$ResultsFolder =
    Join-Path $ProjectRoot "tests\test-results"

if (Test-Path $ResultsFolder) {

    Write-Host "Latest regression reports:" `
        -ForegroundColor Yellow

    Get-ChildItem $ResultsFolder -File |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 5 |
        Format-Table Name, LastWriteTime, Length -AutoSize

}

Write-Host ""

exit $TestExitCode