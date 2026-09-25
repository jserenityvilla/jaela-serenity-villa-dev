param(
    [switch]$CreateBookings
)

$ErrorActionPreference = "Stop"

$BaseUrl   = "http://127.0.0.1:8080/v1/projects/ja-ela-serenity-villa-test/databases/(default)/documents"
$BookingsUrl = "$BaseUrl/bookings"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Ja-Ela Serenity Villa - PAYMENT TEST DATA SETUP" -ForegroundColor Cyan
Write-Host " PAY-TEST-018 .. PAY-TEST-028" -ForegroundColor Cyan
Write-Host " TEST Firebase emulator ONLY" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

function FS-String {
    param([string]$Value)

    return @{
        stringValue = $Value
    }
}

function FS-Integer {
    param([int]$Value)

    return @{
        integerValue = $Value.ToString()
    }
}

function FS-Double {
    param([double]$Value)

    return @{
        doubleValue = $Value
    }
}

function FS-Bool {
    param([bool]$Value)

    return @{
        booleanValue = $Value
    }
}

function Get-Bookings {

    $response = Invoke-RestMethod `
        -Method Get `
        -Uri $BookingsUrl

    if ($null -eq $response.documents) {
        return @()
    }

    return @($response.documents)
}

function Get-FieldString {
    param(
        $Document,
        [string]$Field
    )

    if ($null -ne $Document.fields.$Field.stringValue) {
        return $Document.fields.$Field.stringValue
    }

    return ""
}

function Get-ActiveBookings {

    $documents = Get-Bookings

    $result = @()

    foreach ($doc in $documents) {

        $status = Get-FieldString $doc "status"

        if ($status -eq "Pending" -or $status -eq "Confirmed") {

            $result += [PSCustomObject]@{
                Reference = Get-FieldString $doc "channelBookingReference"
                GuestName = Get-FieldString $doc "guestName"
                Status    = $status
                CheckIn   = Get-FieldString $doc "checkin"
                CheckOut  = Get-FieldString $doc "checkout"
            }
        }
    }

    return $result
}

function Test-DateOverlap {

    param(
        [datetime]$Start1,
        [datetime]$End1,
        [datetime]$Start2,
        [datetime]$End2
    )

    return ($Start1 -lt $End2 -and $End1 -gt $Start2)
}

Write-Host "Reading current TEST bookings..." -ForegroundColor Yellow

$activeBookings = @(Get-ActiveBookings)

Write-Host ""
Write-Host "Total active booking documents: $($activeBookings.Count)" -ForegroundColor Green

Write-Host ""
Write-Host "============================================================"
Write-Host " CURRENT RESERVED / ACTIVE DATES"
Write-Host " Pending + Confirmed only"
Write-Host "============================================================"
Write-Host ""

if ($activeBookings.Count -gt 0) {

    $activeBookings |
        Sort-Object CheckIn |
        Format-Table Reference, GuestName, Status, CheckIn, CheckOut -AutoSize
}
else {

    Write-Host "No active bookings found." -ForegroundColor Yellow
}

# ------------------------------------------------------------
# Payment test definitions
# ------------------------------------------------------------

