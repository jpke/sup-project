var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');

var app = express();

var jsonParser = bodyParser.json();

var User = require('./models/user');
var Message = require('./models/message');
var passport = require('passport');
var BasicStrategy = require('passport-http').BasicStrategy;

// Add your API endpoints here

//users---------------------------------------------------------------------------
var strategy = new BasicStrategy(function(username, password, callback) {
    User.findOne({
        username: username
    }, function (err, user) {
        if (err) {
            callback(err);
            return;
        }

        if (!user) {
            return callback(null, false, {
                message: 'Incorrect username.'
            });
        }

        user.validatePassword(password, function(err, isValid) {
            if (err) {
                return callback(err);
            }

            if (!isValid) {
                return callback(null, false, {
                    message: 'Incorrect password.'
                });
            }
            return callback(null, user);
        });
    });
});

passport.use(strategy);

app.use(passport.initialize());

app.get('/users', passport.authenticate('basic', {session:false}), function(req, res) {
    User.find(function(err, users) {
        if (err) {
            return res.status(500).json({message: 'Internal Server Errror'});
        }
        res.json(users);
    });
});

app.post('/users', jsonParser, function(req, res) {
    if (!req.body) {
        return res.status(400).json({
            message: "No request body"
        });
    }

    if (!('username' in req.body)) {
        return res.status(422).json({
            message: 'Missing field: username'
        });
    }

    var username = req.body.username;

    if (typeof username !== 'string') {
        return res.status(422).json({
            message: 'Incorrect field type: username'
        });
    }

    username = username.trim();

    if (username === '') {
        return res.status(422).json({
            message: 'Incorrect field length: username'
        });
    }

    if (!('password' in req.body)) {
        return res.status(422).json({
            message: 'Missing field: password'
        });
    }

    var password = req.body.password;

    if (typeof password !== 'string') {
        return res.status(422).json({
            message: 'Incorrect field type: password'
        });
    }

    password = password.trim();

    if (password === '') {
        return res.status(422).json({
            message: 'Incorrect field length: password'
        });
    }

    bcrypt.genSalt(10, function(err, salt) {
        if (err) {
            return res.status(500).json({
                message: 'Internal server error'
            });
        }

        bcrypt.hash(password, salt, function(err, hash) {
            if (err) {
                return res.status(500).json({
                    message: 'Internal server error'
                });
            }

            var user = new User({
                username: username,
                password: hash
            });

            user.save(function(err) {
                if (err) {
                    return res.status(500).json({
                        message: 'Internal server error'
                    });
                }

                return res.status(201).json({});
            });
        });
    });
});

app.get('/users/:userId', passport.authenticate('basic', {session: false}), function(req, res) {
    User.findOne({_id: req.params.userId}, '_id username', function(err, user) {
        if (err) {
            return res.status(500).json({message: 'Internal Server Errror'});
        }
        if (user) {
            return res.status(200).json(user);
        }
        return res.status(404).json({message: 'User not found'});
    });
});

app.put('/users/:userId', jsonParser, passport.authenticate('basic', {session: false}), function(req, res) {
    console.log('REQ.BODY:::   ', req.body);
    if (!req.body.username) {
        return res.status(422).json({message: 'Missing field: username'});
    }
    if (typeof(req.body.username) !== 'string') {
        return res.status(422).json({message: 'Incorrect field type: username'});
    }
    if (req.params.userId+"" !== req.user._id+"") {
        return res.status(403).json({message: 'action not allowed'});
    }
    User.findOneAndUpdate({_id: req.params.userId}, {username: req.body.username}, function(err, user) {
        if (err) {
            return res.status(500).json({message: 'Internal Server Errror'});
        }
        return res.status(200).json({});
    });
});

app.delete('/users/:userId', passport.authenticate('basic', {session: false}), function(req, res) {
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

//messages-------------------------------------------------------------------------------------
app.get('/messages', passport.authenticate('basic', {session: false}), function(req, res) {
    Message.find({$or:[ {'to': req.user._id}, {'from': req.user._id}]}).populate('from', 'username _id').populate('to', 'username _id').exec(function(err, messages){
        if(err) {
            return res.status(500).json({message: 'Internal Server Error'});
        }
        console.log(messages);
        res.status(200).json(messages);
    });
});

app.post('/messages', jsonParser, passport.authenticate('basic', {session: false}), function(req, res) {
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
    var from;
    var to;
    User.find({username: req.body.from})
    .then(function(user) {
        if(user.length === 0) {
            throw res.status(422).json({message: 'Incorrect field value: from'});
        }
        from = user[0]._id;
        return User.find({username: req.body.to});
    }).then(function(user) {
        console.log("USER IS:", user);
        if(user.length === 0) {
            throw res.status(422).json({message: 'Incorrect field value: to'});
        } 
        to = user[0]._id;
        return Message.create({to: to, from: from, text: req.body.text});
    }).then(function(message) {
        res.status(201).set('location', `/messages/${message._id}`).json({});
    }).catch(function(errOrRes) {
        // threw res to break promise chain
        if(errOrRes == res) return;
        console.error("500 error", errOrRes);
        return res.status(500).json({message: 'Internal Server Error'});            
    });
});


app.get('/messages/:messageId', passport.authenticate('basic', {session: false}), function(req, res) {
    Message.findOne({_id: req.params.messageId}).populate('from', 'username _id').populate('to', 'username _id').exec( function(err, message) {
        if(err) {
            return res.status(500).json({message: 'Internal Server Error'});            
        } 
        if (!message) {
            return res.status(404).json({message: 'Message not found'});
        }
        console.log("req ", req.user);
        //console.log("user: ", user);
        if(message.to._id+"" != req.user._id+"" && message.from._id +"" != req.user._id +"") {
                //type conversion with +""
            return res.status(403).json({message: 'read your own messages, twerp!'});
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

