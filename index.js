const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
const key = process.env.DB_SECRET_KEY;
const stripe = require("stripe")(
  "sk_test_51NyrsOHIq6YTLE5VLZBnjgTLcFhlP0d2tbzHXTS6MvWGVOeVhMQugaLQHtHlBY8P90vQOWHBQAP8OvkXc3tdtfHl00xJKynF8X"
);
const jwt = require("jsonwebtoken");

// middleWare
app.use(cors());
app.use(express.json());
require("dotenv").config();

app.get("/", (req, res) => {
  res.send("Art is Getting Done");
});
app.listen(port, () => {
  console.log("code is broaken now");
});
// verify jwt
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized user access" });
  } else {
    const token = authorization.split(" ")[1];

    jwt.verify(token, process.env.DB_KEY, (error, decoded) => {
      if (error) {
        return res
          .status(401)
          .send({ error: true, message: "unauthorized access" });
      }
      req.decoded = decoded;

      next();
    });
  }
};
// mongodb

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_SECRET}@cluster1.z16hlgw.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
// collection
const MainArtDb = client.db("ArtCraft");
const userCollection = MainArtDb.collection("users");
const courseCollection = MainArtDb.collection("courses");
const PendingCourseCollection = MainArtDb.collection("PendingCourses");
const cartCollection = MainArtDb.collection("cart");
const PaidCollection = MainArtDb.collection("Paid");
const PurchasedProducts = MainArtDb.collection("purchasedProducts");
const FavouriteProducts = MainArtDb.collection("FavouriteProducts");
// apis ------------->
//payment api
app.post("/Purchased", verifyJWT, async (req, res) => {
  const data = req.body;
  const query = { transictionId: data.transictionId };
  const check = await PaidCollection.findOne(query);
  if (!check) {
    const result = await PaidCollection.insertOne(data);

    res.send(result);
  } else if (check) {
    res.send({ message: "already document exist" });
  }
});

app.post("/create-payment-intent", async (req, res) => {
  const { price } = req.body;
  const ammount = price * 100;
  console.log(ammount);
  // Create a PaymentIntent with the order amount and currency
  const paymentIntent = await stripe.paymentIntents.create({
    amount: ammount,
    currency: "usd",
    payment_method_types: ["card"],
  });
  console.log(paymentIntent.client_secret);
  res.send({
    clientSecret: paymentIntent.client_secret,
  });
});
app.post("/create-payment-intent", async (req, res) => {
  try {
    const { price } = req.body;
    const ammount = price * 100;
    console.log(ammount);
    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: ammount,
      currency: "usd",
      payment_method_types: ["card"],
    });

    console.log(paymentIntent.client_secret);
    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error("Error parsing JSON:", error);
    res.status(400).send("Invalid JSON data");
  }
});
app.post("/payment", cors(), async (req, res) => {
  const { total2 } = req.body; // Assuming the price is in dollars
  let newAmmount;
  if (total2 === 0) {
    newAmmount = 1;
  } else if (total2 > 0) {
    newAmmount = total2;
  }
  const amountInCents = Math.round(newAmmount * 100); // Convert to cents
  console.log(amountInCents);

  try {
    const payment = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "usd",
      // Replace with the actual Payment Method ID
      payment_method_types: ["card"],
    });
    // console.log("Payment", payment);

    res.send({
      clientSecret: payment.client_secret,
    });
  } catch (error) {
    console.log("Error", error);

    res.status(400).json({
      message: "Payment failed",
      success: false,
    });
  }
});

