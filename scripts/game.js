const emitter = require("events").EventEmitter;
const fs = require("fs")
var self = new emitter();
var games = [];

function game() {
    this.newGame = function(roomid, roommap) {
        return new Promise(function(resolve, reject) {
            fs.readFile("./mapdata/" + roommap + "/mapdict.json", "utf8", function(err, mapterritorynames) {
                let mapdict = JSON.parse(mapterritorynames);
                let mapstate = [];
                let playerstate = [];
                console.log(mapdict.GR)
                for (let [key, value] of Object.entries(mapdict)) {
                    mapstate.push({"territory": key, "player": null, "troopcount": 1});
                }
                games.push({"id": roomid, "mapstate": mapstate, "playerstate": playerstate});
                resolve(games);
            });
        });
    }

    this.removeGame = function(roomid) {
        games = games.filter(function(item) {
            return item.id !== roomid;
        })
    }
    
    //players can't join once game starts, so remove players only
    this.removePlayer = function(roomid, id) {
        self.emit("removePlayer" + roomid, id);
    }
}

module.exports = game;
module.exports.gameevents = self;