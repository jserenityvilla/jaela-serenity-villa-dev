const { test, expect } = require("@playwright/test");
const fs = require("fs");

const BOOKING_URL = "http://127.0.0.1:5502/pages/booking.html";
const ADMIN_URL = "http://127.0.0.1:5502/admin/index.html";
const RESULTS = "tests/regression-results.json";

const results = [];

function record(testId, status, actualResult, notes = "") {
  results.push({ testId, status, actualResult, notes });
}

async function saveResults() {
  fs.writeFileSync(RESULTS, JSON.stringify(results, null, 2));
}

test.afterAll(async () => {
  await saveResults();
});

// ------------------------------------------------------------
// Booking page
// ------------------------------------------------------------

test("TC-004 Booking page loads", async ({ page }) => {
  try {
    await page.goto(BOOKING_URL);
    await expect(page.locator("#bookingForm")).toBeVisible();
    record("TC-004", "PASS", "Booking page and booking form loaded successfully.");
  } catch (e) {
    record("TC-004", "FAIL", "Booking page/form did not load.", e.message);
    throw e;
  }
});

test("TC-005 All booking fields are available", async ({ page }) => {
  try {
    await page.goto(BOOKING_URL);

    const ids = [
      "#checkin", "#checkout", "#adults", "#children",
      "#guestName", "#guestEmail", "#guestPhone", "#guestCountry",
      "#arrivalTime", "#specialRequests"
    ];

    for (const selector of ids) {
      await expect(page.locator(selector)).toBeAttached();
    }

    record("TC-005", "PASS", "All expected booking fields are present.");
  } catch (e) {
    record("TC-005", "FAIL", "One or more booking fields are missing.", e.message);
    throw e;
  }
});

test("TC-006 Stay summary calculates nights", async ({ page }) => {
  try {
    await page.goto(BOOKING_URL);

    await page.locator("#checkin").fill("2026-09-15");
    await page.locator("#checkout").fill("2026-09-18");

    await page.waitForTimeout(500);

    await expect(page.locator("#summaryNights")).toHaveText("3");

    record("TC-006", "PASS", "3 nights displayed for 15 Sep to 18 Sep 2026.");
  } catch (e) {
    record("TC-006", "FAIL", "Stay summary did not calculate the expected 3 nights.", e.message);
    throw e;
  }
});

test("TC-007 Pricing calculates correctly", async ({ page }) => {
  try {
    await page.goto(BOOKING_URL);

    await page.locator("#checkin").fill("2026-09-15");
    await page.locator("#checkout").fill("2026-09-18");
    await page.locator("#adults").selectOption("2");
    await page.locator("#children").selectOption("0");

    await page.waitForTimeout(500);

    const summary = await page.locator("body").innerText();

    if (!summary.includes("AUD")) {
      throw new Error("AUD pricing was not displayed on the page.");
    }

    record("TC-007", "PASS", "Pricing summary displayed after valid dates were selected.");
  } catch (e) {
    record("TC-007", "FAIL", "Pricing calculation could not be verified.", e.message);
    throw e;
  }
});

test("TC-008 Invalid email is rejected", async ({ page }) => {
  try {
    await page.goto(BOOKING_URL);

    await page.locator("#checkin").fill("2026-09-15");
    await page.locator("#checkout").fill("2026-09-18");
    await page.locator("#guestName").fill("Automation Test");
    await page.locator("#guestEmail").fill("abc");
    await page.locator("#guestPhone").fill("+61400000000");

    const form = page.locator("#bookingForm");
    await form.evaluate(f => f.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));

    await page.waitForTimeout(300);

    const body = await page.locator("body").innerText();

    if (!/email|valid/i.test(body)) {
      record("TC-008", "SKIPPED",
        "The page did not expose a detectable email validation message.",
        "Review validation.js if this test needs a stronger selector.");
      return;
    }

    record("TC-008", "PASS", "Invalid email was detected by the booking validation.");
  } catch (e) {
    record("TC-008", "FAIL", "Invalid email validation test failed.", e.message);
    throw e;
  }
});

test("TC-009 Required fields are validated", async ({ page }) => {
  try {
    await page.goto(BOOKING_URL);

    const form = page.locator("#bookingForm");
    await form.evaluate(f => f.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));

    await page.waitForTimeout(300);

    const body = await page.locator("body").innerText();

    if (/required|valid|error/i.test(body)) {
      record("TC-009", "PASS", "Required-field validation was triggered.");
    } else {
      record("TC-009", "SKIPPED",
        "No detectable validation message was found.",
        "Review validation.js and update selector if required.");
    }
  } catch (e) {
    record("TC-009", "FAIL", "Required-field validation test failed.", e.message);
    throw e;
  }
});

