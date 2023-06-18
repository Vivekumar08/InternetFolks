const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');
const connectToDatabase = require('./db/connection');
const RoleRouter = require('./Router/role');
const UserRoouter = require('./Router/user');
const MemberRouter = require('./Router/member');
const CommunityRouter = require('./Router/community');

const app = express();
app.use(cors());
app.use(express.json());
app.set("view engine", "ejs")
app.use(bodyParser.urlencoded(
  { extended: true }
))
dotenv.config({ path: './config.env' })

const port = process.env.PORT || 5000;

connectToDatabase()
  .then(() => {
    // Set up routes

    // Mount the role routes
    app.get("/", async (req, res) => {
      res.json("Congratulations!! Beackend server made successfully")
    })
    app.use('/v1/role', RoleRouter);
    app.use('/v1/auth', UserRoouter);
    app.use('/v1/community', CommunityRouter);
    app.use('/v1/member', MemberRouter);

    // Start the server
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  })