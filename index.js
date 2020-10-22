const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
const fs = require('fs-extra');
const fileUpload = require('express-fileupload');
const admin = require('firebase-admin');
const serviceAccount = require("./config/creative-agency-spa-firebase-adminsdk-7reri-84078f0904.json");
require('dotenv').config()


admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `${process.env.SITE_NAME}`
});


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ukskk.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

const app = express();

app.use(cors());
app.use(express.static('services'))
app.use(fileUpload())
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const port = 2840;


client.connect(err => {
    const serviceCollection = client.db("creativeAgency").collection("service");
    const orderCollection = client.db("creativeAgency").collection("order");
    const reviewCollection = client.db("creativeAgency").collection("review");
    const adminCollection = client.db("creativeAgency").collection("admin");

    // all service api
    app.get('/service', (req, res) => {
        serviceCollection.find({})
            .toArray((err, documents) => {
                res.send(documents);
            })
    })

    app.get('/getService', (req, res) => {
        serviceCollection.find({ name: req.query.name })
            .toArray((err, documents) => {
                res.send(documents[0]);
            })
    })

    app.post('/addService', (req, res) => {
        const file = req.files.file;
        const service = req.body.name;
        const description = req.body.description;
        const filePath = `${__dirname}/services/${file.name}`;
        console.log(req.body)
        file.mv(filePath, err => {
            if (err) {
                console.log(err);
            }
            const newImg = fs.readFileSync(filePath);
            const encImg = newImg.toString('base64');

            const image = {
                contentType: req.files.file.mimetype,
                size: req.files.file.size,
                img: Buffer.from(encImg, 'base64')
            }
            console.log({ service, description, image })
            serviceCollection.insertOne({ service, description, image })
                .then(result => {
                    fs.remove(filePath, err => {
                        if (err) {
                            console.log(err);
                        }
                        res.send(result.insertedCount > 0)
                    })
                })
        })

    })

    // all user order api
    app.get('/orders', (req, res) => {
        orderCollection.find({})
            .toArray((err, documents) => {
                res.send(documents);
            })
    })


    app.get('/myOrder', (req, res) => {
        const bearer = req.headers.authorization;
        if (bearer && bearer.startsWith('Bearer ')) {
            const idToken = bearer.split(' ')[1];
            admin.auth().verifyIdToken(idToken)
                .then(function (decodedToken) {
                    const tokenEmail = decodedToken.email;
                    const queryEmail = req.query.email;
                    if (tokenEmail === queryEmail) {
                        orderCollection.find({ email: queryEmail })
                            .toArray((err, documents) => {
                                res.status(200).send(documents);

                            })
                    }
                    else {
                        res.status(401).send('Un-Authorized Access!!')
                    }
                }).catch(function (error) {
                    res.status(401).send('Un-Authorized Access!!')
                });
        }
        else {
            res.status(401).send('Un-Authorized Access!!')
        }
    })


    app.post('/addOrder', (req, res) => {
        const file = req.files.file;
        const name = req.body.name;
        const email = req.body.email;
        const service = req.body.service;
        const details = req.body.details;
        const price = req.body.price;
        const status = req.body.status;

        const filePath = `${__dirname}/orders/${file.name}`;
        file.mv(filePath, err => {
            if (err) {
                console.log(err);
            }
            const newImg = fs.readFileSync(filePath);
            const encImg = newImg.toString('base64');

            const image = {
                contentType: req.files.file.mimetype,
                size: req.files.file.size,
                img: Buffer.from(encImg, 'base64')
            }
            orderCollection.insertOne({ name, email, service, details, price, status, image })
                .then(result => {
                    fs.remove(filePath, err => {
                        if (err) {
                            console.log(err);
                        }
                        res.send(result.insertedCount > 0)
                    })
                })
        })

    })


    // all review api
    app.get('/review', (req, res) => {
        reviewCollection.find({})
            .toArray((err, documents) => {
                res.send(documents);
            })
    })

    app.post('/addReview', (req, res) => {
        const review = req.body;
        reviewCollection.insertOne(review)
            .then(result => {
                res.send(result.insertedCount > 0)
            })
    })

    // all admin api
    app.get('/getAdmin', (req, res) => {
        const email = req.query.email;
        adminCollection.find({ email: email })
            .toArray((err, documents) => {
                res.send(documents);
            })
    })

    app.post('/addAdmin', (req, res) => {
        const admin = req.body;
        adminCollection.insertOne(admin)
            .then(result => {
                res.send(result.insertedCount > 0)
            })
    })


});

app.listen(process.env.PORT || port);