/*
====================================
Stay Summary
Ja-Ela Serenity Villa
====================================
*/

function updateSummary() {

    const checkin = document.getElementById("checkin").value;
    const checkout = document.getElementById("checkout").value;

    const adults = document.getElementById("adults").value;
    const children = document.getElementById("children").value;

    const nights = calculateNights(checkin, checkout);
    const total = calculatePrice();

    // Update Guests
    document.getElementById("summaryGuests").textContent =
        adults + " Adults, " + children + " Children";

    // Update Nights
    document.getElementById("summaryNights").textContent = nights;

    // Update Total
    if (nights > 0) {

        document.getElementById("summaryTotal").textContent =
            "$" + total;

    } else {

        document.getElementById("summaryTotal").textContent =
            "Select your dates";

    }

}
function calculateStay(){

    const checkInDate = document.getElementById("checkin").value;
    const checkOutDate = document.getElementById("checkout").value;

    if(!checkInDate || !checkOutDate)
        return;

    const start = new Date(checkInDate);
    const end = new Date(checkOutDate);

    const nights = Math.ceil(
        (end-start)/(1000*60*60*24)
    );

    document.getElementById("summaryNights").textContent = nights;
}