global.databaseUri = 'mongodb://localhost/sup-dev';

var chai = require('chai');
var chaiHttp = require('chai-http');
var mongoose = require('mongoose');
var UrlPattern = require('url-pattern');
var app = require('../index').app;

var User = require('../models/user');

var makeSpy = require('./spy');

var should = chai.should();

chai.use(chaiHttp);

describe('User endpoints', function() {
    beforeEach(function(done) {
        // Clear the database
        mongoose.connection.db.dropDatabase(done);
        this.singlePattern = new UrlPattern('/users/:userId');
        this.listPattern = new UrlPattern('/users');
    });

    describe('/users', function() {
        describe('GET', function() {
            it('should return an empty list of users initially', function() {
                // Get the list of users
                var user = {
                    username: 'joe',
                    password: 'abcd'
                };

                // Create a user
                return new User(user).save()
                    .then(function() {
                        User.find()
                        .then((result) => {
                        // Get the list of users
                            return chai.request(app)
                                .get(new UrlPattern('/users').stringify())
                                .auth('joe', 'abcd')
                                .then(function(res) {
                                    // Check that it's an empty array
                                    res.should.have.status(200);
                                    res.type.should.equal('application/json');
                                    res.charset.should.equal('utf-8');
                                    res.body.should.be.an('array');
                                    res.body.length.should.equal(1);
                                });
                        });
                    });
            });

            it('should return a list of users', function() {
                var user = {
                    username: 'joe',
                    password: 'abcd'
                };

                // Create a user
                return new User(user).save()
                    .then(() => {
                        User.find().then((result) => {
                            return;
                        })
                        .then(function() {
                                // Get the list of users
                                return chai.request(app)
                                           .get(new UrlPattern('/users').stringify())
                                           .auth('joe', 'abcd');
                            }.bind(this))
                            .then(function(res) {
                                // Check that the array contains a user
                                res.should.have.status(200);
                                res.type.should.equal('application/json');
                                res.charset.should.equal('utf-8');
                                res.body.should.be.an('array');
                                res.body.length.should.equal(1);
                                res.body[0].should.be.an('object');
                                res.body[0].should.have.property('username');
                                res.body[0].username.should.be.a('string');
                                res.body[0].username.should.equal(user.username);
                                res.body[0].should.have.property('_id');
                                res.body[0]._id.should.be.a('string');
                            });
                    });
            });
        });
        describe('POST', function() {
            it('should allow adding a user', function() {
                var user = {
                    username: 'joe',
                    password: 'abcd'
                };

                // Add a user
                return chai.request(app)
                    .post(this.listPattern.stringify())
                    .send(user)
                    .then(function(res) {
                        // Check that an empty object is returned
                        res.should.have.status(201);
                        res.type.should.equal('application/json');
                        res.charset.should.equal('utf-8');
                        res.should.have.header('location');
                        res.body.should.be.an('object');
                        res.body.should.be.empty;

                        var params = this.singlePattern.match(res.headers.location);
                        // Fetch the user from the database, using the
                        // location header to get the ID
                        return User.findById(params.userId).exec();
                    }.bind(this))
                    .then(function(res) {
                        // Check that the user exists in the database
                        should.exist(res);
                        res.should.have.property('username');
                        res.username.should.be.a('string');
                        res.username.should.equal(user.username);
                    });
            });
            it('should reject users without a username', function() {
                var user = {};
                var spy = makeSpy();
                // Add a user without a username
                return chai.request(app)
                    .post(this.listPattern.stringify())
                    .send(user)
                    .then(spy)
                    .catch(function(err) {
                        // If the request fails, make sure it contains the
                        // error
                        var res = err.response;
                        res.should.have.status(422);
                        res.type.should.equal('application/json');
                        res.charset.should.equal('utf-8');
                        res.body.should.be.an('object');
                        res.body.should.have.property('message');
                        res.body.message.should.equal('Missing field: username');
                    })
                    .then(function() {
                        // Check that the request didn't succeed
                        spy.called.should.be.false;
                    });
            });
            it('should reject non-string usernames', function() {
                var user = {
                    username: 42
                };
                var spy = makeSpy();
                // Add a user without a non-string username
                return chai.request(app)
                    .post(this.listPattern.stringify())
                    .send(user)
                    .then(spy)
                    .catch(function(err) {
                        // If the request fails, make sure it contains the
                        // error
                        var res = err.response;
                        res.should.have.status(422);
                        res.type.should.equal('application/json');
                        res.charset.should.equal('utf-8');
                        res.body.should.be.an('object');
                        res.body.should.have.property('message');
                        res.body.message.should.equal('Incorrect field type: username');
                    })
                    .then(function() {
                        // Check that the request didn't succeed
                        spy.called.should.be.false;
                    });
            });
        });
    });

    describe('/users/:userId', function() {
        describe('GET', function() {
            it('should 404 on non-existent users', function() {
                var spy = makeSpy();
                
                 var user = {
                    username: 'joe',
                    password: 'abcd'
                };

                // Create a user
                return new User(user).save()
                    .then(() => {
                        User.find().then((result) => {
                            // function() {
                        // Request a non-existent user
                            return chai.request(app)
                                // .get(this.singlePattern.stringify({userId: '000000000000000000000000'}))
                                .get(new UrlPattern('/users/:userId').stringify({userId: '000000000000000000000000'}))
                                // .bind(this)
                                .auth('joe', 'abcd')
                                .then(spy)
                                .catch(function(err) {
                                    // If the request fails, make sure it contains the
                                    // error
                                    var res = err.response;
                                    res.should.have.status(404);
                                    res.type.should.equal('application/json');
                                    res.charset.should.equal('utf-8');
                                    res.body.should.be.an('object');
                                    res.body.should.have.property('message');
                                    res.body.message.should.equal('User not found');
                                })
                                .then(function() {
                                    // Check that the request didn't succeed
                                    spy.called.should.be.false;
                                });
                            // });
                        });
                    });
            });

            it('should return a single user', function() {
                var user = {
                    username: 'joe',
                    password: 'abcd'
                };
                var userId;
                // Add a user to the database
                return new User(user).save()
                    .then((res) => {
                        userId = res._id.toString();
                        User.find()
                        .then((result) => {
                            // userId = res._id.toString();
                            // Make a request for the user
                            return chai.request(app)
                                .get(this.singlePattern.stringify({
                                    userId: userId
                                }))
                                .auth('joe', 'abcd')
                        // }.bind(this))
                        .then(function(res) {
                            // Check that the user's information is returned
                            res.should.have.status(200);
                            res.type.should.equal('application/json');
                            res.charset.should.equal('utf-8');
                            //console.log("res.body: " + res.body);
                            res.body.should.be.an('object');
                            res.body.should.have.property('username');
                            res.body.username.should.be.a('string');
                            res.body.username.should.equal(user.username);
                            res.body.should.have.property('_id');
                            res.body._id.should.be.a('string');
                            res.body._id.should.equal(userId);
                        });
                    });
                });
            });
        });

        describe('PUT', function() {
            it('should allow editing a user', function() {
                var oldUser = {
                    username: 'joe',
                    password: 'abcd'
                };
                var newUser = {
                    username: 'joe2',
                    password: 'abcd'
                };
                var userId;
                // Add a user to the database
                return new User(oldUser).save()
                    .then((res) => {
                        User.find()
                    .then((result) => {
                            // userId = res._id.toString();
                            // Make a request for the user
                            return chai.request(app)
                                .put(this.singlePattern.stringify({
                                    userId: userId
                                }))
                                .auth('joe', 'abcd')
                    .then(function(res) {
                            // Check that an empty object was returned
                            res.should.have.status(200);
                            res.type.should.equal('application/json');
                            res.charset.should.equal('utf-8');
                            res.body.should.be.an('object');
                            res.body.should.be.empty;
    
                            // Fetch the user from the database
                            return User.findById(userId).exec();
                        })
                        .then(function(res) {
                            // Check that the user has been updated
                            console.log("res: " + res);
                            should.exist(res);
                            res.should.have.property('username');
                            res.username.should.be.a('string');
                            res.username.should.equal(newUser.username);
                        });
                    });
                });
            });
            it('should reject non-string usernames', function() {
                var oldUser = {
                    _id: '000000000000000000000000',
                    username: 'joe',
                    password: 'abcd'
                };
                var newUser = {
                    _id: '000000000000000000000000',
                    username: 42
                };
                var spy = makeSpy();
                 var userId;
                // Add a user to the database
                return new User(oldUser).save()
                    .then((res) => {
                        User.find()
                    .then((result) => {
                            return chai.request(app)
                                .put(this.singlePattern.stringify({
                                    userId: userId
                                }))
                                .auth('joe', 'abcd')
                                .send(newUser)
                                .then(spy)
                                .catch(function(err) {
                                    // If the request fails, make sure it contains the
                                    // error
                                    var res = err.response;
                                    res.should.have.status(422);
                                    res.type.should.equal('application/json');
                                    res.charset.should.equal('utf-8');
                                    res.body.should.be.an('object');
                                    res.body.should.have.property('message');
                                    res.body.message.should.equal('Incorrect field type: username');
                                })
                                .then(function() {
                                    // Check that the request didn't succeed
                                    spy.called.should.be.false;
                                });
                        });
                    });
            });
        });

        describe('DELETE', function() {
            it('should 404 on non-existent users', function() {
                var spy = makeSpy();
                var newUser = {
                    _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
                    username: "jimbob",
                    password: 'abcd'
                };
                 var userId;
                // Add a user to the database
                return new User(newUser).save()
                    .then((res) => {
                        User.find()
                        .then((result) => {
                            // Try to delete a non-existent user
                            return chai.request(app)
                                .delete(this.singlePattern.stringify({userId: '000000000000000000000000'}))
                                .then(spy)
                                .catch(function(err) {
                                    // If the request fails, make sure it contains the
                                    // error
                                    var res = err.response;
                                    res.should.have.status(404);
                                    res.type.should.equal('application/json');
                                    res.charset.should.equal('utf-8');
                                    res.body.should.be.an('object');
                                    res.body.should.have.property('message');
                                    res.body.message.should.equal('User not found');
                                })
                                .then(function() {
                                    // Check that the request didn't succeed
                                    spy.called.should.be.false;
                                });
                        });
                    });
            });
            it('should delete a user', function() {
                var user = {
                    username: 'joe',
                    password: 'abcd'
                };
                var userId;
                // Create a user in the database
                return new User(user).save()
                    .then(function(res) {
                        userId = res._id.toString();
                        User.find()
                        .then((result) => {
                        // Request to delete the user
                        return chai.request(app)
                            .delete(this.singlePattern.stringify({
                                userId: userId
                            }))
                            .auth('joe', 'abcd')
                            //}.bind(this))
                            .then(function(res) {
                                // Make sure that an empty object was returned
                                res.should.have.status(200);
                                res.type.should.equal('application/json');
                                res.charset.should.equal('utf-8');
                                res.body.should.be.an('object');
                                res.body.should.be.empty;
        
                                // Try to fetch the user from the database
                                return User.findById(userId);
                            })
                            .then(function(res) {
                                // Make sure that no user could be fetched
                                should.not.exist(res);
                            });
                        });
                    });
            });
        });
    });
});