$tests = @(

    [PSCustomObject]@{
        TestCase = "PAY-TEST-018"
        Scenario = "Deposit Required"
        Reference = "DIRECT-PAY-TEST-018"
        CheckIn = "2027-01-01"
        CheckOut = "2027-01-04"
        PaymentStatus = "Deposit Required"
        DepositAmount = 0
        BalanceAmount = 225
        BalanceStatus = "Balance Due"
        BalancePaid = $false
        Status = "Confirmed"
        Notes = "Payment test 018 - Deposit Required"
    },

    [PSCustomObject]@{
        TestCase = "PAY-TEST-019"
        Scenario = "Deposit Paid + Balance Due"
        Reference = "DIRECT-PAY-TEST-019"
        CheckIn = "2027-01-04"
        CheckOut = "2027-01-07"
        PaymentStatus = "Deposit Paid"
        DepositAmount = 100.50
        BalanceAmount = 124.50
        BalanceStatus = "Balance Due"
        BalancePaid = $false
        Status = "Confirmed"
        Notes = "Payment test 019 - Deposit Paid"
    },

    [PSCustomObject]@{
        TestCase = "PAY-TEST-020"
        Scenario = "Fully Paid"
        Reference = "DIRECT-PAY-TEST-020"
        CheckIn = "2027-01-07"
        CheckOut = "2027-01-10"
        PaymentStatus = "Paid"
        DepositAmount = 225
        BalanceAmount = 0
        BalanceStatus = "Paid"
        BalancePaid = $true
        Status = "Confirmed"
        Notes = "Payment test 020 - Fully Paid"
    },

    [PSCustomObject]@{
        TestCase = "PAY-TEST-021"
        Scenario = "Cancelled Booking"
        Reference = "DIRECT-PAY-TEST-021"
        CheckIn = "2027-02-05"
        CheckOut = "2027-02-08"
        PaymentStatus = "Deposit Required"
        DepositAmount = 0
        BalanceAmount = 225
        BalanceStatus = "Balance Due"
        BalancePaid = $false
        Status = "Cancelled"
        Notes = "Payment test 021 - Cancelled Booking"
    },

    [PSCustomObject]@{
        TestCase = "PAY-TEST-022"
        Scenario = "Pending Booking"
        Reference = "DIRECT-PAY-TEST-022"
        CheckIn = "2027-02-17"
        CheckOut = "2027-02-20"
        PaymentStatus = "Deposit Required"
        DepositAmount = 0
        BalanceAmount = 225
        BalanceStatus = "Balance Due"
        BalancePaid = $false
        Status = "Pending"
        Notes = "Payment test 022 - Pending Booking"
    },

    [PSCustomObject]@{
        TestCase = "PAY-TEST-023"
        Scenario = "Deposit Checkout Created"
        Reference = "DIRECT-PAY-TEST-023"
        CheckIn = "2027-02-20"
        CheckOut = "2027-02-23"
        PaymentStatus = "Deposit Checkout Created"
        DepositAmount = 0
        BalanceAmount = 225
        BalanceStatus = "Balance Due"
        BalancePaid = $false
        Status = "Confirmed"
        Notes = "Payment test 023 - Deposit Checkout Created"
    },

    [PSCustomObject]@{
        TestCase = "PAY-TEST-024"
        Scenario = "Deposit Paid / Zero Balance"
        Reference = "DIRECT-PAY-TEST-024"
        CheckIn = "2027-03-01"
        CheckOut = "2027-03-04"
        PaymentStatus = "Deposit Paid"
        DepositAmount = 225
        BalanceAmount = 0
        BalanceStatus = "Paid"
        BalancePaid = $true
        Status = "Confirmed"
        Notes = "Payment test 024 - Zero Balance"
    },

    # PAY-TEST-025 intentionally NOT created.
    # This represents Booking Not Found.

    [PSCustomObject]@{
        TestCase = "PAY-TEST-026"
        Scenario = "Payment Unavailable"
        Reference = "DIRECT-PAY-TEST-026"
        CheckIn = "2027-03-07"
        CheckOut = "2027-03-10"
        PaymentStatus = "Payment Review Required"
        DepositAmount = 0
        BalanceAmount = 225
        BalanceStatus = ""
        BalancePaid = $false
        Status = "Confirmed"
        Notes = "Payment test 026 - Payment Unavailable"
    },

    [PSCustomObject]@{
        TestCase = "PAY-TEST-027"
        Scenario = "Balance Payment Routing"
        Reference = "DIRECT-PAY-TEST-027"
        CheckIn = "2027-03-10"
        CheckOut = "2027-03-13"
        PaymentStatus = "Deposit Paid"
        DepositAmount = 100
        BalanceAmount = 125
        BalanceStatus = "Balance Due"
        BalancePaid = $false
        Status = "Confirmed"
        Notes = "Payment test 027 - Balance Payment Routing"
    },

    [PSCustomObject]@{
        TestCase = "PAY-TEST-028"
        Scenario = "Deposit Payment Routing"
        Reference = "DIRECT-PAY-TEST-028"
        CheckIn = "2027-03-13"
        CheckOut = "2027-03-16"
        PaymentStatus = "Deposit Required"
        DepositAmount = 0
        BalanceAmount = 225
        BalanceStatus = "Balance Due"
        BalancePaid = $false
        Status = "Confirmed"
        Notes = "Payment test 028 - Deposit Payment Routing"
    }
)

# ------------------------------------------------------------
# Check availability
# ------------------------------------------------------------

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " PAYMENT TEST DATE PLAN" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

