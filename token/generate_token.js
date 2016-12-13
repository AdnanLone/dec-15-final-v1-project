/**
 * Created by adnlon on 12/12/2016.
 */

var jwt = require('jsonwebtoken');
var users = require('../db/users.js');
var fs = require('fs');


exports.generate = (body) => {

    return new Promise(function (resolve, reject) {


        var response = {};

        var login_username = body.username;
        var login_password = body.password;

//look for user in user list
        var user = users.find(function (u) {
            return (u.user_name.toLowerCase() === login_username.toLowerCase() && u.password.toLowerCase() === login_password.toLowerCase() );
        });

        if (user) {
            console.log('User exists');

            var options = {
                algorithm: 'RS256',
                issuer: 'Adnan-Fordham',
                expiresIn: '10h',//10 hour
                subject: 'final_project',
            };

            var privateKey = fs.readFileSync(__dirname + '/key/private_key');

            var payload = {
                user_name: user.user_name
            };

            jwt.sign(payload, privateKey, options, function (err, token) {

                if (token) {
                    response.token = token;
                    console.log('\nToken generated successfully!');
                    resolve(response);

                } else {
                    console.log(err);
                    response.tokenError = '\nError in token generation';
                    reject(response);
                }
            });

        } else {
            response.userDetailsError = 'Username or Password doesn\'t match';
            console.log('Username or Password doesn\'t match');
            reject(response);
        }


    })

};