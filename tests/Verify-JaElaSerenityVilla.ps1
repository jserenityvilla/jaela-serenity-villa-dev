<#
.SYNOPSIS
    Reusable production regression / smoke test for Ja-Ela Serenity Villa.

.DESCRIPTION
    Performs automated HTTP/content checks for the website. It checks:
      - Homepage availability
      - Required homepage content
      - Hero image reference
      - Homepage gallery preview
      - Gallery page and gallery sections
      - Required gallery CSS/JS
      - A sample/all gallery image URLs discovered from gallery.html
      - Footer and disclaimer
      - Book Now negative test (must not be active/visible in HTML)
      - Internal navigation links
    Results are written to the console and to test-results\Website-Regression-<timestamp>.csv/.txt.

.NOTES
    This script cannot replace visual/mobile testing, browser-console testing, or
    lightbox interaction testing. Those remain manual regression checks.
#>

[CmdletBinding()]
param(
    [string]$BaseUrl = "https://www.jaelaserenityvilla.com",
    [switch]$SkipLinkChecks
)

$ErrorActionPreference = "Stop"
$BaseUrl = $BaseUrl.TrimEnd("/")

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$resultsDir = Join-Path $PSScriptRoot "test-results"
New-Item -ItemType Directory -Force -Path $resultsDir | Out-Null

$csvPath = Join-Path $resultsDir "Website-Regression-$timestamp.csv"
$txtPath = Join-Path $resultsDir "Website-Regression-$timestamp.txt"

$results = New-Object System.Collections.Generic.List[object]

function Add-Result {
    param(
        [string]$Id,
        [string]$Area,
        [string]$Test,
        [bool]$Passed,
        [string]$Details
    )

    $status = if ($Passed) { "PASS" } else { "FAIL" }
    $results.Add([pscustomobject]@{
        ID      = $Id
        Area    = $Area
        Test    = $Test
        Result  = $status
        Details = $Details
    })

    $colour = if ($Passed) { "Green" } else { "Red" }
    Write-Host ("[{0}] {1} - {2}" -f $status, $Id, $Test) -ForegroundColor $colour
    if ($Details) { Write-Host "       $Details" }
}

function Get-Page {
    param([string]$Url)

    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 30
        return $response
    }
    catch {
        return $null
    }
}

function Resolve-Url {
    param(
        [string]$Link,
        [string]$PageUrl
    )

    if ([string]::IsNullOrWhiteSpace($Link)) { return $null }
    if ($Link.StartsWith("#")) { return $PageUrl + $Link }
    try {
        return ([System.Uri]::new([System.Uri]$PageUrl, $Link)).AbsoluteUri
    }
    catch {
        return $null
    }
}

Write-Host ""
Write-Host "Ja-Ela Serenity Villa - Production Regression Test" -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl"
Write-Host "Started : $(Get-Date)"
Write-Host ""

# ---------------------------------------------------------------------------
# 1. Homepage
# ---------------------------------------------------------------------------
$homePageUrl = "$BaseUrl/"
$homePage = Get-Page $homePageUrl

