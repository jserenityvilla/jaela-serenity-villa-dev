const bookingReference =
    sessionStorage.getItem("bookingReference");

if (bookingReference) {

    document.getElementById("bookingReference").textContent =
        bookingReference;

}