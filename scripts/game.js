const emitter = require("events").EventEmitter;
const fs = require("fs")
const self = new emitter();
const games = new Map();

function game() {
    this.newGame = function(roomid, roommap) {
        return new Promise(function(resolve, reject) {
            fs.readFile("./mapdata/" + roommap + "/mapdict.json", "utf8", function(err, mapterritorynames) {
                let mapdict = JSON.parse(mapterritorynames);
                let mapstate = [];
                let playerstate = [];
                for (let [key, value] of Object.entries(mapdict)) {
                    mapstate.push({"territory": key, "player": null, "troopcount": 1});
                }
                games.set(roomid, {"mapstate": mapstate, "playerstate": playerstate, "phase": "deploy"});
                resolve(games.get(roomid));
            });
        });
    }

    this.deployTroops = function(roomid, player, location) {
        if(games.get(roomid).phase === "deploy") {

        }
    }

    this.removeGame = function(roomid) {
        games.delete(roomid);
    }
    
    //players can't join once game starts, so remove players only
    this.removePlayer = function(roomid, id) {
        try {
            games.get(roomid).playerstate = games.get(roomid).playerstate.filter(function(item) {
                return item.id !== id;
            });
        } catch {};
        self.emit("removePlayer" + roomid, id);
    }

    this.addPlayer = function(roomid, id) {
        return new Promise(function(resolve, reject) {
            games.get(roomid).playerstate.push({"id": id, "reservecount": 5});
            resolve(games)
        });
    }
}

module.exports = game;
module.exports.gameevents = self;