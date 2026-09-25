
# Ja-Ela Serenity Villa - Payment Test Data Setup
# PAY-TEST-018 .. PAY-TEST-028
# READ-ONLY by default. Add -CreateBookings to create the test reservations.
#
# IMPORTANT:
# - This script works against the TEST Firestore emulator only.
# - It first reads current bookings and calculates free date windows.
# - It does NOT delete or overwrite existing bookings.
# - It uses the same overlap rule as the application: existing check-in < new checkout
#   AND existing checkout > new check-in.
#
# Usage:
#   .\tools\setup-pay-tests.ps1
#   .\tools\setup-pay-tests.ps1 -CreateBookings
#
# Optional:
#   .\tools\setup-pay-tests.ps1 -CreateBookings -StartDate "2027-01-01" -EndDate "2029-12-31"

[CmdletBinding()]
param(
    [switch]$CreateBookings,
    [datetime]$StartDate = [datetime]"2027-01-01",
    [datetime]$EndDate   = [datetime]"2029-12-31",
    [int]$StayNights = 3
)

$ErrorActionPreference = "Stop"

$BaseUrl   = "http://127.0.0.1:8080"
$ProjectId = "ja-ela-serenity-villa-test"
$Collection = "bookings"
$CollectionUrl = "$BaseUrl/v1/projects/$ProjectId/databases/(default)/documents/$Collection"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Ja-Ela Serenity Villa - PAYMENT TEST DATA SETUP" -ForegroundColor Cyan
Write-Host " PAY-TEST-018 .. PAY-TEST-028" -ForegroundColor Cyan
Write-Host " TEST Firebase emulator only" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

function Get-StringField {
    param($Doc, [string]$Name)
    if ($null -ne $Doc.fields.$Name.stringValue) {
        return [string]$Doc.fields.$Name.stringValue
    }
    return ""
}

function Get-NumberField {
    param($Doc, [string]$Name)
    if ($null -ne $Doc.fields.$Name.integerValue -and $Doc.fields.$Name.integerValue -ne "") {
        return [double]$Doc.fields.$Name.integerValue
    }
    if ($null -ne $Doc.fields.$Name.doubleValue -and $Doc.fields.$Name.doubleValue -ne "") {
        return [double]$Doc.fields.$Name.doubleValue
    }
    return 0
}

function Get-BoolField {
    param($Doc, [string]$Name)
    if ($null -ne $Doc.fields.$Name.booleanValue) {
        return [bool]$Doc.fields.$Name.booleanValue
    }
    return $false
}

function Get-Documents {
    $response = Invoke-RestMethod -Method Get -Uri $CollectionUrl
    if ($null -eq $response.documents) {
        return @()
    }
    return @($response.documents)
}

function Convert-Booking {
    param($Doc)

    [pscustomobject]@{
        Id                    = ($Doc.name -split "/")[-1]
        Name                  = $Doc.name
        Reference             = Get-StringField $Doc "channelBookingReference"
        BookingReference      = Get-StringField $Doc "bookingReference"
        GuestName             = Get-StringField $Doc "guestName"
        CheckIn               = Get-StringField $Doc "checkin"
        CheckOut              = Get-StringField $Doc "checkout"
        Status                = Get-StringField $Doc "status"
        PaymentStatus         = Get-StringField $Doc "paymentStatus"
        BalanceStatus         = Get-StringField $Doc "balancePaymentStatus"
        DepositAmount         = Get-NumberField $Doc "depositAmount"
        BalanceAmount         = Get-NumberField $Doc "balanceAmount"
        BalancePaid           = Get-BoolField $Doc "balancePaid"
        Total                 = Get-NumberField $Doc "total"
    }
}

function Test-DateOverlap {
    param(
        [datetime]$NewCheckIn,
        [datetime]$NewCheckOut,
        [object]$Booking
    )

    if ([string]::IsNullOrWhiteSpace($Booking.CheckIn) -or
        [string]::IsNullOrWhiteSpace($Booking.CheckOut)) {
        return $false
    }

    try {
        $existingIn  = [datetime]::ParseExact($Booking.CheckIn, "yyyy-MM-dd", $null)
        $existingOut = [datetime]::ParseExact($Booking.CheckOut, "yyyy-MM-dd", $null)
    }
    catch {
        return $false
    }

    return ($existingIn -lt $NewCheckOut -and $existingOut -gt $NewCheckIn)
}

