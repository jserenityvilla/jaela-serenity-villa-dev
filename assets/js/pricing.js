/* ============================================
 * Pricing Engine
 * Ja-Ela Serenity Villa
 * ============================================ */

function getPromotionDetails(promoCode) {

    const code =
        String(promoCode || "")
            .trim()
            .toUpperCase();

    if (!code) {

        return {
            valid: false,
            code: "",
            discountPercentage: 0,
            discountAmount: 0,
            reason: ""
        };

    }

    const promotion =
        CONFIG.promotions &&
        CONFIG.promotions.WELCOME10;

    if (
        !promotion ||
        code !== String(promotion.code).toUpperCase()
    ) {

        return {
            valid: false,
            code: code,
            discountPercentage: 0,
            discountAmount: 0,
            reason: "Invalid promotion code."
        };

    }

    const today =
        new Date();

    const expiry =
        new Date(
            `${promotion.expiry}T23:59:59`
        );

    if (today > expiry) {

        return {
            valid: false,
            code: code,
            discountPercentage: 0,
            discountAmount: 0,
            reason: "This promotion has expired."
        };

    }

    return {
        valid: true,
        code: promotion.code,
        discountPercentage:
            Number(
                promotion.discountPercentage
            ) || 0,
        discountAmount: 0,
        reason: ""
    };

}


function calculateBookingPricing(
    nights,
    adults,
    children,
    promoCode
) {

    const safeNights =
        Number(nights) || 0;

    const safeAdults =
        Number(adults) || 0;

    const safeChildren =
        Number(children) || 0;

    const totalGuests =
        safeAdults + safeChildren;

    const nightlyRate =
        Number(
            CONFIG.pricing.nightlyRate
        ) || 0;

    const cleaningFee =
        Number(
            CONFIG.pricing.cleaningFee
        ) || 0;

    const extraGuestRate =
        Number(
            CONFIG.pricing.extraGuestRate
        ) || 0;

    const baseOccupancy = 7;

    const extraGuests =
        Math.max(
            0,
            totalGuests - baseOccupancy
        );

    const accommodationBase =
        safeNights *
        nightlyRate;

    const extraGuestTotal =
        extraGuests *
        extraGuestRate *
        safeNights;

    const promotion =
        getPromotionDetails(
            promoCode
        );

    let promotionDiscount =
        0;

    if (
        promotion.valid &&
        CONFIG.promotions.WELCOME10.appliesTo ===
            "accommodation"
    ) {

        promotionDiscount =
            accommodationBase *
            promotion.discountPercentage /
            100;

    }

    const discountedAccommodation =
        Math.max(
            0,
            accommodationBase -
                promotionDiscount
        );

    const total =
        discountedAccommodation +
        extraGuestTotal +
        cleaningFee;

    return {

        nights: safeNights,

        adults: safeAdults,

        children: safeChildren,

        totalGuests: totalGuests,

        extraGuests: extraGuests,

        nightlyRate: nightlyRate,

        accommodationBase:
            accommodationBase,

        promotionCode:
            promotion.valid
                ? promotion.code
                : "",

        promotionValid:
            promotion.valid,

        promotionDiscountPercentage:
            promotion.valid
                ? promotion.discountPercentage
                : 0,

        promotionDiscount:
            promotionDiscount,

        accommodation:
            discountedAccommodation,

        extraGuestFee:
            extraGuestTotal,

        cleaningFee:
            cleaningFee,

        total:
            total

    };

}


function updatePromotionMessage(promoCode) {

    const promoMessageElement =
        document.getElementById(
            "promoMessage"
        );

    if (!promoMessageElement) {
        return;
    }

    const enteredCode =
        String(promoCode || "").trim();

    if (!enteredCode) {
        promoMessageElement.textContent =
            "Enter a valid promotion code if you have one.";
        return;
    }

    const promotion =
        getPromotionDetails(
            enteredCode
        );

    if (promotion.valid) {
        promoMessageElement.textContent =
            `${promotion.code} applied - ${promotion.discountPercentage}% off accommodation.`;
    }
    else {
        promoMessageElement.textContent =
            promotion.reason ||
            "Invalid promotion code.";
    }

}

function calculatePrice(nights) {

    const adults =
        Number(
            document.getElementById("adults").value
        ) || 0;

    const children =
        Number(
            document.getElementById("children").value
        ) || 0;

    const promoElement =
        document.getElementById("promoCode");

    const promoCode =
        promoElement
            ? promoElement.value
            : "";


    updatePromotionMessage(promoCode);

    const summaryGuests =
        document.getElementById("summaryGuests");

    if (summaryGuests) {

        summaryGuests.textContent =
            `${adults} Adults, ${children} Children`;

    }

    if (nights <= 0) {

        document.getElementById(
            "summaryAccommodation"
        ).textContent = "--";

        document.getElementById(
            "summaryExtraGuest"
        ).textContent = "--";

        document.getElementById(
            "summaryCleaningFee"
        ).textContent = "--";

        document.getElementById(
            "summaryTotal"
        ).textContent = "Select your dates";

        const discountElement =
            document.getElementById(
                "summaryPromotion"
            );

        if (discountElement) {
            discountElement.textContent = "--";
        }

        return;
    }

    const pricing =
        calculateBookingPricing(
            nights,
            adults,
            children,
            promoCode
        );

    document.getElementById(
        "summaryAccommodation"
    ).textContent =
        `AUD $${pricing.accommodation.toFixed(2)}`;

    document.getElementById(
        "summaryExtraGuest"
    ).textContent =
        `AUD $${pricing.extraGuestFee.toFixed(2)}`;

    document.getElementById(
        "summaryCleaningFee"
    ).textContent =
        `AUD $${pricing.cleaningFee.toFixed(2)}`;

    document.getElementById(
        "summaryTotal"
    ).textContent =
        `AUD $${pricing.total.toFixed(2)}`;

    const discountElement =
        document.getElementById(
            "summaryPromotion"
        );

    if (discountElement) {

        if (pricing.promotionValid) {

            discountElement.textContent =
                `- AUD $${pricing.promotionDiscount.toFixed(2)}`;

        }
        else {

            discountElement.textContent =
                "--";

        }

    }

}


window.getPromotionDetails =
    getPromotionDetails;

window.calculateBookingPricing =
    calculateBookingPricing;
