// ============================================
// Pricing Engine
// ============================================

const NIGHTLY_RATE = CONFIG.pricing.nightlyRate;

function calculatePrice(nights) {

    if (nights <= 0) {

        document.getElementById("summaryAccommodation").textContent = "$0";
        document.getElementById("summaryTotal").textContent = "Select your dates";

        return;

    }

    const total = nights * NIGHTLY_RATE;

    document.getElementById("summaryAccommodation").textContent =
        "$" + total;

    document.getElementById("summaryTotal").textContent =
        "$" + total;

}