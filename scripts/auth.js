/*
const app = require("../app.js");
const credentials = require("../auth.json");

function initDB() {
    return new Promise((resolve, reject) => {
        app.db.query("CREATE DATABASE IF NOT EXISTS " + credentials.database, function (err, result) {
            if (err) console.log(err)
            console.log("Database created");
            app.db.query("CREATE TABLE IF NOT EXISTS users (token VARCHAR(255), id VARCHAR(255), wins VARCHAR(255), losses VARCHAR(255), xp VARCHAR(255), pfpcolor VARCHAR(255))", function (err, result) {
                if (err) console.log(err);
                console.log("Table created");
                resolve("ok")
            });
        });
    });
}

function getUserInfo(token) {
    return new Promise((resolve, reject) => {
        initDB().then(function() {
                resolve(token);
        });
    });
}

function makeUser () {

}



module.exports = {
    getUserInfo: getUserInfo
};
*/