const express = require("express");
const connectToDatabase = require("../db/connection");
const { Snowflake } = require('@theinternetfolks/snowflake');
const { generateSlug } = require("../utils/basicFunctions");
const auth = require("../middleware/auth");
const CommunityRouter = express.Router();

// Create a new community
CommunityRouter.post('/', auth, async (req, res) => {
    try {
        const { name } = req.body;

        // Validate the name field
        if (!name || name.length < 2) {
            res.status(400).json({
                status: false,
                errors: [
                    {
                        param: "name",
                        message: "Name should be at least 2 characters.",
                        code: "INVALID_INPUT"
                    }
                ]
            });
            return;
        }

        const db = await connectToDatabase();
        const communityCollection = db.collection('Community');
        const memberCollection = db.collection('Member');
        const userCollection = db.collection('User');
        const roleCollection = db.collection('Role');

        // Generate the slug from the name
        const slug = generateSlug(name);
        const ownerId = req.userId;
        const id = Snowflake.generate().toString();

        const community = {
            _id: id,
            id,
            name,
            slug,
            owner: ownerId,
            created_at: new Date(),
            updated_at: new Date()
        };

        // Check if the owner ID exists in the User collection
        const ownerExists = await userCollection.findOne({ id: ownerId });

        if (!ownerExists) {
            res.status(404).json({
                status: false,
                errors: [
                    {
                        param: "signin",
                        message: "You should signed in first.",
                        code: "NOT_SIGNED_IN"
                    }
                ]
            });
            return;
        }

        const role = await roleCollection.findOne({ name: "Community Admin" })

        // Create the member object
        const member = {
            _id: Snowflake.generate().toString(),
            id,
            community: id,
            user: ownerId,
            role: role.id,
            created_at: new Date(),
        };
        // Save the member in the database
        await memberCollection.insertOne(member);
        await communityCollection.insertOne(community);

        const responseData = {
            status: true,
            content: {
                data: {
                    id: community.id,
                    name: community.name,
                    slug: community.slug,
                    owner: ownerId,
                    created_at: community.created_at,
                    updated_at: community.updated_at
                },
            },
        };

        res.status(200).json(responseData)

    } catch (err) {
        console.error('Failed to create role:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all communities
CommunityRouter.get('/', async (req, res) => {
    try {
        const db = await connectToDatabase();
        const perPage = 10; // Number of documents per page
        const page = parseInt(req.query.page) || 1; // Current page number

        // Count total number of documents
        const communityCollection = db.collection('Community');
        const totalDocuments = await communityCollection.countDocuments();

        // Calculate total number of pages
        const totalPages = Math.ceil(totalDocuments / perPage);

        // Retrieve communities for the current page with owner expansion
        const communitiesWithOwner = await communityCollection
            .aggregate([
                // { $match: { owner: communityId } },
                { $lookup: { from: 'User', localField: 'owner', foreignField: 'id', as: 'userDetails' } },
                { $unwind: '$userDetails' },
                { $project: { _id: 0, id: 1, community: 1, name: 1, slug: 1, owner: { id: '$userDetails.id', name: '$userDetails.name' }, created_at: 1, updated_at: new Date() } },
                { $limit: perPage },
                { $skip: (page - 1) * perPage }
            ])
            .toArray();

        const response = {
            status: true,
            content: {
                meta: {
                    total: totalDocuments,
                    pages: totalPages,
                    page: page
                },
                data: communitiesWithOwner
            }
        };

        res.status(200).json(response);
    } catch (error) {
        console.error('Error retrieving members:', error);
        res.status(500).json({ error: 'An error occurred while retrieving members' });
    }
});

// Get all members of a community
CommunityRouter.get('/:id/members', async (req, res) => {
    try {
        const db = await connectToDatabase();
        const communityId = req.params.id;
        const perPage = 10; // Number of documents per page
        const page = parseInt(req.query.page) || 1; // Current page number

        const communityCollection = db.collection('Community');
        const userCollection = db.collection('User');
        const memberCollection = db.collection('Member');

        // Count total number of documents
        const totalDocuments = await memberCollection
            .countDocuments({ community: communityId });

        // Calculate total number of pages
        const totalPages = Math.ceil(totalDocuments / perPage);

        const members = await memberCollection
            .aggregate([
                { $match: { community: communityId } },
                { $lookup: { from: 'User', localField: 'user', foreignField: 'id', as: 'userDetails' } },
                { $lookup: { from: 'Role', localField: 'role', foreignField: 'id', as: 'role' } },
                { $unwind: '$userDetails' },
                { $unwind: '$role' },
                { $project: { _id: 0, id: 1, community: 1, user: { id: '$userDetails.id', name: '$userDetails.name' }, role: { id: '$role.id', name: '$role.name' }, created_at: 1, updated_at: new Date() } },
                { $limit: perPage },
                { $skip: (page - 1) * perPage }
            ])
            .toArray();

        const response = {
            status: true,
            content: {
                meta: {
                    total: totalDocuments,
                    pages: totalPages,
                    page: page
                },
                data: members
            }
        };
        res.status(200).json(response);
    } catch (error) {
        console.error('Error retrieving members:', error);
        res.status(500).json({ error: 'An error occurred while retrieving members' });
    }
});

// Get communities owned by the authenticated user
CommunityRouter.get('/me/owner', auth, async (req, res) => {
    try {
        const userId = req.userId;
        const db = await connectToDatabase();
        const perPage = 10; // Number of documents per page
        const page = parseInt(req.query.page) || 1; // Current page number

        // Count total number of owned communities for the user
        const communityCollection = db.collection('Community');
        const totalDocuments = await communityCollection
            .countDocuments({ owner: userId });

        // Calculate total number of pages
        const totalPages = Math.ceil(totalDocuments / perPage);

        const userCollection = db.collection('User');
        const memberCollection = db.collection('Member');

        // Retrieve owned communities for the current page
        const communities = await communityCollection
            .find({ owner: userId })
            .project({ _id: 0, id: 1, name: 1, slug: 1, owner: 1, created_at: 1, updated_at: 1 })
            .limit(perPage)
            .skip((page - 1) * perPage)
            .toArray();

        const response = {
            status: true,
            content: {
                meta: {
                    total: totalDocuments,
                    pages: totalPages,
                    page: page
                },
                data: communities
            }
        };

        res.status(200).json(response)
    } catch (error) {
        console.error('Error retrieving owners:', error);
        res.status(500).json({ error: 'An error occurred while retrieving owner' });
    }
});

// Get communities joined by the authenticated user
CommunityRouter.get('/me/member', auth, async (req, res) => {
    try {
        const db = await connectToDatabase();
        const userId = req.userId;
        const perPage = 10; // Number of documents per page
        const page = parseInt(req.query.page) || 1; // Current page number

        const communityCollection = db.collection('Community');
        const userCollection = db.collection('User');
        const memberCollection = db.collection('Member');

        const community = await communityCollection.findOne({ owner: userId })
        const totalDocuments = await memberCollection
            .countDocuments({ community: community.id });

        const totalPages = Math.ceil(totalDocuments / perPage);

        const communities = await memberCollection
            .aggregate([
                { $match: { community: community.id } },
                {
                    $lookup: {
                        from: 'Community',
                        localField: 'community',
                        foreignField: 'id',
                        as: 'community'
                    }
                },
                { $unwind: '$community' },
                {
                    $lookup: {
                        from: 'User',
                        localField: 'community.owner',
                        foreignField: 'id',
                        as: 'owner'
                    }
                },
                { $unwind: '$owner' },
                {
                    $project: {
                        '_id': 0,
                        'id': 1,
                        name: '$community.name',
                        slug: '$community.slug',
                        owner: {
                            id: '$owner.id',
                            name: '$owner.name',
                        },
                        created_at: 1,
                        updated_at: new Date()
                    }
                },
                { $skip: (page - 1) * perPage },
                { $limit: perPage }
            ])
            .toArray();

        const response = {
            status: true,
            content: {
                meta: {
                    total: totalDocuments,
                    pages: totalPages,
                    page: page
                },
                data: communities
            }
        };

        res.status(200).json(response);

    } catch (error) {
        console.error('Error retrieving joined communities:', error);
        res.status(500).json({ error: 'An error occurred while retrieving joined communities' });
    }
});


module.exports = CommunityRouter;