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
        app.db.query("CREATE TABLE IF NOT EXISTS users (token VARCHAR(255), wins INT, losses INT, medals INT, badges VARCHAR(15000), pfp VARCHAR(10000), tournamentprogress VARCHAR(1000), verified VARCHAR(5), timecreated VARCHAR(255), username VARCHAR(255), email VARCHAR(1500), password VARCHAR(1500), publickey VARCHAR(255), playercolor VARCHAR(100), playersettings VARCHAR(10000), metadata VARCHAR(10000), xp INT, playerstats VARCHAR(10000))", function (err, result) {
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

function runSQLQuery(query) {
    return new Promise((resolve) => {
        app.db.query(query, function (err, result) {
            if(err) {
                resolve(err);
            }

            resolve(result);
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

function getPublicUserInfo(username) { //case insensitive search
    return new Promise((resolve, reject) => {
        app.db.query(`SELECT * FROM users WHERE lower(username)=$1`, [username.toLowerCase()], function (err, result) {
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
        app.db.query(`SELECT * FROM users WHERE lower(username)=$1`, [username.toLowerCase()], function (err, result) {
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
        app.db.query(`SELECT * FROM users WHERE LOWER(username)=LOWER($1)`, [username], function (err, result) {
            if(result.rows.length != 0) {
                conflicts.push("u3")
                app.db.query(`SELECT * FROM users WHERE LOWER(email)=LOWER($1)`, [email], function (err, result) {
                    if(result.rows.length != 0) {
                        conflicts.push("e3");
                        resolve(conflicts);
                    } else {
                        resolve(conflicts);
                    }
                });
            } else {
                app.db.query(`SELECT * FROM users WHERE LOWER(email)=LOWER($1)`, [email], function (err, result) {
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
                app.db.query(`INSERT INTO users (token, wins, losses, medals, badges, pfp, tournamentprogress, verified, timecreated, username, email, password, publickey, playercolor, playersettings, metadata, xp)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`, [token, 0, 0, 0, {}, null, null, false, Date.now(), username, email, hashedpassword, publickey, "red", null, {"type": "user"}, 0], function (err, result) {
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

function deleteUnusedAccounts() {
    let expiredtime = Date.now() - 3600000;
    app.db.query(`DELETE FROM users WHERE timecreated<$1 AND verified=$2`, [expiredtime, false]).then(function(result) {
        console.log(`Deleted unverified accounts`);
    }).catch(function(error) {
        console.log("Error deleting accounts: " + error);
    });
}

//FUNCTION MUST USE PRIVATE KEY (token/uuid) BECAUSE IT CHANGES USER DATA
function changePlayerColor(uuid, color) {
    return new Promise((resolve, reject) => {
        if(uuid.startsWith("guest-")) {
            reject("ok");
        }

        app.db.query(`UPDATE users SET playercolor=$1 WHERE token=$2`, [color, uuid]).then(function() {
            resolve("ok");
        });
    })
}

function awardBadge(pubkey, name) {
    return new Promise((resolve) => {
        if(pubkey.startsWith("guest-")) {
            resolve("ok");
        }

        app.db.query(`SELECT * FROM users WHERE publickey=$1`, [pubkey]).then(function(result) {
            let badgedata = JSON.parse(result.rows[0].badges);

            // check if badge has already been awarded
            if(badgedata[name]) {
                resolve("ok");
            }else{
                badgedata[name] = {"awarded": Date.now()}
                app.db.query(`UPDATE users SET badges=$1 WHERE publickey=$2`, [badgedata, pubkey]).then(function() {
                    resolve("ok");
                })
            }
        });
    })
}

function checkForWinBadge(wins, pubkey) {
    if(wins >= 50) {
        awardBadge(pubkey, "50wins");
    } else if(wins >= 20) {
        awardBadge(pubkey, "20wins");
    } else if(wins >= 10) {
        awardBadge(pubkey, "10wins");
    } else if(wins >= 5) {
        awardBadge(pubkey, "5wins");
    } else if(wins >= 1) {
        awardBadge(pubkey, "firstwin");
    }
}

function editPlayerGameStats(place, totalplayers, pubkey) {
    return new Promise((resolve) => {
        if(!pubkey) {
            resolve("none");
        }

        if(pubkey.startsWith("guest-")) {
            resolve("none");
        }

        //the medal change calculation algorithm
        let medalchange = ((totalplayers-1)/2 - (place-1)) * (totalplayers+1) * 2;
        if(medalchange < 0) {
            medalchange = Math.round(medalchange*0.7);
        }

        let xpGain = (totalplayers-place+1) * (totalplayers+1) * 2;


        if(place == 1) {
            app.db.query(`UPDATE users SET wins=wins+1, medals=medals+$1, xp=xp+$3 WHERE publickey=$2`, [medalchange, pubkey, xpGain]).then(function() {
                app.db.query(`SELECT medals, wins, losses, publickey FROM users WHERE publickey=$1`, [pubkey]).then(function(result) {
                    if(result.rows.length == 0) {
                        resolve(["none", "none"]);
                    }
                    if(result.rows[0]) {
                        checkForWinBadge(result.rows[0].wins, pubkey);
                    }
                    resolve([medalchange, xpGain]);
                });
            });
        } else {
            app.db.query(`UPDATE users SET losses=losses+1, medals=medals+$1, xp=xp+$3 WHERE publickey=$2`, [medalchange, pubkey, xpGain]).then(function() {
                app.db.query(`SELECT medals, wins, losses, publickey FROM users WHERE publickey=$1`, [pubkey]).then(function(result) {
                    if(result.rows.length == 0) {
                        resolve(["none", "none"]);
                    }
                    resolve([medalchange, xpGain])
                });
            });
        }
    });
}

//--ANNOUNCEMENTS PANEL--

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

function fetchLeaderboard() {
    return new Promise((resolve, reject) => {
        app.db.query(`SELECT username, medals, wins, losses FROM users ORDER BY medals DESC LIMIT 10`, function (err, result) {
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
    getPublicUserInfo: getPublicUserInfo,
    deleteUnusedAccounts: deleteUnusedAccounts,
    awardBadge: awardBadge,
    editPlayerGameStats: editPlayerGameStats,
    runSQLQuery: runSQLQuery,
    changePlayerColor: changePlayerColor,
    fetchLeaderboard, fetchLeaderboard
};