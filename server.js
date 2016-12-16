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
var getFiles = require('./get_files/getFiles.js');

var formidable = require('formidable');
var fs = require('fs');
var dir = require('node-dir');
var path = require('path');
var _str = require('underscore.string');
var moment = require('moment');
var mysql = require("mysql");
var dir = require('node-dir');


//db configuration
//write in seperate file later

var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    database: "files"
});

con.connect(function (err) {
    if (err) {
        console.log('Error connecting to Db');
        return;
    }
    console.log('Connection established');
});


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

        console.log(user);
        user.displayName = user.user_name;
        console.log(user);
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

app.post('/users/get_files/:username', function (req, res) {

    var token = req.token;
    var username = req.params.username;
    verify_token.verify(token).then(function (token_verified) {

        console.log(token_verified.message);

        con.query('SELECT filename from b where user = ?', [username], function (err, values) {
            if (err) {
                res.status(401).send(err);
            } else {
                console.log(values);
                res.json(values);
            }
        });
        //
        // con.end(function (err) {
        // });

        // res.json(getFiles.getUserFiles(username));
        //get files for that user and return it back
        // res.json(token_verified)
    }).catch(function (err) {
        res.status(401).send(err);
    });

});


//get files smaller than a particular size

app.post('/users/getsmaller/:size', function (req, res) {

    var token = req.token;
    var size = req.params.size;
    verify_token.verify(token).then(function (token_verified) {

        console.log(token_verified.message);

        con.query('SELECT filename from b where  filesize < ?', [size], function (err, values) {
            if (err) {
                res.status(401).send(err);
            } else {
                console.log(values);
                res.json(values);
            }
        });

        // res.json(getFiles.getUserFiles(username));
        //get files for that user and return it back
        // res.json(token_verified)
    }).catch(function (err) {
        res.status(401).send(err);
    });

});


//get files smaller than a particular size

app.post('/users/getbefore/:time', function (req, res) {

    var token = req.token;
    var time = req.params.time;
    verify_token.verify(token).then(function (token_verified) {

        console.log(token_verified.message);

        con.query('SELECT filename from b where  epochtimestamp < ?', [time], function (err, values) {
            if (err) {
                res.status(401).send(err);
            } else {
                console.log(values);
                res.json(values);
            }
        });
        //
        // con.end(function (err) {
        // });

        // res.json(getFiles.getUserFiles(username));
        //get files for that user and return it back
        // res.json(token_verified)
    }).catch(function (err) {
        res.status(401).send(err);
    });

});


var fileDetails = {};

//for uploading files
app.post('/upload', function (req, res) {


    // create an incoming form object
    var form = new formidable.IncomingForm();

    // specify that we want to allow the user to upload multiple files in a single request
    form.multiples = true;

    // store all uploads in the /uploads directory
    form.uploadDir = path.join(__dirname + '/uploads', '/');

    // every time a file has been uploaded successfully,
    // rename it to it's orignal name
    form.on('file', function (field, file) {

        var fileSize = file.size;
        console.log(fileSize);


        var now = moment();
        console.log(now);
        console.log(file.name);
        var username = file.name.split('-x-x-')[1].trim();
        var fileName = file.name.split('-x-x-')[0].trim();
        console.log(username);
        var userDir = form.uploadDir + username;

        if (!fs.existsSync(userDir)) {
            fs.mkdirSync(userDir);
        }

        fs.rename(file.path, path.join(userDir, fileName));


        if (_.isNull(username) || _.isUndefined(username)) {
            username = 'oauth';
        }

        
        fileDetails.user = username;
        fileDetails.filename = fileName;
        fileDetails.filesize = fileSize;
        fileDetails.epochtimestamp = Math.floor(new Date().getTime() / 1000);


    });

    // log any errors that occur
    form.on('error', function (err) {
        console.log('An error has occured: \n' + err);
    });

    // once all the files have been uploaded, send a response to the client
    form.on('end', function () {
        console.log(' upload success');
        console.log(fileDetails);

        con.query('INSERT INTO b SET ?', fileDetails, function (err, res) {
            if (err) {
                console.log(err)
            }

            console.log("insert success\n");
            console.log("******************");
            // console.log('Last insert ID:', res.insertId);
        });

        con.query('SELECT * FROM b', function (err, rows) {
            if (err) {
                console.log(err);
            }

            console.log('Data received from Db:\n');
            console.log(rows);
        });
        //
        // con.end(function (err) {
        // });
        res.end('success');
    });

    // parse the incoming request containing the form data
    form.parse(req);

});

app.get('/profile',
    require('connect-ensure-login').ensureLoggedIn(),
    function (req, res) {
        res.render('profile', {user: req.user});
    });

app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});


app.get('/getFileList/:username', function (req, res) {

    var dir_username = req.params.username;

    var location = __dirname + '/uploads/' + dir_username + '/';
    console.log(location);

    dir.files(location, function (err, files) {
        if (!err) {
            console.log(files);
            res.json([files]);
        } else {
            console.log(err);
        }
    });
});


app.get('/test', function (req, res) {
    // res.json(moment().format("YYYYMMDDHHmm"));


    res.json(Math.floor(new Date().getTime() / 1000)
    );
});


app.listen(3000);
