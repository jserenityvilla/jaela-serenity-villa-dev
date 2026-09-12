const firebaseAdmin = require("../functions/node_modules/firebase-admin");

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

firebaseAdmin.initializeApp({
    projectId: "ja-ela-serenity-villa-test"
});

const db = firebaseAdmin.firestore();

const categories = [
    {
        name: "Accommodation",
        categoryType: "Income",
        description: "Accommodation revenue",
        sortOrder: 1
    },
    {
        name: "Extra Guest Fee",
        categoryType: "Income",
        description: "Additional guest charges",
        sortOrder: 2
    },
    {
        name: "Cleaning Fee",
        categoryType: "Income",
        description: "Cleaning fees charged to guests",
        sortOrder: 3
    },
    {
        name: "Other Income",
        categoryType: "Income",
        description: "Other property income",
        sortOrder: 4
    },
    {
        name: "Cleaning",
        categoryType: "Expense",
        description: "Cleaning expenses",
        sortOrder: 10
    },
    {
        name: "Laundry",
        categoryType: "Expense",
        description: "Laundry expenses",
        sortOrder: 11
    },
    {
        name: "Toiletries & Consumables",
        categoryType: "Expense",
        description: "Guest consumables and toiletries",
        sortOrder: 12
    },
    {
        name: "Maintenance",
        categoryType: "Expense",
        description: "Routine maintenance expenses",
        sortOrder: 13
    },
    {
        name: "Repairs",
        categoryType: "Expense",
        description: "Repair expenses",
        sortOrder: 14
    },
    {
        name: "Gardening",
        categoryType: "Expense",
        description: "Gardening expenses",
        sortOrder: 15
    },
    {
        name: "Security",
        categoryType: "Expense",
        description: "Security expenses",
        sortOrder: 16
    },
    {
        name: "Insurance",
        categoryType: "Expense",
        description: "Insurance expenses",
        sortOrder: 17
    },
    {
        name: "Other Property Expense",
        categoryType: "Expense",
        description: "Other property expenses",
        sortOrder: 18
    },
    {
        name: "Electricity",
        categoryType: "Utility",
        description: "Electricity utility expense",
        sortOrder: 20
    },
    {
        name: "Water",
        categoryType: "Utility",
        description: "Water utility expense",
        sortOrder: 21
    },
    {
        name: "Gas",
        categoryType: "Utility",
        description: "Gas utility expense",
        sortOrder: 22
    },
    {
        name: "Internet",
        categoryType: "Utility",
        description: "Internet utility expense",
        sortOrder: 23
    },
    {
        name: "Waste",
        categoryType: "Utility",
        description: "Waste collection utility expense",
        sortOrder: 24
    },
    {
        name: "Other Utility",
        categoryType: "Utility",
        description: "Other utility expense",
        sortOrder: 25
    }
];

async function seedCategories() {

    const snapshot =
        await db
            .collection("categories")
            .get();

    const existing = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    const existingKeys = new Set(
        existing.map(category =>
            `${String(category.name || "").trim().toLowerCase()}|${category.categoryType}`
        )
    );

    const batch = db.batch();
    let created = 0;
    let skipped = 0;

    for (const category of categories) {

        const key =
            `${category.name.trim().toLowerCase()}|${category.categoryType}`;

        if (existingKeys.has(key)) {
            skipped++;
            continue;
        }

        const documentRef =
            db.collection("categories").doc();

        batch.set(documentRef, {
            name: category.name,
            categoryType: category.categoryType,
            parentCategoryId: null,
            description: category.description,
            active: true,
            sortOrder: category.sortOrder,
            createdAt:
                firebaseAdmin.firestore.FieldValue.serverTimestamp(),
            updatedAt:
                firebaseAdmin.firestore.FieldValue.serverTimestamp()
        });

        created++;
    }

    if (created > 0) {
        await batch.commit();
    }

    console.log(`Categories created: ${created}`);
    console.log(`Categories already present: ${skipped}`);
}

seedCategories()
    .catch(error => {
        console.error("Category seed failed:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await firebaseAdmin.app().delete();
    });
