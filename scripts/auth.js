const app = require("../app.js");

function randomnumber(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
  

function initDB() {
    return new Promise((resolve, reject) => {
        app.db.query("CREATE TABLE IF NOT EXISTS users (token VARCHAR(255), wins VARCHAR(255), losses VARCHAR(255), medals VARCHAR(255), badges VARCHAR(255), pfp VARCHAR(255))", function (err, result) {
            if (err) console.log(err);
            console.log("User data table initiated");
            app.db.query("CREATE TABLE IF NOT EXISTS devinfo (title VARCHAR(255), image VARCHAR(255), content VARCHAR(10000), submittedtime VARCHAR(255), timestamp VARCHAR(255), id VARCHAR(255))", function (err, result) {
                if (err) console.log(err);
                console.log("Dev log data table initiated");
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
    fetchAnnouncements: fetchAnnouncements
};