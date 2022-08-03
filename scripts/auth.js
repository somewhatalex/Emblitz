const app = require("../app.js");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const passwordHash = require("password-hash");

//--NOT FOR SECURITY PURPOSES! Use crypto.randomInt(min, max) instead!--
function randomnumber(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function initDB() {
    return new Promise((resolve, reject) => {
        app.db.query("CREATE TABLE IF NOT EXISTS users (token VARCHAR(255), wins VARCHAR(255), losses VARCHAR(255), medals VARCHAR(255), badges VARCHAR(15000), pfp VARCHAR(10000), tournamentprogress VARCHAR(1000), verified VARCHAR(5), timecreated VARCHAR(255), username VARCHAR(255), email VARCHAR(1500), password VARCHAR(1500), publickey VARCHAR(255), playercolor VARCHAR(100), playersettings VARCHAR(10000), metadata VARCHAR(10000))", function (err, result) {
            if (err) console.log(err);
            console.log("User data table initiated");
            app.db.query("CREATE TABLE IF NOT EXISTS devinfo (title VARCHAR(255), image VARCHAR(1000), content VARCHAR(10000), submittedtime VARCHAR(255), timestamp VARCHAR(255), id VARCHAR(255))", function (err, result) {
                if (err) console.log(err);
                console.log("Dev log data table initiated");
                resolve("ok");
            });
        });
    });
}

function getUserInfo(token) {
    return new Promise((resolve, reject) => {
        app.db.query(`SELECT * FROM users WHERE token=$1`, [token], function (err, result) {
            if(result.rows.length != 0) {
                resolve(result.rows[0]);
            } else {
                reject("guest user");
            }
        });
    });
}

function getPublicUserInfo(username) {
    return new Promise((resolve, reject) => {
        app.db.query(`SELECT * FROM users WHERE username=$1`, [username], function (err, result) {
            if(result.rows.length != 0) {
                resolve(result.rows[0]);
            } else {
                reject("user not found");
            }
        });
    });
}

function getUserInfoNoReject(token) {
    return new Promise((resolve) => {
        app.db.query(`SELECT * FROM users WHERE token=$1`, [token], function (err, result) {
            resolve(result.rows[0]);
        });
    });
};

function userLogin(username, password) {
    return new Promise((resolve, reject) => {
        app.db.query(`SELECT * FROM users WHERE username=$1`, [username], function (err, result) {
            if(result.rows.length != 0) {
                if(passwordHash.verify(password, result.rows[0].password)) {
                    resolve([result.rows[0]]);
                } else {
                    reject("password is incorrect");
                }
            } else {
                reject("username does not exist");
            }
        });
    });
}

function checkUserConflicts(username, email) {
    return new Promise((resolve, reject) => {
        let conflicts = [];
        app.db.query(`SELECT * FROM users WHERE username=$1`, [username], function (err, result) {
            if(result.rows.length != 0) {
                conflicts.push("u3")
                app.db.query(`SELECT * FROM users WHERE email=$1`, [email], function (err, result) {
                    if(result.rows.length != 0) {
                        conflicts.push("e3");
                        resolve(conflicts);
                    } else {
                        resolve(conflicts);
                    }
                });
            } else {
                app.db.query(`SELECT * FROM users WHERE email=$1`, [email], function (err, result) {
                    if(result.rows.length != 0) {
                        conflicts.push("e3");
                        resolve(conflicts);
                    } else {
                        resolve(conflicts);
                    }
                });
            }
        });
    });
}

function createUUID() {
    return new Promise((resolve, reject) => {
        let id = "";
        let chars = "1234567890qwertyuiopasdfghjklzxcvbnm";
        for(let i=0; i<50; i++) {
            id += chars.charAt(crypto.randomInt(0, chars.length-1));
        }

        //duplicate check once (odds it a 50 char string matching twice is negligible)
        app.db.query(`SELECT * FROM users WHERE token=$1`, [id], function (err, result) {
            if(result.rows.length == 0) {
                resolve(id);
            } else {
                for(let i=0; i<50; i++) {
                    id += chars.charAt(crypto.randomInt(0, chars.length-1));
                }
            }
        });
    });
}

function createPublicKey() {
    return new Promise((resolve, reject) => {
        let id = "";
        let chars = "1234567890qwertyuiopasdfghjklzxcvbnm";
        for(let i=0; i<50; i++) {
            id += chars.charAt(crypto.randomInt(0, chars.length-1));
        }

        //duplicate check once (odds it a 50 char string matching twice is negligible)
        app.db.query(`SELECT * FROM users WHERE publickey=$1`, [id], function (err, result) {
            if(result.rows.length == 0) {
                resolve(id);
            } else {
                for(let i=0; i<50; i++) {
                    id += chars.charAt(crypto.randomInt(0, chars.length-1));
                }
            }
        });
    });
}

function registerUser(username, email, password) {
    return new Promise((resolve, reject) => {
        createUUID().then(function(token) {
            createPublicKey().then(function(publickey) {
                let hashedpassword = passwordHash.generate(password);
                app.db.query(`INSERT INTO users (token, wins, losses, medals, badges, pfp, tournamentprogress, verified, timecreated, username, email, password, publickey, playercolor, playersettings, metadata)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`, [token, 0, 0, 0, [{"name": "betatester"}], null, null, false, Date.now(), username, email, hashedpassword, publickey, "red", null, {"type": "user"}], function (err, result) {
                    genJWT(publickey).then(function(jwttoken) {
                        resolve([token, jwttoken, publickey]);
                    });
                });
            });
        });
    });
}

function genJWT(uuid) {
    return new Promise((resolve, reject) => {
        app.db.query(`SELECT email FROM users WHERE publickey=$1`, [uuid], function (err, result) {
            let email = result.rows[0].email;
            let u_info = [{publickey: uuid, email: email}];
            let issuer = "dr. defario's grandson samuel" //issuer of token

            let token = jwt.sign({
                data: u_info,
                iss: issuer,
                expiresIn: 60*10 //10 minutes (measure in seconds)
            }, process.env.AUTHSECRET);

            resolve(token);
        });
    });
}

function verifyUUID(key) {
    return new Promise((resolve, reject) => {
        app.db.query(`SELECT * FROM users WHERE token=$1 AND verified=$2`, [key, false], function (err, result) {
            if(result.rows[0]) {
                let u_info = [{publickey: result.rows[0].publickey, email: result.rows[0].email}];
                let issuer = "dr. defario's grandson samuel" //issuer of token

                let token = jwt.sign({
                    data: u_info,
                    iss: issuer,
                    expiresIn: 60*10 //10 minutes (measure in seconds)
                }, process.env.AUTHSECRET);

                let userinfo = [result.rows[0].email, result.rows[0].username, token]
                resolve(userinfo);
            } else {
                reject();
            }
        });
    });
}

function postAnnouncement(title, content, submittedtime, image) {
    return new Promise((resolve, reject) => {
        let chars = "1234567890abcdef";
        app.db.query(`SELECT count(*) AS rowamount FROM devinfo;`, function (err, result) {
            if (err) console.log(err);

            let id = result.rows[0].rowamount;
            let reslength = result.rows[0].rowamount.length;
            for(let i=0; i<(15-reslength); i++) {
                id += chars.charAt(randomnumber(0, chars.length-1));
            }

            let timestamp = Date.now();
            app.db.query(`INSERT INTO devinfo(title, image, content, submittedtime, timestamp, id)
            VALUES($1, $2, $3, $4, $5, $6);`, [title, image, content, submittedtime, timestamp, id], function (err, result) {
                if (err) console.log(err);
                console.log(`An announcement was posted with id ${id}`)
                resolve("ok")
            });
        });
    });
}

function deleteAnnouncement(id) {
    return new Promise((resolve, reject) => {
        app.db.query(`DELETE FROM devinfo WHERE id=$1`, [id], function (err, result) {
            if (err) console.log(err);
            console.log("Deleted announcement " + id);
            resolve("ok")
        });
    });
}

function fetchAnnouncements(start, amount) {
    return new Promise((resolve, reject) => {
        app.db.query(`SELECT * FROM devinfo ORDER BY timestamp DESC LIMIT $1 OFFSET $2`, [Number(amount), Number(start)], function (err, result) {
            if (err) console.log(err);
            resolve(result.rows);
        });
    });
}

module.exports = {
    getUserInfo: getUserInfo,
    postAnnouncement: postAnnouncement,
    deleteAnnouncement: deleteAnnouncement,
    fetchAnnouncements: fetchAnnouncements,
    registerUser: registerUser,
    checkUserConflicts: checkUserConflicts,
    verifyUUID: verifyUUID,
    initDB: initDB,
    userLogin: userLogin,
    getUserInfoNoReject: getUserInfoNoReject,
    getPublicUserInfo: getPublicUserInfo
};