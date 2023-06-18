const express = require("express");
const connectToDatabase = require("../db/connection");
const { Snowflake } = require('@theinternetfolks/snowflake');
const auth = require("../middleware/auth");
const MemberRouter = express.Router();

MemberRouter.delete('/:id', auth, async (req, res) => {
    try {
        const memberId = req.params.id;

        const db = await connectToDatabase();
        const memberCollection = db.collection('Member');
        const communityCollection = db.collection('Community');

        // Check if the member exists
        const member = await memberCollection.findOne({ id: memberId });
        if (!member) {
            res.status(404).json({ error: 'Member not found' });
            return;
        }

        // Check if the user has the Community Admin or Community Moderator role
        const role = await communityCollection.findOne({ owner: req.userId });

        if (!role) return res.status(403).json({ error: 'NOT_ALLOWED_ACCESS' });

        // Remove the member from the database
        await memberCollection.deleteOne({ id: memberId });

    } catch (err) {
        console.error('Failed to retrieve roles:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

MemberRouter.post('/', auth, async (req, res) => {
    try {
        const { communityId, userId, roleId } = req.body;
        if (!communityId || !userId || !roleId) {
            res.status(400).json({ error: 'Invalid communityId, userId, or roleId' });
            return;
        }

        const db = await connectToDatabase();
        const communityCollection = db.collection('Community');
        const userCollection = db.collection('User');
        const memberCollection = db.collection('Member');
        const roleCollection = db.collection('Role');

        // Check if the community exists
        const community = await communityCollection.findOne({ id: communityId });
        if (!community) {
            res.status(404).json({ error: 'Community not found' });
            return;
        }

        // Check if the user exists
        const user = await userCollection.findOne({ id: userId });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Check if the role exists
        const role = await roleCollection.findOne({ id: roleId });
        if (!role) {
            res.status(404).json({ error: 'Role not found' });
            return;
        }

        // Check if the user has the Community Admin role
        if (community.owner !== req.userId) {
            res.status(403).json({ error: 'NOT_ALLOWED_ACCESS' });
            return;
        }

        const id = Snowflake.generate().toString();

        // Create the member object
        const member = {
            _id: id,
            id,
            community: communityId,
            user: userId,
            role: roleId,
            created_at: new Date(),
        };

        // Save the member in the database
        const result = await memberCollection.insertOne(member);

        const responseData = {
            status: true,
            content: {
                data: {
                    id: member.id,
                    community: communityId,
                    user: userId,
                    role: roleId,
                    created_at: member.created_at,
                },
            },
        };

        res.status(200).json(responseData);

    } catch (err) {
        console.error('Failed to create role:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = MemberRouter;