const firebaseAdmin = require("firebase-admin");

/**
 * Verify that an incoming request has a valid Firebase ID token
 * and that the authenticated user has the admin role.
 *
 * This helper is currently not connected to any Cloud Function.
 * It will be integrated and tested before deployment.
 */
async function verifyAdminRequest(req) {

    const authorization =
        req.headers.authorization || "";

    if (!authorization.startsWith("Bearer ")) {

        throw new Error(
            "Missing or invalid Authorization header."
        );

    }

    const idToken =
        authorization.substring(7);

    const decodedToken =
        await firebaseAdmin
            .auth()
            .verifyIdToken(idToken);

    if (decodedToken.role !== "admin") {

        throw new Error(
            "User is not authorised as an administrator."
        );

    }

    return decodedToken;
}

module.exports = {
    verifyAdminRequest
};
