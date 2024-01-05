const express = require("express");
const app = express();
const PORT =  8080;
const mongoose = require("mongoose");
const Product = require("./Product");
const amqp = require("amqplib");
const env = require('dotenv').config();
var order;

var channel, connection;

app.use(express.json());

const connectDB = async () => {
    try {
      const mongoURI = process.env.MONGO_URI;
      await mongoose.connect(mongoURI);
  
      console.log("Connected to MongoDB");
    } catch (error) {
      console.error("Error connecting to MongoDB:", error);
      process.exit(1);
    }
  };
  connectDB();
async function connect() {
    const amqpServer = "amqp://localhost:5672";
    connection = await amqp.connect(amqpServer);
    channel = await connection.createChannel();
    await channel.assertQueue("PRODUCT");
}
connect();

app.post("/product/buy", async (req, res) => {
    const { ids } = req.body;
    const products = await Product.find({ _id: { $in: ids } });
     channel.sendToQueue(
        "ORDER",
        Buffer.from(
            JSON.stringify({
                products,
            })
        )
    );
    
    await channel.consume("PRODUCT", async (data) => {
        order =  JSON.parse(data.content);
    });
    return res.json(order);
});

app.post("/product/create", async (req, res) => {
    const { name, description, price } = req.body;
    const newProduct = new Product({
        name,
        description,
        price,
    });
    await newProduct.save();
    return res.json(newProduct);
});


app.listen(PORT, () => {
    console.log(`Product-Service at ${PORT}`);
});