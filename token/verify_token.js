/**
 * Created by adnlon on 12/12/2016.
 */

var fs = require('fs');
var jwt = require('jsonwebtoken');


exports.verify = (token) => {

    return new Promise(function (resolve, reject) {


        var user = {};
        var response = {};


        /**
         * verifying and decoding the header
         */
        var options = {
            algorithm: 'RS256',
            issuer: 'Adnan-Fordham',
            subject: 'final_project',
            ignoreExpiration: false
            // ignoreExpiration: if true do not validate the expiration of the token.
        };


        var publicKey = fs.readFileSync(__dirname + '/key/public_key');

        jwt.verify(token, publicKey, options, function (err, decoded) {
            if (decoded) {
                console.log('\n' + 'Token Verification Successful');
                console.log(decoded);
                user.username = decoded.user_name;
                user.message = 'verified';
                resolve(user);
            }

            else if (err.name == 'TokenExpiredError') {
                console.log('Session has expired.');
                response.message = 'expired token';
                reject(response);
            }
            else {
                //invalid token
                console.log('\n' + 'Token Verification Error :');
                response.message = 'invalid token';
                reject(response);
            }
        })
    })

};
