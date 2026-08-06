// ============================================
// Booking Summary
// ============================================

function calculateStay() {

    const checkIn = document.getElementById("checkin").value;
    const checkOut = document.getElementById("checkout").value;

    if (!checkIn || !checkOut) {

        document.getElementById("summaryNights").textContent = "0";
        document.getElementById("summaryTotal").textContent = "Select your dates";

        return;

    }

    const start = new Date(checkIn);
    const end = new Date(checkOut);

    const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    document.getElementById("summaryNights").textContent = nights;

    calculatePrice(nights);

}