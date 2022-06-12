const emitter = require("events").EventEmitter;
const fs = require("fs")
const self = new emitter();
const games = new Map();

function game() {
    this.newGame = function(roomid, roommap) {
        return new Promise(function(resolve, reject) {
            fs.readFile("./mapdata/" + roommap + "/mapdict.json", "utf8", function(err, mapterritorynames) {
                let mapdict = JSON.parse(mapterritorynames);
                let mapstate = {};
                let playerstate = [];
                for (let [key, value] of Object.entries(mapdict)) {
                    mapstate[key] = {"territory": key, "player": null, "troopcount": 1};
                }
                games.set(roomid, {"mapstate": mapstate, "playerstate": playerstate, "phase": "deploy"});
                resolve(games.get(roomid));
            });
        });
    }

    this.deployTroops = function(roomid, playerid, location) {
        if(games.get(roomid).phase === "deploy") {
            let mapstatejson = games.get(roomid).mapstate;
            let targetterritory = Object.keys(games.get(roomid).mapstate);
            let targetlength = targetterritory.length;
            for(let i=0; i<targetlength; i++) {
                let queryterritory = mapstatejson[targetterritory[i]]
                //reset all territories the player has (player can only have 1 bc it's deploy phase)
                if(playerid === mapstatejson[targetterritory[i]].player) {
                    //only reset if player deployed in valid place
                    if(mapstatejson[location].player === playerid || mapstatejson[location].player === null) {
                        games.get(roomid).mapstate[targetterritory[i]].player = null;
                        games.get(roomid).mapstate[targetterritory[i]].troopcount = 1;
                    }
                }
                //override the previous condition if player selects this
                if(location === queryterritory.territory) {
                    //only assign if not taken
                    if(queryterritory.player == null) {
                        games.get(roomid).mapstate[targetterritory[i]].player = playerid;
                        games.get(roomid).mapstate[targetterritory[i]].troopcount = 5;
                    } else {
                        self.emit("gameError" + roomid, "cannot update");
                    }
                }
            }
            self.emit("updateMap", [roomid, games.get(roomid).mapstate]);
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
            resolve(games);
        });
    }
}

module.exports = game;
module.exports.gameevents = self;