foreach ($test in $tests) {

    $checkIn  = [datetime]::Parse($test.CheckIn)
    $checkOut = [datetime]::Parse($test.CheckOut)

    $conflict = $false

    foreach ($booking in $activeBookings) {

        if ([string]::IsNullOrWhiteSpace($booking.CheckIn) -or
            [string]::IsNullOrWhiteSpace($booking.CheckOut)) {
            continue
        }

        $existingIn  = [datetime]::Parse($booking.CheckIn)
        $existingOut = [datetime]::Parse($booking.CheckOut)

        if (Test-DateOverlap $checkIn $checkOut $existingIn $existingOut) {
            $conflict = $true

            Write-Host "WARNING: $($test.TestCase) overlaps $($booking.Reference)" `
                -ForegroundColor Red
        }
    }
}

Write-Host ""

$tests |
    Select-Object TestCase, Scenario, Reference, CheckIn, CheckOut,
        PaymentStatus, DepositAmount, BalanceAmount,
        BalanceStatus, BalancePaid |
    Format-Table -AutoSize

# ------------------------------------------------------------
# Save plan
# ------------------------------------------------------------

$planPath = Join-Path $PSScriptRoot "PAY-TEST-018-028-plan.csv"

$tests |
    Export-Csv `
        -Path $planPath `
        -NoTypeInformation `
        -Encoding UTF8

Write-Host ""
Write-Host "Plan saved to:" -ForegroundColor Green
Write-Host $planPath

# ------------------------------------------------------------
# READ ONLY MODE
# ------------------------------------------------------------

if (-not $CreateBookings) {

    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Yellow
    Write-Host " READ-ONLY MODE" -ForegroundColor Yellow
    Write-Host "============================================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "No bookings were created."
    Write-Host ""
    Write-Host "If the dates look correct, run:"
    Write-Host ""
    Write-Host "  .\tools\setup-pay-tests.ps1 -CreateBookings" `
        -ForegroundColor Cyan
    Write-Host ""

    exit
}

# ------------------------------------------------------------
# CREATE BOOKINGS
# ------------------------------------------------------------

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " CREATE MODE ENABLED" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Creating PAY-TEST-018 through PAY-TEST-024..." -ForegroundColor Yellow
Write-Host "PAY-TEST-025 intentionally NOT created." -ForegroundColor Yellow
Write-Host "Creating PAY-TEST-026 through PAY-TEST-028..." -ForegroundColor Yellow
Write-Host ""

foreach ($test in $tests) {

    $checkIn  = [datetime]::Parse($test.CheckIn)
    $checkOut = [datetime]::Parse($test.CheckOut)

    $nights = [int](($checkOut - $checkIn).TotalDays)

    $depositPercentage = 0

    if ([double]$test.DepositAmount -gt 0) {
        $depositPercentage =
            ([double]$test.DepositAmount / 225) * 100
    }

    $fields = [ordered]@{}

    $fields["bookingReference"] =
        FS-String $test.Reference

    $fields["source"] =
        FS-String "Direct"

    $fields["channelBookingReference"] =
        FS-String $test.Reference

    $fields["isExternalBooking"] =
        FS-Bool $false

    $fields["guestName"] =
        FS-String "Payment Test Guest $($test.TestCase.Substring(9))"

    $fields["email"] =
        FS-String "paymenttest@example.com"

    $fields["phone"] =
        FS-String "0400000000"

    $fields["country"] =
        FS-String "Australia"

    $fields["checkin"] =
        FS-String $test.CheckIn

    $fields["checkout"] =
        FS-String $test.CheckOut

    $fields["adults"] =
        FS-Integer 2

    $fields["children"] =
        FS-Integer 0

    $fields["totalGuests"] =
        FS-Integer 2

    $fields["nights"] =
        FS-Integer $nights

    $fields["accommodationBase"] =
        FS-Integer 200

    $fields["accommodation"] =
        FS-Integer 200

    $fields["extraGuestFee"] =
        FS-Integer 0

    $fields["cleaningFee"] =
        FS-Integer 25

    $fields["total"] =
        FS-Integer 225

    $fields["currency"] =
        FS-String "AUD"

    $fields["depositPercentage"] =
        FS-Double $depositPercentage

    $fields["depositAmount"] =
        FS-Double $test.DepositAmount

    $fields["balanceAmount"] =
        FS-Double $test.BalanceAmount

    $fields["paymentStatus"] =
        FS-String $test.PaymentStatus

    $fields["balancePaymentStatus"] =
        FS-String $test.BalanceStatus

    $fields["balancePaid"] =
        FS-Bool $test.BalancePaid

    $fields["status"] =
        FS-String $test.Status

    $fields["specialRequests"] =
        FS-String $test.Notes

    $fields["externalBookingNotes"] =
        FS-String $test.Notes

    $fields["createdByUid"] =
        FS-String ""

    $fields["createdByEmail"] =
        FS-String ""

    $bodyObject = [ordered]@{
        fields = $fields
    }

    $body = $bodyObject | ConvertTo-Json -Depth 20

    Write-Host "Creating $($test.TestCase) / $($test.Reference)..." `
        -ForegroundColor Cyan

    try {

        $result = Invoke-RestMethod `
            -Method Post `
            -Uri $BookingsUrl `
            -ContentType "application/json" `
            -Body $body

        Write-Host "  SUCCESS" -ForegroundColor Green
    }
    catch {

        Write-Host "  FAILED" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        throw
    }
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " PAYMENT TEST BOOKINGS CREATED" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""

Write-Host "PAY-TEST-025 remains intentionally absent." -ForegroundColor Yellow
Write-Host ""
Write-Host "Next step: run the verification script."
Write-Host ""