function Find-FreeSlots {
    param(
        [array]$ActiveBookings,
        [datetime]$From,
        [datetime]$To,
        [int]$Nights,
        [int]$Required
    )

    $slots = @()
    $cursor = $From.Date

    while ($cursor.AddDays($Nights) -le $To.Date -and $slots.Count -lt $Required) {
        $checkIn = $cursor
        $checkOut = $cursor.AddDays($Nights)

        $conflict = $false

        foreach ($booking in $ActiveBookings) {
            if (Test-DateOverlap $checkIn $checkOut $booking) {
                $conflict = $true
                break
            }
        }

        # Also make sure the candidate does not overlap a slot already selected
        if (-not $conflict) {
            foreach ($slot in $slots) {
                if ($slot.CheckIn -lt $checkOut -and $slot.CheckOut -gt $checkIn) {
                    $conflict = $true
                    break
                }
            }
        }

        if (-not $conflict) {
            $slots += [pscustomobject]@{
                CheckIn  = $checkIn
                CheckOut = $checkOut
            }

            # Adjacent slots are allowed by the application's overlap rule.
            $cursor = $checkOut
        }
        else {
            $cursor = $cursor.AddDays(1)
        }
    }

    return @($slots)
}

function Firestore-String {
    param([string]$Value)
    return @{ stringValue = $Value }
}

function Firestore-Integer {
    param([int]$Value)
    return @{ integerValue = ([string]$Value) }
}

function Firestore-Double {
    param([double]$Value)
    return @{ doubleValue = $Value }
}

function Firestore-Bool {
    param([bool]$Value)
    return @{ booleanValue = $Value }
}

function New-TestBookingBody {
    param(
        [string]$Reference,
        [string]$GuestName,
        [string]$Email,
        [datetime]$CheckIn,
        [datetime]$CheckOut,
        [string]$PaymentStatus,
        [double]$DepositAmount,
        [double]$BalanceAmount,
        [string]$BalanceStatus,
        [bool]$BalancePaid,
        [string]$Status = "Confirmed",
        [string]$Notes
    )

    $nights = [int](($CheckOut.Date - $CheckIn.Date).TotalDays)
    $total = 225

    $depositPercentage = if ($total -gt 0) {
        ($DepositAmount / $total) * 100
    } else {
        0
    }

    @{
        fields = @{
            bookingReference = Firestore-String "DIRECT-$Reference"
            source = Firestore-String "Direct"
            channelBookingReference = Firestore-String $Reference
            isExternalBooking = Firestore-Bool $false

            guestName = Firestore-String $GuestName
            email = Firestore-String $Email
            phone = Firestore-String "0400000$($Reference.Substring($Reference.Length-3))"
            country = Firestore-String "Australia"

            checkin = Firestore-String $CheckIn.ToString("yyyy-MM-dd")
            checkout = Firestore-String $CheckOut.ToString("yyyy-MM-dd")
            adults = Firestore-Integer 2
            children = Firestore-Integer 0
            totalGuests = Firestore-Integer 2
            nights = Firestore-Integer $nights

            accommodationBase = Firestore-Integer 200
            accommodation = Firestore-Integer 200
            extraGuestFee = Firestore-Integer 0
            cleaningFee = Firestore-Integer 25
            total = Firestore-Integer $total
            currency = Firestore-String "AUD"

            depositPercentage = Firestore-Double $depositPercentage
            depositAmount = Firestore-Double $DepositAmount
            balanceAmount = Firestore-Double $BalanceAmount
            paymentStatus = Firestore-String $PaymentStatus
            balancePaymentStatus = Firestore-String $BalanceStatus
            balancePaid = Firestore-Bool $BalancePaid

            status = Firestore-String $Status

            specialRequests = Firestore-String $Notes
            externalBookingNotes = Firestore-String $Notes
            createdByUid = Firestore-String ""
            createdByEmail = Firestore-String ""
        }
    } | ConvertTo-Json -Depth 20
}

function Add-TestBooking {
    param(
        [string]$Reference,
        [string]$GuestName,
        [string]$Email,
        [datetime]$CheckIn,
        [datetime]$CheckOut,
        [string]$PaymentStatus,
        [double]$DepositAmount,
        [double]$BalanceAmount,
        [string]$BalanceStatus,
        [bool]$BalancePaid,
        [string]$Status,
        [string]$Notes
    )

    $body = New-TestBookingBody `
        -Reference $Reference `
        -GuestName $GuestName `
        -Email $Email `
        -CheckIn $CheckIn `
        -CheckOut $CheckOut `
        -PaymentStatus $PaymentStatus `
        -DepositAmount $DepositAmount `
        -BalanceAmount $BalanceAmount `
        -BalanceStatus $BalanceStatus `
        -BalancePaid $BalancePaid `
        -Status $Status `
        -Notes $Notes

    Invoke-RestMethod `
        -Method Post `
        -Uri $CollectionUrl `
        -ContentType "application/json" `
        -Body $body | Out-Null

    Write-Host "CREATED $Reference : $($CheckIn.ToString('yyyy-MM-dd')) -> $($CheckOut.ToString('yyyy-MM-dd'))" -ForegroundColor Green
}

