var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');

var app = express();

var jsonParser = bodyParser.json();

var User = require('./models/user');

// Add your API endpoints here
app.get('/users', function(req, res) {
    User.find(function(err, users) {
        if (err) {
            return res.status(500).json({message: 'Internal Server Errror'});
        }
        res.json(users);
    });
});

app.post('/users', jsonParser, function(req, res) {
    if (req.body.username) {
        if (typeof(req.body.username) === 'string') {
            User.create({username: req.body.username}, function(err, users) {
                if (err) {
                    return res.status(500).json({message: 'Internal Server Errror'});
                }
                res.status(201).set('location', `/users/${users._id}`).json({});
            });
        } else {
            res.status(422).json({message: 'Incorrect field type: username'});
        }
    } else {
        res.status(422).json({message: 'Missing field: username'});
    }
});

app.get('/users/:userId', function(req, res) {
    console.log('req.params.userId: ' + req.params.userId);
    User.findOne({_id: req.params.userId}, function(err, user) {
        console.log('user: ' + typeof(user));
        console.log('user: ' + user);
        console.log(Boolean(user));
        if (err) {
            return res.status(500).json({message: 'Internal Server Errror'});
        } else if (user) {
            res.status(200).json(user);
        } else {
            res.status(404).json({message: 'User not found'});
        }
    });
});

app.put('/users/:userId',jsonParser, function(req, res) {
    User.findOneAndUpdate({_id: req.params.id}, {username: req.body.username}, {upsert: true}, function(err, user) {})
});




var runServer = function(callback) {
    var databaseUri = process.env.DATABASE_URI || global.databaseUri || 'mongodb://localhost/sup';
    mongoose.connect(databaseUri).then(function() {
        var port = process.env.PORT || 8080;
        var server = app.listen(port, function() {
            console.log('Listening on localhost:' + port);
            if (callback) {
                callback(server);
            }
        });
    });
};

if (require.main === module) {
    runServer();
};

exports.app = app;
exports.runServer = runServer;

