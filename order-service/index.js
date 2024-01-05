const express = require("express");
const mongoose = require("mongoose");
const Order = require("./Order");
const amqp = require("amqplib");
const env = require('dotenv').config();
const app = express();
const PORT = 9090;

var channel, connection;

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
app.use(express.json());

let newOrder; 

async function createOrder(products) {
  let total = 0;
  for (let t = 0; t < products.length; ++t) {
    total += products[t].price;
  }
  newOrder = new Order({
    products,
    total_price: total,
  });
  await newOrder.save();
  return newOrder;
}

async function connect() {
  try {
    const amqpServer = "amqp://localhost:5672";
    connection = await amqp.connect(amqpServer);
    channel = await connection.createChannel();
    await channel.assertQueue("ORDER");
  } catch (error) {
    console.error("Error connecting to RabbitMQ:", error);
    process.exit(1);
  }
}

connect().then(() => {
  channel.consume("ORDER", (data) => {
    console.log("Consuming ORDER service");
    const { products } = JSON.parse(data.content);
    createOrder(products).then(() => {
      channel.ack(data);
      
      channel.sendToQueue(
        "PRODUCT",
        Buffer.from(JSON.stringify({ newOrder }))
      );
    });
  });
});

app.listen(PORT, () => {
  console.log(`Order-Service at ${PORT}`);
});