# ------------------------------------------------------------
# 1. LOAD CURRENT DATA
# ------------------------------------------------------------

$documents = Get-Documents
$bookings = @($documents | ForEach-Object { Convert-Booking $_ })

Write-Host "Total booking documents found: $($bookings.Count)" -ForegroundColor Yellow
Write-Host ""

# Application availability treats Pending + Confirmed as active.
$active = @(
    $bookings |
    Where-Object { $_.Status -in @("Pending", "Confirmed") } |
    Where-Object { $_.CheckIn -and $_.CheckOut } |
    Sort-Object CheckIn
)

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " CURRENT RESERVED / ACTIVE DATES" -ForegroundColor Cyan
Write-Host " Pending + Confirmed only" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

if ($active.Count -eq 0) {
    Write-Host "No active reservations found."
}
else {
    $active |
        Select-Object Reference, GuestName, Status, CheckIn, CheckOut |
        Format-Table -AutoSize
}

Write-Host ""
Write-Host "Cancelled bookings are NOT included as reserved dates, matching the application availability logic." -ForegroundColor DarkGray
Write-Host ""

# ------------------------------------------------------------
# 2. FIND FREE TEST WINDOWS
# ------------------------------------------------------------

$requiredSlots = 10

$slots = Find-FreeSlots `
    -ActiveBookings $active `
    -From $StartDate `
    -To $EndDate `
    -Nights $StayNights `
    -Required $requiredSlots

if ($slots.Count -lt $requiredSlots) {
    throw "Only $($slots.Count) free test windows were found. Expand -EndDate or reduce -StayNights."
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " FREE WINDOWS SELECTED FOR PAYMENT TESTS" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$slotIndex = 0
$slots | ForEach-Object {
    $slotIndex++
    [pscustomobject]@{
        Slot     = $slotIndex
        CheckIn  = $_.CheckIn.ToString("yyyy-MM-dd")
        CheckOut = $_.CheckOut.ToString("yyyy-MM-dd")
        Nights   = $StayNights
    }
} | Format-Table -AutoSize

Write-Host ""

# ------------------------------------------------------------
# 3. TEST CASE PLAN
# ------------------------------------------------------------

$testPlan = @(
    @{ Test="PAY-TEST-018"; Scenario="Deposit Required";             PaymentStatus="Deposit Required";         Deposit=0;     Balance=225; BalanceStatus="Balance Due"; BalancePaid=$false; Status="Confirmed" },
    @{ Test="PAY-TEST-019"; Scenario="Deposit Paid + Balance Due";   PaymentStatus="Deposit Paid";             Deposit=100.5; Balance=124.5; BalanceStatus="Balance Due"; BalancePaid=$false; Status="Confirmed" },
    @{ Test="PAY-TEST-020"; Scenario="Fully Paid";                  PaymentStatus="Paid";                     Deposit=225;   Balance=0;     BalanceStatus="Paid";        BalancePaid=$true;  Status="Confirmed" },
    @{ Test="PAY-TEST-021"; Scenario="Cancelled Booking";           PaymentStatus="Deposit Required";         Deposit=0;     Balance=225;   BalanceStatus="Balance Due"; BalancePaid=$false; Status="Cancelled" },
    @{ Test="PAY-TEST-022"; Scenario="Pending Booking";             PaymentStatus="Deposit Required";         Deposit=0;     Balance=225;   BalanceStatus="Balance Due"; BalancePaid=$false; Status="Pending" },
    @{ Test="PAY-TEST-023"; Scenario="Deposit Checkout Created";    PaymentStatus="Deposit Checkout Created";  Deposit=0;     Balance=225;   BalanceStatus="Balance Due"; BalancePaid=$false; Status="Confirmed" },
    @{ Test="PAY-TEST-024"; Scenario="Deposit Paid / Zero Balance";  PaymentStatus="Deposit Paid";             Deposit=225;   Balance=0;     BalanceStatus="Balance Due"; BalancePaid=$false; Status="Confirmed" },
    @{ Test="PAY-TEST-026"; Scenario="Payment Unavailable";          PaymentStatus="Payment Review Required";                         Deposit=0;     Balance=225;   BalanceStatus="";            BalancePaid=$false; Status="Confirmed" },
    @{ Test="PAY-TEST-027"; Scenario="Balance Payment Routing";     PaymentStatus="Deposit Paid";             Deposit=100;   Balance=125;   BalanceStatus="Balance Due"; BalancePaid=$false; Status="Confirmed" },
    @{ Test="PAY-TEST-028"; Scenario="Deposit Payment Routing";     PaymentStatus="Deposit Required";         Deposit=0;     Balance=225;   BalanceStatus="Balance Due"; BalancePaid=$false; Status="Confirmed" }
)

$planRows = for ($i = 0; $i -lt $testPlan.Count; $i++) {
    $t = $testPlan[$i]
    $s = $slots[$i]

    [pscustomobject]@{
        TestCase = $t.Test
        Scenario = $t.Scenario
        Reference = "DIRECT-$($t.Test)"
        CheckIn = $s.CheckIn.ToString("yyyy-MM-dd")
        CheckOut = $s.CheckOut.ToString("yyyy-MM-dd")
        PaymentStatus = $t.PaymentStatus
        Deposit = $t.Deposit
        Balance = $t.Balance
        BalanceStatus = $t.BalanceStatus
        BalancePaid = $t.BalancePaid
        Status = $t.Status
    }
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " PAYMENT TEST PLAN" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$planRows | Format-Table -AutoSize

# Save the plan so it can be reviewed before creation.
$planPath = Join-Path (Get-Location) "tools\PAY-TEST-018-028-plan.csv"
$planRows | Export-Csv -NoTypeInformation -Path $planPath -Encoding UTF8

Write-Host ""
Write-Host "Plan saved to: $planPath" -ForegroundColor Yellow
Write-Host ""

# ------------------------------------------------------------
# 4. CREATE BOOKINGS ONLY WHEN -CreateBookings IS SPECIFIED
# ------------------------------------------------------------

if (-not $CreateBookings) {
    Write-Host "READ-ONLY MODE: no bookings were created." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "If the date allocation looks correct, run:" -ForegroundColor White
    Write-Host "  .\tools\setup-pay-tests.ps1 -CreateBookings" -ForegroundColor Green
    Write-Host ""
    exit 0
}

Write-Host "============================================================" -ForegroundColor Red
Write-Host " CREATE MODE ENABLED" -ForegroundColor Red
Write-Host " Creating PAY-TEST-018 through PAY-TEST-028 test reservations." -ForegroundColor Red
Write-Host " PAY-TEST-025 is intentionally NOT created (Booking Not Found)." -ForegroundColor Red
Write-Host "============================================================" -ForegroundColor Red
Write-Host ""

# Refresh data immediately before creation to reduce race/conflict risk.
$documents = Get-Documents
$bookings = @($documents | ForEach-Object { Convert-Booking $_ })
$active = @(
    $bookings |
    Where-Object { $_.Status -in @("Pending", "Confirmed") } |
    Where-Object { $_.CheckIn -and $_.CheckOut }
)

for ($i = 0; $i -lt $planRows.Count; $i++) {
    $row = $planRows[$i]

    # Re-check against all active bookings plus already-created test bookings.
    $checkIn = [datetime]::ParseExact($row.CheckIn, "yyyy-MM-dd", $null)
    $checkOut = [datetime]::ParseExact($row.CheckOut, "yyyy-MM-dd", $null)

    $conflict = $false
    foreach ($b in $active) {
        if (Test-DateOverlap $checkIn $checkOut $b) {
            $conflict = $true
            break
        }
    }

    if ($conflict) {
        throw "$($row.TestCase) dates now conflict with an active booking: $($row.CheckIn) -> $($row.CheckOut)"
    }

    $existing = $bookings | Where-Object {
        $_.Reference -eq $row.TestCase
    }

    if ($existing) {
        Write-Host "SKIP $($row.TestCase) - already exists." -ForegroundColor DarkYellow
        continue
    }

    Add-TestBooking `
        -Reference $row.TestCase `
        -GuestName "Payment Test $($row.TestCase.Substring($row.TestCase.Length-3))" `
        -Email "paytest$($row.TestCase.Substring($row.TestCase.Length-3))@example.com" `
        -CheckIn $checkIn `
        -CheckOut $checkOut `
        -PaymentStatus $row.PaymentStatus `
        -DepositAmount ([double]$row.Deposit) `
        -BalanceAmount ([double]$row.Balance) `
        -BalanceStatus $row.BalanceStatus `
        -BalancePaid ([bool]$row.BalancePaid) `
        -Status $row.Status `
        -Notes "$($row.TestCase) - $($row.Scenario)"

    # Newly-created Pending/Confirmed bookings are active.
    if ($row.Status -in @("Pending", "Confirmed")) {
        $active += [pscustomobject]@{
            Reference = $row.TestCase
            CheckIn = $row.CheckIn
            CheckOut = $row.CheckOut
            Status = $row.Status
        }
    }
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " PAYMENT TEST DATA CREATION COMPLETE" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""

Write-Host "Verify with:" -ForegroundColor Yellow
Write-Host '  .\tools\verify-pay-tests.ps1' -ForegroundColor Green
Write-Host ""
Write-Host "PAY-TEST-025 is intentionally absent because it tests a non-existent booking." -ForegroundColor DarkGray
