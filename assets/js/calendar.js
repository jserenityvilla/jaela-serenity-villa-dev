// ============================================
// Smart Calendar
// Ja-Ela Serenity Villa
// ============================================

let checkInPicker;
let checkOutPicker;

function initialiseCalendar() {

    checkInPicker = flatpickr("#checkin", {

        dateFormat: "Y-m-d",
        altInput: true,
        altFormat: "d M Y",
        minDate: "today",

        onChange: function (selectedDates) {

            if (selectedDates.length === 0) return;

            const nextDay = new Date(selectedDates[0]);
            nextDay.setDate(nextDay.getDate() + 1);

            checkOutPicker.set("minDate", nextDay);

            calculateStay();

        }

    });

    checkOutPicker = flatpickr("#checkout", {

        dateFormat: "Y-m-d",
        altInput: true,
        altFormat: "d M Y",
        minDate: "today",

        onChange: function () {

            calculateStay();

        }

    });

}