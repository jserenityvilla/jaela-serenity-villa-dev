// ============================================
// Pricing Engine
// Ja-Ela Serenity Villa
// ============================================

function calculatePrice(nights) {

    const adults =
        Number(document.getElementById("adults").value) || 0;

    const children =
        Number(document.getElementById("children").value) || 0;

    const totalGuests = adults + children;

    // ============================================
    // No valid stay selected
    // Reset all costs
    // ============================================

    if (nights <= 0) {

        document.getElementById("summaryAccommodation").textContent =
            "--";

        document.getElementById("summaryExtraGuest").textContent =
            "--";

        document.getElementById("summaryCleaningFee").textContent =
            "--";

        document.getElementById("summaryTotal").textContent =
            "Select your dates";

        return;
    }

    // ============================================
    // Pricing Configuration
    // ============================================

    const nightlyRate =
        CONFIG.pricing.nightlyRate;

    const cleaningFee =
        CONFIG.pricing.cleaningFee;

    const extraGuestRate =
        CONFIG.pricing.extraGuestRate;

    // Villa rate includes up to 7 guests

    const baseOccupancy = 7;

    const extraGuests =
        Math.max(0, totalGuests - baseOccupancy);

    // ============================================
    // Calculate Costs
    // ============================================

    const accommodationTotal =
        nights * nightlyRate;

    const extraGuestTotal =
        extraGuests *
        extraGuestRate *
        nights;

    const total =
        accommodationTotal +
        extraGuestTotal +
        cleaningFee;

    // ============================================
    // Update Summary
    // ============================================

    document.getElementById("summaryAccommodation").textContent =
        `AUD $${accommodationTotal.toFixed(2)}`;

    document.getElementById("summaryExtraGuest").textContent =
        `AUD $${extraGuestTotal.toFixed(2)}`;

    document.getElementById("summaryCleaningFee").textContent =
        `AUD $${cleaningFee.toFixed(2)}`;

    document.getElementById("summaryTotal").textContent =
        `AUD $${total.toFixed(2)}`;

}