// teacher apis
app.get("/teacherUser", async (req, res) => {
  const query = { profiletype: "teacher" };
  const result = await userCollection.find(query).toArray();

  res.send(result);
});
// admin api
app.get("/ChecKAdmin", verifyJWT, async (req, res) => {
  const email = req.query.email;
  const query = { email: email };
  const result = await userCollection.findOne(query);
  if (result?.profiletype === "admin") {
    res.send(true);
  } else {
    res.send(false);
  }
});
app.get("/AllUsers", verifyJWT, async (req, res) => {
  const decodedEmail = req.decoded.email;
  // console.log(decodedEmail);
  const checKmail = { email: decodedEmail };
  const find1 = await userCollection.findOne(checKmail);
  // console.log(find1);
  const result = await userCollection.find().toArray();
  res.send(result);
});
app.patch("/AllUsersMakeAdmin/:id", verifyJWT, async (req, res) => {
  const id = req.params.id;
  // console.log(id);
  const query = { _id: new ObjectId(id) };
  const options = { upsert: true };
  const updateDoc = {
    $set: {
      profiletype: `admin`,
    },
  };
  const result = await userCollection.updateOne(query, updateDoc, options);
  res.send(result);
});
app.patch("/AllUsersMakeTeacher/:id", verifyJWT, async (req, res) => {
  const id = req.params.id;
  // console.log(id);
  const query = { _id: new ObjectId(id) };
  const options = { upsert: true };
  const updateDoc = {
    $set: {
      profiletype: `teacher`,
    },
  };
  const result = await userCollection.updateOne(query, updateDoc, options);
  res.send(result);
});
app.patch("/AllUsersMakeStudent/:id", verifyJWT, async (req, res) => {
  const id = req.params.id;
  // console.log(id);
  const query = { _id: new ObjectId(id) };
  const options = { upsert: true };
  const updateDoc = {
    $set: {
      profiletype: `student`,
    },
  };
  const result = await userCollection.updateOne(query, updateDoc, options);
  res.send(result);
});
app.delete("/AllUsersRemoveMember/:id", verifyJWT, async (req, res) => {
  const id = req.params.id;
  // console.log(id);
  const query = { _id: new ObjectId(id) };

  const result = await userCollection.deleteOne(query);
  res.send(result);
});
app.patch("/ApproveCourses/:id", verifyJWT, async (req, res) => {
  const id = req.params.id;
  // console.log(id);
  const query = { _id: new ObjectId(id) };
  const options = { upsert: true };
  const updateDoc = {
    $set: {
      status: `approved`,
    },
  };
  const result = await courseCollection.updateOne(query, updateDoc, options);
  res.send(result);
});
app.patch("/DeclineCourse/:id", verifyJWT, async (req, res) => {
  const id = req.params.id;
  // console.log(id);
  const message = req.body;
  const query = { _id: new ObjectId(id) };
  const options = { upsert: true };
  const updateDoc = {
    $set: {
      status: `declined`,
      declinedMsg: `${message.msg}`,
    },
  };

  const result = await courseCollection.updateOne(query, updateDoc, options);
  res.send(result);
});
app.get("/Allcourses", async (req, res) => {
  const result = await courseCollection.find().sort({ _id: -1 }).toArray();

  res.send(result);
});

