const emitter = require("events").EventEmitter;
const fs = require("fs");
const self = new emitter();
const games = new Map();

function game() {
    this.newGame = function(roomid, roommap, deploytime) {
        gameTimingEvents(roomid, deploytime);
        return new Promise(function(resolve, reject) {
            fs.readFile("./mapdata/" + roommap + "/mapdict.json", "utf8", function(err, mapterritorynames) {
                let mapdict = JSON.parse(mapterritorynames);
                let mapstate = {};
                let playerstate = [];
                for(let [key, value] of Object.entries(mapdict)) {
                    mapstate[key] = {"territory": key, "player": null, "troopcount": 1};
                }
                games.set(roomid, {"mapstate": mapstate, "playerstate": playerstate, "phase": "deploy"});
                resolve(games.get(roomid));
            });
        });
    }

    function gameTimingEvents(roomid, deploytime) {
        //-- ADD LOBBY CODE/LOGIC/TIMING HERE

        deploytime = deploytime*1000; //convert to seconds
        setTimeout(function() {
            let targetterritory = Object.keys(games.get(roomid).mapstate);
            let targetlength = targetterritory.length;
            let playersdeployed = [];
            for(let i=0; i<targetlength; i++) {
                if(games.get(roomid).mapstate[targetterritory[i]].player != null) {
                    playersdeployed.push(games.get(roomid).mapstate[targetterritory[i]].player);
                }
            }

            let playercount = games.get(roomid).playerstate.length;
            let totalplayerids = [];
            for(let i=0; i<playercount; i++) {
                totalplayerids.push(games.get(roomid).playerstate[i].id);
            }
            
            //get players who haven't deployed yet
            let remainingplayers = totalplayerids.filter(x => !playersdeployed.includes(x));

            //then assign them a random unclaimed territory
            let availableterritories = [];
            for(let i=0; i<targetlength; i++) {
                if(games.get(roomid).mapstate[targetterritory[i]].player == null) {
                    availableterritories.push(targetterritory[i]);
                }
            }
            
            for(let i=0; i<remainingplayers.length; i++) {
                let territoryindex = Math.floor(Math.random()*availableterritories.length);
                games.get(roomid).mapstate[availableterritories[territoryindex]].player = remainingplayers[i];
                games.get(roomid).mapstate[availableterritories[territoryindex]].troopcount = 5;
                availableterritories.splice(territoryindex, 1)
            }

            games.get(roomid).phase = "attack";
            self.emit("updateMap", [roomid, games.get(roomid).mapstate]);
            self.emit("startAttackPhase", [roomid, "ok"]);
        }, deploytime);
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
                        return;
                    }
                }
            }
            self.emit("updateMap", [roomid, games.get(roomid).mapstate]);
        }
    }

    this.attackTerritory = function(roomid, playerid, start, target, trooppercent) {
        if(games.get(roomid).phase === "attack") {
            let starttroops = games.get(roomid).mapstate[start].troopcount;
            let targettroops = games.get(roomid).mapstate[target].troopcount;

            //anticheat
            if(trooppercent > 100) {
                trooppercent = 100;
            } else if(trooppercent < 1) {
                trooppercent = 1;
            }

            let moveAmount = Math.round(starttroops*trooppercent*0.01);
            if(moveAmount < 1) {
                if(starttroops >= 1) {
                    moveAmount = 1;
                } else {
                    return;
                }
            }

            //TODO - also check if move is valid through moves.json
            if(games.get(roomid).mapstate[start].player === playerid) {
                //"attacking" themselves? Add troops instead -- it's moving troops
                if(games.get(roomid).mapstate[target].player === playerid) {
                    games.get(roomid).mapstate[target].troopcount = targettroops + moveAmount;
                    games.get(roomid).mapstate[start].troopcount = starttroops - moveAmount;
                } else {
                    games.get(roomid).mapstate[target].troopcount = targettroops - moveAmount;
                    games.get(roomid).mapstate[start].troopcount = starttroops - moveAmount;

                    //captured
                    if(games.get(roomid).mapstate[target].troopcount < 0) {
                        games.get(roomid).mapstate[target].player = playerid;
                        games.get(roomid).mapstate[target].troopcount = Math.abs(targettroops - moveAmount);
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