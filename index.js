var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');

var app = express();

var jsonParser = bodyParser.json();

var User = require('./models/user');
var Message = require('./models/message');

// Add your API endpoints here

//users
app.get('/users', function(req, res) {
    User.find(function(err, users) {
        if (err) {
            return res.status(500).json({message: 'Internal Server Errror'});
        }
        res.json(users);
    });
});

app.post('/users', jsonParser, function(req, res) {
    if (!req.body.username) {
        return res.status(422).json({message: 'Missing field: username'});
    }
    if (typeof(req.body.username) !== 'string') {
        return res.status(422).json({message: 'Incorrect field type: username'});
    }
    User.create({username: req.body.username}, function(err, user) {
        if (err) {
            return res.status(500).json({message: 'Internal Server Errror'});
        }
        res.status(201).set('location', `/users/${user._id}`).json({});
    });
});

app.get('/users/:userId', function(req, res) {
    User.findOne({_id: req.params.userId}, function(err, user) {
        if (err) {
            return res.status(500).json({message: 'Internal Server Errror'});
        }
        if (user) {
            return res.status(200).json(user);
        }
        return res.status(404).json({message: 'User not found'});
    });
});

app.put('/users/:userId', jsonParser, function(req, res) {
    if (!req.body.username) {
        return res.status(422).json({message: 'Missing field: username'});
    }
    if (typeof(req.body.username) !== 'string') {
        return res.status(422).json({message: 'Incorrect field type: username'});
    }
    User.findOneAndUpdate({_id: req.params.userId}, {username: req.body.username}, {upsert: true, new: true}, function(err, user) {
        if (err) {
            return res.status(500).json({message: 'Internal Server Errror'});
        }
        return res.status(200).json({});
    });
});

app.delete('/users/:userId', function(req, res) {
    User.find({_id: req.params.userId}, function(err, user) {
        if(err) {
            return res.status(500).json({message: 'Internal Server Error'});
        }
        if(user.length === 0) {
            return res.status(404).json({message: 'User not found'});
        }
        User.remove({_id: req.params.userId}, function(err, confirm) {
            if(err) {
               return res.status(500).json({message: 'Internal Server Error'}); 
            }
            return res.status(200).json({});
        });
    });
});

//messages
app.get('/messages', function(req, res) {
    Message.find(req.query).populate('from to').exec(function(err, messages){
        if(err) {
            return res.status(500).json({message: 'Internal Server Error'});
        }
        res.status(200).json(messages);
    });
});

app.post('/messages', jsonParser, function(req, res) {
    if (!req.body.text) {
        return res.status(422).json({message: 'Missing field: text'});
    }
    if (typeof(req.body.text) !== 'string') {
        return res.status(422).json({message: 'Incorrect field type: text'});
    }
    if (typeof(req.body.to) !== 'string') {
        return res.status(422).json({message: 'Incorrect field type: to'});
    }
    if (typeof(req.body.from) !== 'string') {
        return res.status(422).json({message: 'Incorrect field type: from'});
    }
    User.find({_id: req.body.from})
    .then(function(user) {
        if(user.length === 0) {
            throw res.status(422).json({message: 'Incorrect field value: from'});
        }
        return User.find({_id: req.body.to});
    }).then(function(user) {
        console.log("USER IS:", user);
        if(user.length === 0) {
            throw res.status(422).json({message: 'Incorrect field value: to'});
        } 
        return Message.create(req.body);
    }).then(function(message) {
        res.status(201).set('location', `/messages/${message._id}`).json({});
    }).catch(function(errOrRes) {
        // threw res to break promise chain
        if(errOrRes == res) return;
        console.error("500 error", errOrRes);
        return res.status(500).json({message: 'Internal Server Error'});            
    });
});


app.get('/messages/:messageId', function(req, res) {
    Message.findOne({_id: req.params.messageId}).populate('from to').exec( function(err, message) {
        if(err) {
            return res.status(500).json({message: 'Internal Server Error'});            
        } 
        if (!message) {
            return res.status(404).json({message: 'Message not found'});
        }
        return res.status(200).json(message);
    });
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

