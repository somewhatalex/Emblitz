const emitter = require("events").EventEmitter;
const fs = require("fs");
const self = new emitter();
const games = new Map();
var attackIntervals = {};
var gameLobbyTimers = {};
var gameLobbyTimerHandlers = {};
var gameDeployTimers = {}

function game() {
    this.newGame = function(roomid, roommap, deploytime) {
        return new Promise(function(resolve, reject) {
            gameTimingEvents(roomid, deploytime);
            fs.readFile("./mapdata/" + roommap + "/mapdict.json", "utf8", function(err, mapterritorynames) {
                let mapdict = JSON.parse(mapterritorynames);
                let mapstate = {};
                let playerstate = [];
                for(let [key, value] of Object.entries(mapdict)) {
                    mapstate[key] = {"territory": key, "player": null, "troopcount": 1};
                }
                games.set(roomid, {"mapstate": mapstate, "playerstate": playerstate, "phase": "lobby", "deploytime": deploytime*1000});
                resolve("ok");
            });
        });
    }

    this.queryGameStatus = function(roomid) {
        return games.get(roomid).phase;
    }

    //lobby timer controls
    this.pauseLobbyTimer = function(roomid) {
        gameLobbyTimerHandlers[roomid].pause(gameLobbyTimers[roomid]);
    }

    this.resumeLobbyTimer = function(roomid) {
        gameLobbyTimerHandlers[roomid].resume(gameLobbyTimers[roomid]);
    }

    this.skipLobbyTimer = function(roomid) {
        clearTimeout(gameLobbyTimers[roomid]);
        delete gameLobbyTimers[roomid];
        startDeployPhase(roomid, games.get(roomid).deploytime);
    }

    function Timer(id, callback, delay) {
        let args = arguments, self = this;
        let start = Math.floor(new Date().getTime());
    
        this.clear = function(id) {
            clearTimeout(gameLobbyTimers[id]);
        };
    
        this.pause = function(id) {
            clearTimeout(gameLobbyTimers[id]);
            delay = delay - (Math.floor(new Date().getTime()) - start);
        };
    
        this.resume = function(id) {
            start = Math.floor(new Date().getTime());
            gameLobbyTimers[id] = setTimeout(function() {
                callback.apply(self, Array.prototype.slice.call(args, 3, args.length));
            }, delay);
        };
    
        this.pause(gameLobbyTimers[id]);
    }

    function gameTimingEvents(roomid, deploytime) {
        //-- ADD LOBBY CODE/LOGIC/TIMING HERE
        deploytime = deploytime*1000; //convert to seconds
        
        //set lobby timer (when lobby wait is done, start deploy phase)
        gameLobbyTimerHandlers[roomid] = new Timer(roomid, startDeployPhase, 20000, roomid, deploytime);
    }

    function startDeployPhase(roomid, deploytime) {
        if(games.get(roomid).phase === "lobby") {
            if(gameLobbyTimers[roomid]) {
                clearTimeout(gameLobbyTimers[roomid]);
                delete gameLobbyTimers[roomid];
            }

            games.get(roomid).phase = "deploy";
            self.emit("startDeployPhase", [roomid, deploytime, "ok"]);
            gameDeployTimers[roomid] = setTimeout(function() {endDeployPhase(roomid)}, deploytime);
        };
    }

    function endDeployPhase(roomid) {
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
            games.get(roomid).mapstate[availableterritories[territoryindex]].troopcount = 10;
            availableterritories.splice(territoryindex, 1)
        }

        games.get(roomid).phase = "attack";
        self.emit("updateMap", [roomid, games.get(roomid).mapstate]);
        self.emit("startAttackPhase", [roomid, "ok"]);
        delete gameDeployTimers[roomid];
    }

    this.addTroopsPassively = function(roomid) {
        attackIntervals[roomid] = setInterval(function() {
            let allterritories= Object.keys(games.get(roomid).mapstate);
            allterritories_length = allterritories.length;
            for(let i=0; i<allterritories_length; i++) {
                if(games.get(roomid).mapstate[allterritories[i]].player != null){
                    games.get(roomid).mapstate[allterritories[i]].troopcount = games.get(roomid).mapstate[allterritories[i]].troopcount + Math.round(games.get(roomid).mapstate[allterritories[i]].troopcount * 0.1) + 1;
                }
            }
            self.emit("updateMap", [roomid, games.get(roomid).mapstate]);
        }, 10000);
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
                        games.get(roomid).mapstate[targetterritory[i]].troopcount = 10;
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
                    //attacking enemy

                    //boost enemy troop strength temporarily by 1.2 for defense
                    let targetProxyTroops = targettroops*1.2;
                    targetProxyTroops = targetProxyTroops - moveAmount;
                    targetProxyTroops = Math.round(targetProxyTroops);
                    if(targetProxyTroops > targettroops) {
                        targetProxyTroops = targettroops;
                    }

                    games.get(roomid).mapstate[target].troopcount = targetProxyTroops;
                    games.get(roomid).mapstate[start].troopcount = starttroops - moveAmount;

                    //captured
                    if(games.get(roomid).mapstate[target].troopcount < 0) {
                        games.get(roomid).mapstate[target].player = playerid;
                        games.get(roomid).mapstate[target].troopcount = Math.abs(targetProxyTroops);
                    }
                }
            }

            self.emit("updateMap", [roomid, games.get(roomid).mapstate]);
        }
    }

    this.removeGame = function(roomid) {
        clearInterval(attackIntervals[roomid]);
        clearTimeout(gameDeployTimers[roomid]);
        clearTimeout(gameLobbyTimers[roomid]);

        delete attackIntervals[roomid];
        delete gameDeployTimers[roomid];
        delete gameLobbyTimers[roomid];
        games.delete(roomid);
    }
    
    //players can't join once game starts, so remove players only
    this.removePlayer = function(roomid, id) {
        try {
            games.get(roomid).playerstate = games.get(roomid).playerstate.filter(function(item) {
                return item.id !== id;
            });

            let allterritories= Object.keys(games.get(roomid).mapstate);
            allterritories_length = allterritories.length;
            for(let i=0; i<allterritories_length; i++) {
                if(games.get(roomid).mapstate[allterritories[i]].player === id){
                    games.get(roomid).mapstate[allterritories[i]].player = null;
                }
            }
        } catch {};
        self.emit("removePlayer" + roomid, id);
    }

    this.addPlayer = function(roomid, id) {
        return new Promise(function(resolve, reject) {
            games.get(roomid).playerstate.push({"id": id});
            resolve("ok");
        });
    }
}

module.exports = game;
module.exports.gameevents = self;