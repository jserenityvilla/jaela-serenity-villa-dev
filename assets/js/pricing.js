/*
====================================
Pricing Engine
Ja-Ela Serenity Villa
====================================
*/

const NIGHTLY_RATE = 120;

/*
====================================
Calculate Number of Nights
====================================
*/
function calculateNights(checkin, checkout) {

    if (!checkin || !checkout) {
        return 0;
    }

    const start = new Date(checkin);
    const end = new Date(checkout);

    const difference = end - start;

    const nights = Math.ceil(difference / (1000 * 60 * 60 * 24));

    return Math.max(nights, 0);

}

/*
====================================
Calculate Booking Price
====================================
*/
function calculatePrice() {

    const checkin = document.getElementById("checkin").value;
    const checkout = document.getElementById("checkout").value;

    const nights = calculateNights(checkin, checkout);

    return nights * NIGHTLY_RATE;

}

/*
====================================
Format Price
====================================
*/
function formatPrice(amount) {

    return "$" + Number(amount).toLocaleString();

}