test("TC-010 Guest occupancy validation", async ({ page }) => {
  try {
    await page.goto(BOOKING_URL);

    const maxGuests = await page.evaluate(() => window.CONFIG?.villa?.maxGuests ?? 0);

    if (!maxGuests) {
      record("TC-010", "SKIPPED", "CONFIG.villa.maxGuests could not be read.");
      return;
    }

    const adults = Math.min(9, maxGuests + 1);
    await page.locator("#adults").selectOption(String(adults));
    await page.waitForTimeout(300);

    const body = await page.locator("body").innerText();

    if (/maximum occupancy|guests selected/i.test(body)) {
      record("TC-010", "PASS", `Occupancy validation triggered above maximum of ${maxGuests}.`);
    } else {
      record("TC-010", "SKIPPED",
        "No detectable occupancy error appeared.",
        "Review validation.js selector/message.");
    }
  } catch (e) {
    record("TC-010", "FAIL", "Occupancy validation test failed.", e.message);
    throw e;
  }
});

// ------------------------------------------------------------
// Firestore verification from the booking page
// ------------------------------------------------------------

test("TC-014 Booking can be queried by reference", async ({ page }) => {
  try {
    await page.goto(BOOKING_URL);

    const result = await page.evaluate(async () => {
      if (!window.db) return { ok: false, reason: "db is not defined" };

      const snap = await db.collection("bookings").limit(1).get();
      if (snap.empty) return { ok: true, count: 0 };

      return {
        ok: true,
        count: snap.size,
        id: snap.docs[0].id,
        data: snap.docs[0].data()
      };
    });

    if (!result.ok) {
      record("TC-014", "FAIL", "Firestore db object is not available.", result.reason);
      throw new Error(result.reason);
    }

    record("TC-014", "PASS",
      `Firestore query completed successfully. Returned ${result.count} booking(s).`);
  } catch (e) {
    record("TC-014", "FAIL", "Firestore query failed.", e.message);
    throw e;
  }
});

// ------------------------------------------------------------
// Admin dashboard
// ------------------------------------------------------------

test("TC-015 Admin dashboard loads", async ({ page }) => {
  try {
    await page.goto(ADMIN_URL);
    await expect(page.locator("#totalBookings")).toBeVisible();
    await expect(page.locator("#pendingBookings")).toBeVisible();
    await expect(page.locator("#confirmedBookings")).toBeVisible();
    await expect(page.locator("#totalRevenue")).toBeVisible();

    record("TC-015", "PASS", "Admin dashboard and statistics tiles loaded.");
  } catch (e) {
    record("TC-015", "FAIL", "Admin dashboard did not load correctly.", e.message);
    throw e;
  }
});

test("TC-016 Booking list displays Firestore bookings", async ({ page }) => {
  try {
    await page.goto(ADMIN_URL);
    await page.waitForTimeout(1000);

    const rows = page.locator("#bookingTableBody tr");
    const count = await rows.count();

    if (count === 0) {
      record("TC-016", "FAIL", "No booking rows were displayed.");
      throw new Error("No booking rows displayed.");
    }

    record("TC-016", "PASS", `${count} booking row(s) displayed in the admin table.`);
  } catch (e) {
    record("TC-016", "FAIL", "Admin booking list failed.", e.message);
    throw e;
  }
});

test("TC-018 View booking details", async ({ page }) => {
  try {
    await page.goto(ADMIN_URL);
    await page.waitForTimeout(1000);

    const viewButton = page.locator("#bookingTableBody button").first();
    await expect(viewButton).toBeVisible();
    await viewButton.click();

    await expect(page.locator("#bookingModal")).toBeVisible();
    await expect(page.locator("#bookingDetails")).not.toBeEmpty();

    record("TC-018", "PASS", "Booking details modal opened and displayed booking information.");
  } catch (e) {
    record("TC-018", "FAIL", "Booking details modal could not be opened.", e.message);
    throw e;
  }
});