// teachers api
app.get("/ChecKTeacher", verifyJWT, async (req, res) => {
  const email = req.query.email;
  const query = { email: email };
  const result = await userCollection.findOne(query);
  if (result?.profiletype === "teacher") {
    res.send(true);
  } else {
    res.send(false);
  }
});
app.get("/DeclinedCourses", verifyJWT, async (req, res) => {
  const email = req.query.email;
  const query = { email: email, status: `declined` };
  const result = await courseCollection.find(query).toArray();
  res.send(result);
});
app.get("/AllCoursesTeacher", verifyJWT, async (req, res) => {
  const email = req.query.email;
  const query = { email: email };
  const result = await courseCollection.find(query).toArray();
  res.send(result);
});
app.get("/AllCoursesTeacherCategory", verifyJWT, async (req, res) => {
  const category = req.query.category;
  const query = { status: category };
  const result = await courseCollection.find(query).toArray();
  res.send(result);
});
app.delete("/AllCoursesTeacherDelete/:id", verifyJWT, async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await courseCollection.deleteOne(query);
  res.send(result);
});
// user api
app.post("/users", async (req, res) => {
  const data = req.body;
  const query = { email: data.email };
  const find = await userCollection.findOne(query);
  if (find) {
    return res.send({ error: true, message: "User Already Exist" });
  }
  const result = await userCollection.insertOne(data);
  res.send(result);
});
app.get("/users", async (req, res) => {
  const userMail = req.query?.email;

  const query = { email: userMail };
  const result = await userCollection.findOne(query);

  res.send(result);
});
//paid apis
app.get(`/Transactions`, verifyJWT, async (req, res) => {
  const email = req.query.email;
  const query = { customerEmail: email };
  const result = await PaidCollection.find(query).toArray();
  res.send(result);
});
app.get("/EnrolledCourse", verifyJWT, async (req, res) => {
  const email = req.query.email;
  const query = { customerEmail: email };

  const result = await PurchasedProducts.find(query).toArray();
  res.send(result);
});
// cart api
app.post("/cart", async (req, res) => {
  const data = req.body;
  // console.log(data);
  const result = await cartCollection.insertMany(data);
  res.send(result);
});
app.post("/purchasedProducts", verifyJWT, async (req, res) => {
  const data = req.body;
  // console.log(data);
  const result = await PurchasedProducts.insertMany(data);
  res.send(result);
});
app.post("/FavouriteProducts", verifyJWT, async (req, res) => {
  const data = req.body;
  // console.log(data);
  const query = {
    name: data.name,
    category: data.category,
    customerEmail: data.customerEmail,
  };
  const find2 = await FavouriteProducts.findOne(query);
  if (!find2) {
    const result = await FavouriteProducts.insertOne(data);
    res.send(result);
  } else if (find2) {
    res.send({ message: "already exist documents" });
  }
});
app.get("/Favorite", verifyJWT, async (req, res) => {
  const email = req.query.email;
  const query = { customerEmail: email };
  const result = await FavouriteProducts.find(query).toArray();
  res.send(result);
});
app.delete("/Favorite/:id", verifyJWT, async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await FavouriteProducts.deleteOne(query);
  res.send(result);
});
app.post("/SinglepurchasedProducts", verifyJWT, async (req, res) => {
  const data = req.body;
  // console.log(data);
  const result = await PurchasedProducts.insertOne(data);
  res.send(result);
});
app.get("/cart", async (req, res) => {
  const email = req.query.email;
  const query = { customerEmail: email };
  const result = await cartCollection.find(query).toArray();
  const uniqueApplyCart = Array.from(
    new Set(result.map((item) => item.name))
  ).map((name) => result.find((item) => item.name === name));
  res.send(uniqueApplyCart);
});
app.delete("/cart/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await cartCollection.deleteOne(query);
  res.send(result);
});
app.post("/cartSingle", async (req, res) => {
  const data = req.body;
  console.log(data);
  const query = { customerEmail: data.customerEmail, courseId: data.courseId };
  const find1 = await cartCollection.findOne(query);
  console.log(find1);
  if (find1 === null) {
    const result = await cartCollection.insertOne(data);
    res.send(result);
  } else if (find1) {
    return res.send({ message: "item Already exist" });
  }
});
app.patch("/CourseUpdate/:id", verifyJWT, async (req, res) => {
  const id = req.params.id;
  const data = req.body;
  // console.log(id);
  const query = { _id: new ObjectId(id) };
  const options = { upsert: true };
  const updateDoc = {
    $set: {
      availableseats: data.availableseats,
      bookedSets: data.bookedSets,
    },
  };
  const result = await courseCollection.updateOne(query, updateDoc, options);
  res.send(result);
});
// course api
app.get("/courses", async (req, res) => {
  const query = { status: `approved` };
  const result = await courseCollection.find(query).sort({ _id: 1 }).toArray();

  res.send(result);
});

app.get("/courseCategory/:id", async (req, res) => {
  const category = req.params.id;
  // console.log(category);
  const query = { category: category, status: `approved` };
  const result = await courseCollection.find(query).toArray();
  res.send(result);
});
app.get("/course", async (req, res) => {
  const email = req.query.email;
  const query = { email: email, status: `approved` };
  const result = await courseCollection.find(query).toArray();
  console.log(result);
  res.send(result);
});
app.get("/courses/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await courseCollection.findOne(query);
  res.send(result);
});

app.post("/PendingCourses", verifyJWT, async (req, res) => {
  const data = req.body;
  const email = req.query.email;
  const decode = req?.decoded.email;

  if (decode !== email) {
    res
      .status(403)
      .send({ error: true, message: "un authorized action found" });
  }
  const result = await courseCollection.insertOne(data);
  res.send(result);
});

// jwt api
app.post("/jwt", (req, res) => {
  const user = req.body;

  const token = jwt.sign(user, process.env.DB_KEY, {
    expiresIn: "10h",
  });
  res.send(token);
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
