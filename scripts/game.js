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
                games.set(roomid, {"mapstate": mapstate, "playerstate": playerstate});
                resolve(games.get(roomid));
            });
        });
    }

    this.removeGame = function(roomid) {
        games.delete(roomid);
    }
    
    //players can't join once game starts, so remove players only
    this.removePlayer = function(roomid, id) {
        self.emit("removePlayer" + roomid, id);
    }
}

module.exports = game;
module.exports.gameevents = self;