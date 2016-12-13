/**
 * Created by adnlon on 12/12/2016.
 */

var express = require('express');
var passport = require('passport');
// var Strategy = require('passport-facebook').Strategy;
var Strategy = require('passport-google-oauth20').Strategy;
var LocalStrategy = require('passport-local').Strategy;
var users = require('./db/users.js');
var bodyParser = require('body-parser');
var _ = require('underscore');
var generate_token = require('./token/generate_token.js');
var verify_token = require('./token/verify_token.js');
var bearerToken = require('express-bearer-token');


var googleId = '758299757620-r484urkkrfemnrmq41urash7n0mclt83.apps.googleusercontent.com';
var googleSecret = 'QZNUUmJ2B7mWOMXTBV3UWfRB';

//for google-oauth2
passport.use(new Strategy({
        clientID: googleId || process.env.CLIENT_ID,
        clientSecret: googleSecret || process.env.CLIENT_SECRET,
        callbackURL: 'http://localhost:3000/login/google/callback'
    },
    function (accessToken, refreshToken, profile, cb) {
        return cb(null, profile);
    }));


//local login
passport.use(new LocalStrategy(function (username, password, done) {

//look for user in user list
    var user = users.find(function (u) {
        return (u.user_name.toLowerCase() === username.toLowerCase() && u.password.toLowerCase() === password.toLowerCase() );
    });

    if (!user) {

        return done(null, false, {message: 'Username or Password incorrect'});
    } else {
        return done(null, user);
    }


}));


passport.serializeUser(function (user, cb) {
    cb(null, user);
});

passport.deserializeUser(function (obj, cb) {
    cb(null, obj);
});


// Create a new Express application.
var app = express();


// Configure view engine to render EJS templates.
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

// Use application-level middleware for common functionality, including
// logging, parsing, and session handling.
// app.use(require('morgan')('combined'));
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({extended: true}));
app.use(require('express-session')({secret: 'keyboard cat', resave: true, saveUninitialized: true}));

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());

//for body parsing
app.use(bodyParser.json());
//for getting token from header
app.use(bearerToken());


// Define routes.
app.get('/',
    function (req, res) {
        res.render('home', {user: req.user});
    });

app.get('/login',
    function (req, res) {
        res.render('login');
    });

app.get('/login/google',
    // passport.authenticate('google',{scope:['profile']});
    passport.authenticate('google', {scope: ['profile']}));

app.get('/login/google/callback',
    passport.authenticate('google', {failureRedirect: '/login'}),
    function (req, res) {
        res.redirect('/');
    });


//local login
app.post('/local_login',
    passport.authenticate('local', {
        successRedirect: '/profile',
        failureRedirect: '/login',
        failureFlush: true
    }));


app.post('/local_login/generate_token', function (req, res) {

    var body = _.pick(req.body, 'username', 'password');
    console.log(body);

    generate_token.generate(body).then(function (token) {
        console.log(token);
        res.json(token);
    }).catch(function (err) {
        res.status(401).send(err);
    });


    //step 1 to generate token for the specific username and password
    //step 2 build 3 endpoints
    //1 get all files for that user
    //2 get all files greater than a specific size
    //3 get all files before or after a specific date

    //in each end point the generated token will be verified first and then access will be provided

});


//get all files for a specific user

app.post('/users/get_files/username', function (req, res) {

    var token = req.token;
    verify_token.verify(token).then(function (token_verified) {

        //get files for that user and return it back

        res.json(token_verified);
    }).catch(function (err) {
        res.status(401).send(err);
    });
});


app.get('/profile',
    require('connect-ensure-login').ensureLoggedIn(),
    function (req, res) {
        res.render('profile', {user: req.user});
    });

app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
})


app.listen(3000);
