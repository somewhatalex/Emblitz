//also handles badge checks (not to be confusd with badges.js which holds badge content)
//NOTE - DO NOT use this for legacy items such as medals, XP, wins, and losses. Use normal DB query instead.
const { runSQLQuery } = require("./auth.js");

function updatePlayerStat(pubkey, statname, change) {
    return new Promise((resolve, reject) => {
        if(pubkey.startsWith("guest-") || pubkey.startsWith("b-")) {
            resolve("guest")
        }
        runSQLQuery(`SELECT playerstats FROM users WHERE publickey='${pubkey}'`).then(result => {
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
            const updateQuery = `UPDATE users SET playerstats='${updatedPlayerstats}' WHERE publickey='${pubkey}'`;
            runSQLQuery(updateQuery).then(() => {
                console.log(playerstats)
                resolve(playerstats);
            });
        }).catch(function(err) {
            console.log(err);
            reject("err");
        });
    });
}

function queryPlayerStats(pubkey, statname = null) {
    return new Promise((resolve, reject) => {
        if(pubkey.startsWith("guest-") || pubkey.startsWith("b-")) {
            resolve("guest")
        }
        const query = `SELECT playerstats FROM users WHERE publickey='${pubkey}'`;
        runSQLQuery(query).then((result) => {
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