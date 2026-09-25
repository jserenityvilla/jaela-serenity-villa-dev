$ErrorActionPreference="Stop"
Write-Host "=== AUTOMATED DEV PAYMENT VERIFICATION ===" -ForegroundColor Cyan
node --check .\assets\js\external-booking.js
if($LASTEXITCODE){throw "external-booking.js syntax failed"}
node --check .\assets\js\payment.js
if($LASTEXITCODE){throw "payment.js syntax failed"}
node --check .\functions\index.js
if($LASTEXITCODE){throw "functions/index.js syntax failed"}
node .\tools\clean-pay-tests-018-028.js
if($LASTEXITCODE){throw "Cleanup failed"}
.\tools\setup-pay-tests.ps1 -CreateBookings
if($LASTEXITCODE){throw "Test data creation failed"}
node .\tools\verify-pay-tests-018-028.js
if($LASTEXITCODE){throw "Automated verification failed"}
Write-Host "=== DEV PAYMENT TESTS PASSED ===" -ForegroundColor Green
