//also handles badge checks (not to be confusd with badges.js which holds badge content)
//NOTE - DO NOT use this for legacy items such as medals, XP, wins, and losses. Use normal DB query instead.
const app = require("../app.js");

const badgeAwardData = {
    "nukesused": {
        "badgenames": ["pyromaniac", "thebigbang"],
        "thresholds": [50, 1000]
    },
    "airliftedtroops": {
        "badgenames": ["airlift747", "airlift15000", "airlift50000"],
        "thresholds": [747, 5000, 50000]
    },
    "totalterritories": {
        "badgenames": ["40territories", "100territories", "500territories", "1200territories", "2000territories", "6000territories"],
        "thresholds": [40, 100, 500, 1200, 2000, 6000]
    },
    "supplydropsused": {
        "badgenames": ["expertlogistics", "operationemblitz"],
        "thresholds": [15, 2000]
    },
    "supplydropmisinput": {
        "badgenames": ["misinput"],
        "thresholds": [20]
    }
}

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
                let previousStat = playerstats[statname];
                playerstats[statname] += change;

                //check if player qualifies for new badge
                let badgeIndex = checkForBadgeThresholds(playerstats[statname], previousStat, badgeAwardData[statname]["thresholds"]);
                //badgeIndex alone won't work since 0 is treated as false
                //if badgeIndex is null, then it means no new badge threshold was reached
                if(badgeIndex != null) {
                    awardBadge(pubkey, badgeAwardData[statname]["badgenames"][badgeIndex]);
                }
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

//input thresholds = badge reward thresholds
function checkForBadgeThresholds(value, previousValue, thresholds) {
    for(let i=0; i<thresholds.length; i++) {
        let nextValue = thresholds[i+1];
        if(!nextValue) nextValue = Infinity;
        if(value >= thresholds[i] && value < nextValue) {
            //value already surpassed, don't try to give badge again
            if(previousValue >= thresholds[i]) {
                return null;
            }
            return i;
        }
    }
    //no badge awarded
    return null;
}

//if statname is left blank, all stats will be provided (default)
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

//this is a duplicate of the function from auth.js
//We need both since the old one manages the legacy system of badge awarding
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

module.exports = {
    updatePlayerStat,
    queryPlayerStats
}