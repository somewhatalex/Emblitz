//also handles badge checks (not to be confusd with badges.js which holds badge content)
//NOTE - DO NOT use this for legacy items such as medals, XP, wins, and losses. Use normal DB query instead.
const app = require("../app.js");

function updatePlayerStat(pubkey, statname, change) {
    return new Promise((resolve, reject) => {
        if(pubkey.startsWith("guest-") || pubkey.startsWith("b-")) {
            resolve("guest");
        }
        app.db.query("SELECT playerstats FROM users WHERE publickey=$1", [pubkey]).then(result => {
            var playerstats = JSON.parse(result.rows[0].playerstats);
            if(playerstats == null) {
                playerstats = {}
            }
            if(playerstats[statname]) {
                playerstats[statname] += change;
            } else {
                playerstats[statname] = change;
            }
            const updatedPlayerstats = JSON.stringify(playerstats);
            app.db.query("UPDATE users SET playerstats=$1 WHERE publickey=$2", [updatedPlayerstats, pubkey]).then(() => {
                resolve(playerstats);
            });
        }).catch(function(err) {
            //console.log(err);
            reject("err");
        });
    });
}

function queryPlayerStats(pubkey, statname = null) {
    return new Promise((resolve, reject) => {
        if(pubkey.startsWith("guest-") || pubkey.startsWith("b-")) {
            resolve("guest");
        }
        app.db.query("SELECT playerstats FROM users WHERE publickey=$1", [pubkey]).then((result) => {
            const stats = JSON.parse(result[0].playerstats);
            if(statname) {
                resolve(stats[statname] || 0);
            }
            resolve(stats);
        }).catch(function(err) {
            console.log(err);
            reject("err");
        });;
    });
}

module.exports = {
    updatePlayerStat,
    queryPlayerStats
}