const checkIn = flatpickr("#checkin", {
    dateFormat: "Y-m-d",
    minDate: "today",
    onChange: function(selectedDates) {

        if(selectedDates.length){

            const nextDay = new Date(selectedDates[0]);
            nextDay.setDate(nextDay.getDate()+1);

            checkOut.set("minDate", nextDay);

            calculateStay();
        }

    }
});

const checkOut = flatpickr("#checkout", {
    dateFormat: "Y-m-d",
    minDate: "today",
    onChange: calculateStay
});