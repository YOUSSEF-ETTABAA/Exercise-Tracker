const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static("public"));

const mongoose = require("mongoose");
mongoose
  .connect(process.env.DB_URL)
  .then(() => console.log("Connected to exercise-tracker Database."))
  .catch((err) => {
    console.log(err);
  });

// User shema
const UserShema = new mongoose.Schema({
  username: { type: String, required: true },
});
const User = mongoose.model("User", UserShema);
// Exercise shema
const ExerciseShema = new mongoose.Schema({
  username: { type: String, required: true },
  description: String,
  duration: Number,
  date: Date,
});
const Exercise = mongoose.model("Exercise", ExerciseShema);

// Log shema
const LogSchema = new mongoose.Schema({
  username: { type: String, required: true },
  count: { type: Number, required: true },
  log: [
    {
      description: { type: String, required: true },
      duration: { type: Number, required: true },
      date: Date,
    },
  ],
});
const Log = mongoose.model("Log", LogSchema);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});
app.post("/api/users", async (req, res) => {
  const username = req.body.username;
  try {
    const newUser = new User({ username });
    const savedUser = await newUser.save();

    res.json({
      username: savedUser.username,
      _id: savedUser._id,
    });
  } catch (error) {
    res.json({ error: "Unable to create user" });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({}, { username: 1, _id: 1 });
    res.json(users);
  } catch (error) {
    res.json({ error: "Unable to fetch users" });
  }
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;

  try {
    const user = await User.findById(_id);
    if (!user) {
      return res.json({ error: "User not found" });
    }
    //Cheek if the date is supplied
    const exerciseDate = date ? new Date(date) : new Date();

    const exercise = new Exercise({
      username: user.username,
      description,
      duration: parseInt(duration),
      date: exerciseDate,
    });
    const savedExercise = await exercise.save();

    // Return the user object with the added exercise details
    res.json({
      username: user.username,
      _id: user._id,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
    });
  } catch (error) {
    res.json({ error: "Failed to add exercise" });
  }
});

app.get("/api/users/:_id/logs", async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  try {
    // Find the user by ID
    const user = await User.findById(_id);
    if (!user) {
      return res.json({ error: "User not found" });
    }

    // Build the query to fetch exercises
    let query = { userId: _id };

    // Apply date filters if provided
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to);
    }

    // Fetch exercises with optional limit
    const exercises = await Exercise.find(query)
      .select("description duration date -_id")
      .limit(parseInt(limit));

    const log = exercises.map((exercise) => ({
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
    }));


    res.json({
      username: user.username,
      _id: user._id,
      count: exercises.length,
      log,
    });
  } catch (error) {
    res.json({ error: "Failed to retrieve logs" });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
