// ============================================
// Booking Summary
// ============================================

function calculateStay() {

    const checkIn =
        document.getElementById("checkin").value;

    const checkOut =
        document.getElementById("checkout").value;

    // ============================================
    // Dates not complete
    // Reset pricing
    // ============================================

    if (!checkIn || !checkOut) {

        document.getElementById("summaryNights").textContent =
            "0";

        calculatePrice(0);

        return;
    }

    // ============================================
    // Calculate Nights
    // ============================================

    const start =
        new Date(checkIn);

    const end =
        new Date(checkOut);

    const nights =
        Math.ceil(
            (end - start) /
            (1000 * 60 * 60 * 24)
        );

    // ============================================
    // Invalid stay
    // ============================================

    if (nights <= 0) {

        document.getElementById("summaryNights").textContent =
            "0";

        calculatePrice(0);

        return;
    }

    // ============================================
    // Valid Stay
    // ============================================

    document.getElementById("summaryNights").textContent =
        nights;

    calculatePrice(nights);

}