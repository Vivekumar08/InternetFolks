const express = require("express");
const connectToDatabase = require("../db/connection");
const { Snowflake } = require('@theinternetfolks/snowflake');
const RoleRouter = express.Router();

RoleRouter.get('/', async (req, res) => {
    try {
        const db = await connectToDatabase();
        const collection = db.collection('Role');

        // Pagination settings
        const page = parseInt(req.query.page) || 1; // Current page (default: 1)
        const limit = 10; // Number of documents per page

        // Count total number of documents
        const total = await collection.countDocuments();

        // Calculate total number of pages
        const pages = Math.ceil(total / limit);

        const roles = await collection
            .find({})
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray();
        const responseData = {
            status: true,
            content: {
                meta: {
                    total,
                    pages,
                    page,
                },
                data: roles,
            },
        };
        res.json(responseData);
    } catch (err) {
        console.error('Failed to retrieve roles:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

RoleRouter.post('/', async (req, res) => {
    try {
        const db = await connectToDatabase();
        const collection = db.collection('Role');

        const { name } = req.body;

        if (name.length < 2) {
            return res.status(400).json({
                status: false,
                errors: [
                    {
                        param: "name",
                        message: "Name should be at least 2 characters.",
                        code: "INVALID_INPUT"
                    }
                ]
            });
        }

        if (name !== 'Community Admin' && name !== 'Community Member') {
            res.status(400).json({ error: 'Invalid role name' });
            return;
        }

        // Generate a unique ID using snowflake
        const id = Snowflake.generate().toString();

        const newRole = {
            _id: id,
            id,
            name,
            created_at: new Date(),
            updated_at: new Date(),
        };

        const result = await collection.insertOne(newRole);

        const responseData = {
            status: true,
            content: {
                data: {
                    id: newRole._id,
                    name: newRole.name,
                    created_at: newRole.created_at,
                    updated_at: newRole.updated_at
                },
            },
        };
        res.status(200).json(responseData);
    } catch (err) {
        console.error('Failed to create role:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = RoleRouter;