Add-Result "PROD-01" "Homepage" "Homepage is reachable" ($null -ne $homePage) `
    $(if ($homePage) { "HTTP $($homePage.StatusCode)" } else { "Unable to retrieve homepage" })

if ($homePage) {
    $homePageHtml = $homePage.Content

    Add-Result "PROD-03" "Homepage" "Villa logo reference exists" `
        ($homePageHtml -match 'assets/images/logo\.png') "Expected logo asset reference"

    Add-Result "PROD-04" "Homepage" "Villa name is present" `
        ($homePageHtml -match 'Ja-Ela Serenity Villa') "Expected villa name text"

    Add-Result "PROD-05" "Homepage" "Hero section exists" `
        ($homePageHtml -match '<section[^>]+id=["'']welcome["''][^>]*class=["''][^"'']*hero') `
        "Expected #welcome hero section"

    Add-Result "PROD-06" "Homepage" "Hero text is present" `
        ($homePageHtml -match 'Your Peaceful Retreat Near') "Expected hero heading"

    Add-Result "PRE-01" "Gallery Preview" "Homepage gallery preview exists" `
        ($homePageHtml -match 'GALLERY PREVIEW|Villa Gallery') "Expected gallery preview heading"

    Add-Result "PRE-04" "Gallery Preview" "View Gallery link exists" `
        ($homePageHtml -match 'pages/gallery\.html') "Expected link to pages/gallery.html"

    # Negative booking test: remove HTML comments before searching for Book Now.
    $homePageWithoutComments = [regex]::Replace($homePageHtml, '<!--[\s\S]*?-->', '')
    $bookNowActive = $homePageWithoutComments -match 'Book\s*Now'
    Add-Result "BOOK-01" "Booking" "Book Now is not active in homepage HTML" `
        (-not $bookNowActive) "Book Now must remain hidden until booking is production-ready"

    Add-Result "FTR-01" "Footer" "Footer exists" `
        ($homePageHtml -match '<footer[^>]+class=["''][^"'']*site-footer') "Expected site footer"

    Add-Result "FTR-05" "Footer" "Disclaimer heading exists" `
        ($homePageHtml -match 'Disclaimer') "Expected Disclaimer"

    Add-Result "FTR-07" "Footer" "2026 copyright text exists" `
        ($homePageHtml -match '2026') "Expected 2026 copyright text"
}

# ---------------------------------------------------------------------------
# 2. Gallery page
# ---------------------------------------------------------------------------
$galleryUrl = "$BaseUrl/pages/gallery.html"
$gallery = Get-Page $galleryUrl

Add-Result "GAL-01" "Gallery" "Gallery page is reachable" ($null -ne $gallery) `
    $(if ($gallery) { "HTTP $($gallery.StatusCode)" } else { "Unable to retrieve gallery page" })

if ($gallery) {
    $galleryHtml = $gallery.Content

    Add-Result "GAL-02" "Gallery" "Gallery heading is present" `
        ($galleryHtml -match 'Gallery') "Expected Gallery heading/content"

    Add-Result "GAL-CSS" "Gallery" "Gallery CSS is referenced" `
        ($galleryHtml -match 'assets/css/gallery\.css') "Expected gallery.css"

    Add-Result "GAL-JS" "Gallery" "Gallery JavaScript is referenced" `
        ($galleryHtml -match 'assets/js/gallery\.js') "Expected gallery.js"

    $sections = @(
        @{ Id="exterior"; Label="Exterior"; TestId="GAL-03" },
        @{ Id="living-dining"; Label="Living/Dining"; TestId="GAL-04" },
        @{ Id="living-dining"; Label="Dining/Living content"; TestId="GAL-05" },
        @{ Id="bedrooms"; Label="Bedrooms"; TestId="GAL-06" },
        @{ Id="kitchen"; Label="Kitchen"; TestId="GAL-07" },
        @{ Id="garden"; Label="Garden"; TestId="GAL-08" },
        @{ Id="bathrooms"; Label="Bathrooms"; TestId="GAL-09" }
    )

    foreach ($section in $sections) {
        $found = $galleryHtml -match ('id=["'']' + [regex]::Escape($section.Id) + '["'']')
        Add-Result $section.TestId "Gallery" "$($section.Label) section exists" $found `
            "Expected section id '$($section.Id)'"
    }

    # Discover image URLs from the gallery page and verify each local image.
    $imageMatches = [regex]::Matches($galleryHtml, '(?:src|data-src)=["'']([^"'']+)["'']', 'IgnoreCase')
    $imageUrls = New-Object System.Collections.Generic.List[string]

    foreach ($m in $imageMatches) {
        $src = $m.Groups[1].Value
        if ($src -match '^(\.\./)?assets/images/gallery/' -or $src -match '^assets/images/gallery/') {
            $u = Resolve-Url $src $galleryUrl
            if ($u -and -not $imageUrls.Contains($u)) {
                $imageUrls.Add($u)
            }
        }
    }

    $imagePass = $true
    $imageFailCount = 0

    foreach ($imageUrl in $imageUrls) {
        $img = Get-Page $imageUrl
        if (-not $img) {
            $imagePass = $false
            $imageFailCount++
            Write-Host "[FAIL] Gallery image: $imageUrl" -ForegroundColor Red
        }
    }

    Add-Result "GAL-IMG" "Gallery" "All discovered gallery image URLs are reachable" `
        $imagePass "Checked $($imageUrls.Count) gallery image URLs; failures: $imageFailCount"
}

