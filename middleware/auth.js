const jwt = require('jsonwebtoken');

module.exports = function auth(req, res, next) {
    try {

        const accessToken = req.cookies.access_token;
        // const accessToken = req.headers.authorization.split(" ")[1];
        if (!accessToken) {
            res.status(401).json({
                status: false,
                errors: [
                    {
                        message: "You need to sign in to proceed.",
                        code: "NOT_SIGNEDIN"
                    }
                ]
            });
            return;
        }

        // Verify the access token
        const secretKey = process.env.SECRET_KEY || "THEINTERNETFOLKSSDENODEJSBACKEND"; // Secret key
        jwt.verify(accessToken, secretKey, async (err, decoded) => {
            if (err) {
                res.status(401).json({
                    status: false,
                    errors: [
                        {
                            message: "Invalid Access Token",
                            code: "INVALID_TOKEN"
                        }
                    ]
                });
                return;
            }
            req.userId = decoded.id;
            next()
        })
    } catch (error) {
        console.error('Failed to verify user:', error);
        res.status(500).json({
            status: false,
            errors: [
                {
                    message: "Empty Access Token",
                    code: "UNDEFINED_TOKEN"
                }
            ]
        });
    }
}
