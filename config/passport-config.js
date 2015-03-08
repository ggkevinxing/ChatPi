//Passport configuration that is used for authentication of users

var LocalStrategy = require('passport-local').Strategy; //importing passports local strategy module
var User = require('../models/User');
var fs = require('fs'); //for managing profile picture uploads
var path = require('path'); //for managing profile picture uploads
var logger = require('../logger.js'); //for pretty console outputs
var validator = require('../static/validator.js'); //validates the forms

module.exports = function(passport) {

  // =========================================================================
  // passport session setup ==================================================
  // =========================================================================
  // required for persistent login sessions
  // passport needs ability to serialize and unserialize users out of session

  // used to serialize the user for the session
  passport.serializeUser(function(user, done) {
    done(null, user.id);
  });

  // used to deserialize the user
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });

  //passport strategy for local signups
  passport.use('signup', new LocalStrategy({
      usernameField: 'username',
      passwordField: 'password',
      passReqToCallback: true // allows us to pass back the entire request to the callback
    },
    function(req, username, password, done) {
      // asynchronous
      // User.findOne wont fire unless data is sent back
      process.nextTick(function() {
        //validating all the fields, including the profile picture (if exists)
        if (validator(req, "signup")) {

          //searches the mongodb database for the username
          User.findOne({
            'username': username
          }, function(err, user) {
            // if there are any errors, return the error
            if (err) {
              logger.error("An error occured while retrieving usernames from the mongo database at the register screen\n %j", {
                'error': error
              }, {});
              return done(err);
            }
            // if there is an existing user with the same username
            if (user) {
              return done(null, false, req.flash('signUpMessage', 'That username is already taken'));
            }
            //if the username is unique
            var newUser = new User();

            // set the user's local credentials
            newUser.username = username;
            newUser.password = newUser.generateHash(password);
            newUser.createdAt = Date.now();
            newUser.name = req.body.name;

            //if a profile picture was uploaded
            if (req.files.profile_picture) {
              var imagePath = req.files.profile_picture.path;
              var newPath = path.join(__dirname, "../public/resources/profiles/" + username + "." + req.files.profile_picture.extension);

              //moves the profile picture to a permanent directory
              fs.rename(imagePath, newPath, function(err) {
                if (err) {
                  logger.error('There was an error in reading a profile picture from the /tmp/ folder\n %j', {
                    'error': err
                  }, {});
                  return done(null, false, req.flash('signUpMessage', 'Error saving your profile pic. Please try again.'));
                }
                newUser.profile_picture = username + "." + req.files.profile_picture.extension;
              });
            } else {
              newUser.profile_picture = "default.png";
            }

            newUser.save(function(err) {
              if (err) {
                logger.error("There was an error saving a new users info into the database \n %j", err, {});
                return done(null, false, req.flash('signUpMessage', 'Error saving your stuff. Please try again'));
              }
              return done(null, newUser);
            });
          });
        } else { //if the validation failed
          return done(null, false, req.flash('signUpMessage', 'Validation failed.'));
        }
      });
    }));


  passport.use('login', new LocalStrategy({
      // by default, local strategy uses username and password, we will override with email
      usernameField: 'username',
      passwordField: 'password',
      passReqToCallback: true // allows us to pass back the entire request to the callback
    },
    function(req, username, password, done) { // callback with email and password from our form

      // find a user whose email is the same as the forms email
      // we are checking to see if the user trying to login already exists
      User.findOne({
        'username': username
      }, function(err, user) {
        // if there are any errors, return the error before anything else
        if (err)
          return done(err);

        // if no user is found, return the message
        if (!user)
          return done(null, false, req.flash('loginMessage', 'Incorrect Username/Password')); // req.flash is the way to set flashdata using connect-flash

        // if the user is found but the password is wrong
        if (!user.validPassword(password)) {
          return done(null, false, req.flash('loginMessage', 'Incorrect Username/Password')); // create the loginMessage and save it to session as flashdata
        }
        // all is well, return successful user
        return done(null, user);
      });
    }));
};