# ---------------------------------------------------------------------------
# 3. Required assets
# ---------------------------------------------------------------------------
$requiredAssets = @(
    @{ Id="ASSET-01"; Path="/assets/images/logo.png"; Label="Logo" },
    @{ Id="ASSET-02"; Path="/assets/images/hero.jpg"; Label="Hero image" },
    @{ Id="ASSET-03"; Path="/assets/css/style-new.css"; Label="Homepage CSS" },
    @{ Id="ASSET-04"; Path="/assets/css/gallery.css"; Label="Gallery CSS" },
    @{ Id="ASSET-05"; Path="/assets/js/gallery.js"; Label="Gallery JS" }
)

foreach ($asset in $requiredAssets) {
    $assetUrl = "$BaseUrl$($asset.Path)"
    $assetResponse = Get-Page $assetUrl
    Add-Result $asset.Id "Assets" "$($asset.Label) is reachable" ($null -ne $assetResponse) $assetUrl
}

# ---------------------------------------------------------------------------
# 4. Internal link checks
# ---------------------------------------------------------------------------
if (-not $SkipLinkChecks -and $homePage) {
    $linkMatches = [regex]::Matches($homePageHtml, '<a[^>]+href=["'']([^"'']+)["'']', 'IgnoreCase')
    $internalUrls = New-Object System.Collections.Generic.List[string]

    foreach ($m in $linkMatches) {
        $href = $m.Groups[1].Value
        if ($href -match '^(#|mailto:|tel:|javascript:|https?://)') { continue }

        $u = Resolve-Url $href $homePageUrl
        if ($u -and $u.StartsWith($BaseUrl) -and -not $internalUrls.Contains($u)) {
            $internalUrls.Add($u)
        }
    }

    $linkFailures = 0
    foreach ($u in $internalUrls) {
        $r = Get-Page $u
        if (-not $r) {
            $linkFailures++
            Write-Host "[FAIL] Internal link: $u" -ForegroundColor Red
        }
    }

    Add-Result "NAV-LINKS" "Navigation" "Homepage internal links are reachable" `
        ($linkFailures -eq 0) "Checked $($internalUrls.Count) internal links; failures: $linkFailures"
}

# ---------------------------------------------------------------------------
# 5. Summary / report files
# ---------------------------------------------------------------------------
$results | Export-Csv -NoTypeInformation -Encoding UTF8 -Path $csvPath

$passCount = @($results | Where-Object Result -eq "PASS").Count
$failCount = @($results | Where-Object Result -eq "FAIL").Count
$totalCount = $results.Count

$summary = @"
Ja-Ela Serenity Villa - Website Regression Test
Base URL: $BaseUrl
Run time: $(Get-Date)

TOTAL: $totalCount
PASS : $passCount
FAIL : $failCount

"@

$summary += ($results | Format-Table -AutoSize | Out-String)
$summary | Set-Content -Encoding UTF8 -Path $txtPath

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "TOTAL: $totalCount   PASS: $passCount   FAIL: $failCount"
Write-Host "CSV : $csvPath"
Write-Host "TEXT: $txtPath"
Write-Host "============================================" -ForegroundColor Cyan

if ($failCount -gt 0) {
    exit 1
}
exit 0