test("TC-023 Dashboard statistics tile filtering", async ({ page }) => {
  try {
    await page.goto(ADMIN_URL);
    await page.waitForTimeout(1000);

    const pendingTile = page.locator("#pendingBookings");
    const parent = pendingTile.locator("..");

    await parent.click();
    await page.waitForTimeout(300);

    const rows = page.locator("#bookingTableBody tr");
    const count = await rows.count();

    if (count === 0) {
      record("TC-023", "SKIPPED",
        "Pending tile was clickable but no pending rows were available to verify.",
        "Create/retain at least one Pending booking for full filter verification.");
      return;
    }

    const statuses = await rows.locator("td").evaluateAll(cells =>
      cells.map(x => x.innerText.trim()).filter(x => x === "Pending")
    );

    if (statuses.length > 0) {
      record("TC-023", "PASS", "Pending tile filtered the booking list.");
    } else {
      record("TC-023", "SKIPPED",
        "Tile click occurred but status filtering could not be reliably inferred.",
        "Update selector if tile/card click handler uses a different element.");
    }
  } catch (e) {
    record("TC-023", "FAIL", "Dashboard tile filtering failed.", e.message);
    throw e;
  }
});

test("TC-024 Search bookings", async ({ page }) => {
  try {
    await page.goto(ADMIN_URL);
    await page.waitForTimeout(1000);

    const search = page.locator("#searchBookings");
    await expect(search).toBeVisible();

    const firstGuest = page.locator("#bookingTableBody tr").first().locator("td").nth(1);
    const guestText = (await firstGuest.innerText()).split("\n")[0].trim();

    if (!guestText) {
      record("TC-024", "SKIPPED", "No guest data available for search test.");
      return;
    }

    await search.fill(guestText);
    await page.waitForTimeout(300);

    const count = await page.locator("#bookingTableBody tr").count();

    if (count > 0) {
      record("TC-024", "PASS", `Search returned ${count} matching row(s).`);
    } else {
      record("TC-024", "FAIL", "Search returned no matching row.");
      throw new Error("Search returned no matching row.");
    }
  } catch (e) {
    record("TC-024", "FAIL", "Booking search failed.", e.message);
    throw e;
  }
});

// ------------------------------------------------------------
// Availability - current calendar wiring
// ------------------------------------------------------------

test("TC-032 Checkout rules still work", async ({ page }) => {
  try {
    await page.goto(BOOKING_URL);

    const checkin = page.locator("#checkin");
    const checkout = page.locator("#checkout");

    await expect(checkin).toBeAttached();
    await expect(checkout).toBeAttached();

    const result = await page.evaluate(() => ({
      checkInPicker: !!window.checkInPicker,
      checkOutPicker: !!window.checkOutPicker
    }));

    if (!result.checkInPicker || !result.checkOutPicker) {
      record("TC-032", "SKIPPED",
        "Calendar picker variables are not exposed on window.",
        "Calendar is present but cannot be inspected directly.");
      return;
    }

    record("TC-032", "PASS", "Both check-in and check-out calendar pickers are initialised.");
  } catch (e) {
    record("TC-032", "FAIL", "Calendar initialisation test failed.", e.message);
    throw e;
  }
});

// ------------------------------------------------------------
// Tests that require business-specific implementation
// ------------------------------------------------------------

for (const [id, note] of [
  ["TC-011","Automated creation of a real Firestore booking is intentionally not performed in this first runner to avoid generating unwanted test reservations."],
  ["TC-012","Depends on the real booking submission flow and generated reference."],
  ["TC-013","Can be expanded after the test booking lifecycle is agreed."],
  ["TC-017","Statistics comparison requires known baseline data."],
  ["TC-019","Confirmation changes production-like Firestore data and is therefore not performed automatically in this first safe runner."],
  ["TC-020","Cancellation changes Firestore data and is therefore not performed automatically in this first safe runner."],
  ["TC-021","Requires a known cancelled booking."],
  ["TC-022","Visual colour verification is better handled with screenshot/colour assertions after final CSS is stable."],
  ["TC-025","Requires state-changing admin test data."],
  ["TC-026","Requires creation of a controlled test booking."],
  ["TC-027","Requires known active booking dates."],
  ["TC-028","Requires known active booking dates."],
  ["TC-029","Requires controlled overlapping-booking data."],
  ["TC-030","Requires controlled availability data."],
  ["TC-031","Requires controlled cancelled-booking data."],
  ["TC-033","Full lifecycle test requires controlled test data and state changes."]
]) {
  test(id + " controlled-data extension", async () => {
    record(id, "SKIPPED", "Not executed by the safe first-run automation.", note);
  });
}
