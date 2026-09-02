# Ja-Ela Serenity Villa - DEV Release Gate
# Safe release-gate checks only.
# Does NOT create bookings, charge Stripe, deploy Firebase, or modify Git.
$ErrorActionPreference = "Stop"
$DevBaseUrl = "https://jserenityvilla.github.io/jaela-serenity-villa-dev"
$results = @()
function Test-Url { param([string]$Name,[string]$Url); try { $r=Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 20; if($r.StatusCode -ge 200 -and $r.StatusCode -lt 400){$script:results += [pscustomobject]@{Test=$Name;Result="PASS";Detail="HTTP $($r.StatusCode)"};return $r.Content};$script:results += [pscustomobject]@{Test=$Name;Result="FAIL";Detail="HTTP $($r.StatusCode)"} } catch {$script:results += [pscustomobject]@{Test=$Name;Result="FAIL";Detail=$_.Exception.Message}};return $null }
function Test-Contains { param([string]$Name,[string]$Content,[string]$Pattern); if($null -ne $Content -and $Content -match [regex]::Escape($Pattern)){$script:results += [pscustomobject]@{Test=$Name;Result="PASS";Detail="Found expected content"}}else{$script:results += [pscustomobject]@{Test=$Name;Result="FAIL";Detail="Expected content not found: $Pattern"}} }
Write-Host "";Write-Host "==================================================" -ForegroundColor Cyan;Write-Host " Ja-Ela Serenity Villa - DEV Release Gate" -ForegroundColor Cyan;Write-Host "==================================================" -ForegroundColor Cyan;Write-Host "";Write-Host "DEV URL: $DevBaseUrl";Write-Host ""
$homeContent=Test-Url "DEV website reachable" "$DevBaseUrl/"
$bookingContent=Test-Url "Booking page reachable" "$DevBaseUrl/pages/booking.html"
Test-Contains "Booking page contains deposit requirement" $bookingContent "A deposit is required to secure your booking."
Test-Contains "Booking page contains payment redirect message" $bookingContent "You'll be redirected to the payment page after submitting your booking."
Test-Contains "Booking page contains confirmation message" $bookingContent "Your booking will be confirmed once the deposit payment is successfully received."
foreach($field in @('id="bookingForm"','id="checkin"','id="checkout"','id="adults"','id="children"','id="guestName"','id="guestEmail"','id="guestPhone"')){Test-Contains "Booking form contains $field" $bookingContent $field}
$paymentContent=Test-Url "Payment page reachable" "$DevBaseUrl/pages/payment.html"

foreach($asset in @("assets/js/firebase.js","assets/js/payment.js","assets/js/admin.js","assets/js/config.js")){Test-Url "Asset reachable: $asset" "$DevBaseUrl/$asset" | Out-Null}
$config=Test-Url "Frontend config reachable" "$DevBaseUrl/assets/js/config.js"
if($config){Test-Contains "Deposit percentage configuration present" $config "depositPercentage";Test-Contains "Balance deadline configuration present" $config "balanceDueHoursBeforeCheckin";Test-Contains "Balance grace-period configuration present" $config "balanceGracePeriodHours"}
$paymentJs=Test-Url "Payment JavaScript reachable" "$DevBaseUrl/assets/js/payment.js"
if($paymentJs){Test-Contains "Payment JavaScript contains bookingId handling" $paymentJs "bookingId"}
if($paymentJs){Test-Contains "Pending/deposit payment logic present" $paymentJs 'paymentStatus === "Deposit Required"';Test-Contains "Early balance payment logic present" $paymentJs "You may pay the remaining balance"}
$firebaseJs=Test-Url "Firebase JavaScript reachable" "$DevBaseUrl/assets/js/firebase.js"
if($firebaseJs){Test-Contains "Booking redirects to payment page" $firebaseJs "payment.html?bookingId="}
Write-Host "";Write-Host "==================================================" -ForegroundColor Cyan;Write-Host " DEV Release Gate Results" -ForegroundColor Cyan;Write-Host "==================================================" -ForegroundColor Cyan;Write-Host "";$results|Format-Table -AutoSize;Write-Host "";$failed=@($results|Where-Object{$_.Result -eq "FAIL"});if($failed.Count -eq 0){Write-Host "RESULT: PASS" -ForegroundColor Green;Write-Host "All automated DEV release-gate checks passed.";exit 0}else{Write-Host "RESULT: FAIL" -ForegroundColor Red;Write-Host "$($failed.Count) automated check(s) failed.";exit 1}






