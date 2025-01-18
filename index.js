const express = require('express');
const { ObjectId } = require('mongodb');
const cors = require('cors');
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { MongoClient } = require('mongodb');
const { GoogleGenerativeAI } = require('@google/generative-ai'); // Import Google Generative AI
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB setup
let client;
const initializeDBAndServer = async () => {
    const uri = process.env.MONGO_URI;
    client = new MongoClient(uri);

    try {
        await client.connect();
        console.log("Connected to MongoDB.....");
        app.listen(3001, () => {
            console.log('Server running on port: 3001');
        });
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        process.exit(1);
    }
};

initializeDBAndServer();

// Google Generative AI setup
const genAI = new GoogleGenerativeAI(process.env.GIMNI_API_KEY);

// Endpoint to create a new todo
app.post('/todos', async (request, response) => {
    try {
        const collection = client.db('test').collection('todos');
        const { title, description } = request.body;
        const newTodo = {
            title,
            description,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const result = await collection.insertOne(newTodo);
        response.status(201).send({ todoId: result.insertedId, message: 'Todo created successfully' });
    } catch (error) {
        response.status(500).send({ "Internal server error:": error });
    }
});

// Endpoint to analyze a todo description using AI
app.post('/todos/analyze', async (request, response) => {
    const { description } = request.body;

    if (!description) {
        return response.status(400).send({ error: "Description is required for analysis" });
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(description);

        response.status(200).send({ analysis: result.response.text() });
    } catch (error) {
        console.error("AI Error:", error);
        response.status(500).send({ error: "AI analysis failed" });
    }
});

// Endpoint to get all todos
app.get('/todos', async (request, response) => {
    try {
        const collection = client.db('test').collection('todos');
        const todos = await collection.find().toArray();
        response.status(200).send(todos);
    } catch (error) {
        response.status(500).send({ "Internal server error:": error });
    }
});





// Endpoint to update a todo
app.put('/todos/:todoId', async (request, response) => {
    try {
        const collection = client.db('test').collection('todos');
        const { todoId } = request.params;
        const { title, description } = request.body;
        const updatedTodo = {
            $set: {
                title,
                description,
                updatedAt: new Date()
            }
        };
        await collection.updateOne({ _id: new ObjectId(todoId), userId: request.userId }, updatedTodo);
        response.status(200).send({ message: 'Todo updated successfully' });
    } catch (error) {
        response.status(500).send({ "Internal server error:": error });
    }
});

// Endpoint to delete a todo
app.delete('/todos/:todoId',  async (request, response) => {
    try {
        const collection = client.db('test').collection('todos');
        const { todoId } = request.params;
        await collection.deleteOne({ _id: new ObjectId(todoId), userId: request.userId });
        response.status(200).send({ message: 'Todo deleted successfully' });
    } catch (error) {
        response.status(500).send({ "Internal server error:": error });
    }
});



module.exports = app;
