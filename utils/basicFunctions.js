const jwt = require('jsonwebtoken');

// Email Validation
exports.validateEmail = (email) => {
    // Using a regular expression for basic email validation
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

// Generate Access Token
exports.generateAccessToken = (userId) => {
    const secretKey = process.env.SECRET_KEY || "THEINTERNETFOLKSSDENODEJSBACKEND"; // Secret key
    const payload = { id: userId };
    const options = { expiresIn: '24h' };
    return jwt.sign(payload, secretKey, options);
}

// generate the slug from the name
exports.generateSlug = (name) => {
    return name.toLowerCase().replace(/ /g, '-');
}