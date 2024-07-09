const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const Port = process.env.PORT || 3000;

// File paths
const questionsFilePath = path.join(__dirname, 'questions.json');
const leaderboardFilePath = path.join(__dirname, 'leaderboard.json');

// Helper function to read JSON files
const readJsonFile = (filePath) => {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

// Helper function to write JSON files
const writeJsonFile = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
};

// Load initial data
let questionsData = readJsonFile(questionsFilePath);
let leaderboardData = readJsonFile(leaderboardFilePath);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Fetch categories
const categoryList = () => Object.keys(questionsData);

// Fetch a random question from a category
const getQuestion = (category) => {
  const questions = questionsData[category];
  if (!questions || questions.length === 0) {
    throw new Error(`No questions found for category "${category}".`);
  }
  const question = questions[Math.floor(Math.random() * questions.length)];
  return question;
};

// Fetch leaderboard for a specific year
const getLeaderboard = (year) => {
  return leaderboardData[year] || [];
};

// Update player score
const updateScore = (playerid, option) => {
  for (const year in leaderboardData) {
    const player = leaderboardData[year].find(p => p.id === playerid);
    if (player) {
      player.score += (option === 'correct') ? 1 : -1;
      writeJsonFile(leaderboardFilePath, leaderboardData);
      return { message: `Score updated successfully for player ${player.name}.` };
    }
  }
  throw new Error(`Player with id "${playerid}" not found.`);
};

// Add question to a category
const addQuestion = (category, question, options, answer) => {
  if (!questionsData[category]) {
    questionsData[category] = [];
  }
  const newQuestion = { id: uuidv4(), question, options, answer };
  questionsData[category].push(newQuestion);
  writeJsonFile(questionsFilePath, questionsData);
  return { message: `Question added successfully to category "${category}".`, question: newQuestion };
};

// API Endpoints

// Fetch a quiz question
app.post('/quiz', async (req, res) => {
  const { category, playerid, name } = req.body;
  if (!category || !playerid || !name) {
    return res.status(400).json({ error: "Missing parameters. Ensure category, playerid, and name are provided." });
  }

  try {
    const question = getQuestion(category.toLowerCase());
    res.json({ question, answer: question.answer, link: question.link });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update player score based on answer
app.put('/scores', async (req, res) => {
  const { playerid, option } = req.body;
  if (!playerid || !option) {
    return res.status(400).json({ error: "Missing parameters. Ensure playerid and option (correct or wrong) are provided." });
  }

  try {
    const result = updateScore(playerid, option.toLowerCase());
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a new question to a category
app.post('/addq', async (req, res) => {
  const { category, question, options, answer } = req.body;
  if (!category || !question || !options || !answer) {
    return res.status(400).json({ error: "Missing parameters. Ensure category, question, options, and answer are provided." });
  }

  try {
    const result = addQuestion(category.toLowerCase(), question, options, answer.toUpperCase());
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch leaderboard for a specific year
app.get('/leaderboard/:year', async (req, res) => {
  const year = req.params.year;
  try {
    const leaderboard = getLeaderboard(year);
    res.json({ leaderboard });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(Port, () => {
  console.log(`Server is live on port ${Port}`);
});
