const emitter = require("events").EventEmitter;
const fs = require("fs");
const self = new emitter();
const games = new Map();
const auth = require("./auth.js");
const territory_centers = require("./territory_centers.js");
var attackIntervals = {};
var gameLobbyTimers = {};
var gameLobbyTimerHandlers = {};
var gameDeployTimers = {};

function randomnumber(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function game() {
    this.newGame = function(roomid, roommap, deploytime, isprivate) {
        return new Promise(function(resolve, reject) {
            gameTimingEvents(roomid, deploytime);
            fs.readFile("./mapdata/" + roommap + "/mapdict.json", "utf8", function(err, mapterritorynames) {
                let mapdict = JSON.parse(mapterritorynames);
                let mapstate = {};
                let playerstate = [];
                for(let [key] of Object.entries(mapdict)) {
                    mapstate[key] = {"territory": key, "player": null, "troopcount": 1};
                }
                games.set(roomid, {"mapstate": mapstate, "playerstate": playerstate, "phase": "lobby", "deploytime": deploytime*1000, "totalplayers": 0, "isprivate": isprivate, "hasended": false, "mapname": roommap});
                resolve("ok");
            });
        });
    }

    this.queryGameStatus = function(roomid) {
        return games.get(roomid).phase;
    }

    this.getMapState = function(roomid) {
        if(!games.get(roomid)) return "no room";
        return games.get(roomid).mapstate;
    }

    //lobby timer controls
    this.pauseLobbyTimer = function(roomid) {
        gameLobbyTimerHandlers[roomid].pause(gameLobbyTimers[roomid]);
    }

    this.resumeLobbyTimer = function(roomid) {
        gameLobbyTimerHandlers[roomid].resume(gameLobbyTimers[roomid], roomid);
    }

    this.skipLobbyTimer = function(roomid) {
        clearTimeout(gameLobbyTimers[roomid]);
        delete gameLobbyTimers[roomid];
        startDeployPhase(roomid, games.get(roomid).deploytime);
    }

    function Timer(id, callback, delay) {
        let args = arguments, selftimer = this;
        let start = Math.floor(new Date().getTime());
    
        this.clear = function(id) {
            clearTimeout(gameLobbyTimers[id]);
        };
    
        this.pause = function(id) {
            clearTimeout(gameLobbyTimers[id]);
            delay = delay - (Math.floor(new Date().getTime()) - start);
        };
    
        this.resume = function(id, roomid) {
            start = Math.floor(new Date().getTime());
            gameLobbyTimers[id] = setTimeout(function() {
                callback.apply(selftimer, Array.prototype.slice.call(args, 3, args.length));
            }, delay);

            self.emit("updateLobbyTimer", [roomid, delay]);
        };
    }

    function gameTimingEvents(roomid, deploytime) {
        //-- ADD LOBBY CODE/LOGIC/TIMING HERE
        deploytime = deploytime*1000; //convert to seconds
        
        //set lobby timer (when lobby wait is done, start deploy phase)
        gameLobbyTimerHandlers[roomid] = new Timer(roomid, startDeployPhase, 20000, roomid, deploytime);
        gameLobbyTimerHandlers[roomid].pause(gameLobbyTimers[roomid]);
    }

    function startDeployPhase(roomid, deploytime) {
        if(games.get(roomid)) {
            if(games.get(roomid).phase === "lobby") {
                if(gameLobbyTimers[roomid]) {
                    clearTimeout(gameLobbyTimers[roomid]);
                    delete gameLobbyTimers[roomid];
                }

                games.get(roomid).phase = "deploy";
                games.get(roomid).totalplayers = games.get(roomid).playerstate.length;
                self.emit("startDeployPhase", [roomid, deploytime, "ok"]);
                gameDeployTimers[roomid] = setTimeout(function() {endDeployPhase(roomid)}, deploytime);
            };
        }
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

        //initiate powerup cooldown timers
        let allplayers = games.get(roomid).playerstate;
        allplayers_length = Object.keys(games.get(roomid).playerstate).length;
        for(let i=0; i<allplayers_length; i++) {
            setTimeout(function() {
                if(games.get(roomid).playerstate.find(item => item.id === allplayers[i].id)) {
                    games.get(roomid).playerstate.find(item => item.id === allplayers[i].id).powerups_status.airlift = true;
                    self.emit("powerup_cooldownended", [roomid, allplayers[i].id, "airlift"]);
                }
            }, 20000);
            setTimeout(function() {
                if(games.get(roomid).playerstate.find(item => item.id === allplayers[i].id)) {
                    games.get(roomid).playerstate.find(item => item.id === allplayers[i].id).powerups_status.nuke = true;
                    self.emit("powerup_cooldownended", [roomid, allplayers[i].id, "nuke"]);
                }
            }, 40000);
        }
    }

    this.addTroopsPassively = function(roomid) {
        attackIntervals[roomid] = setInterval(function() {
            if(games.get(roomid).hasended) return;
            let allterritories = Object.keys(games.get(roomid).mapstate);
            let allterritories_length = allterritories.length;
            for(let i=0; i<allterritories_length; i++) {
                if(games.get(roomid).mapstate[allterritories[i]].player != null && !games.get(roomid).mapstate[allterritories[i]].territory.startsWith("plane-")) {
                    let troopaddamount = Math.round(games.get(roomid).mapstate[allterritories[i]].troopcount * 0.1) + 1;
                    if(troopaddamount > 5) {
                        troopaddamount = 5;
                    }
                    games.get(roomid).mapstate[allterritories[i]].troopcount = games.get(roomid).mapstate[allterritories[i]].troopcount + troopaddamount;
                }
            }
            self.emit("updateMap", [roomid, games.get(roomid).mapstate]);
            self.emit("syncTroopTimer", [roomid, true]);
        }, 10000);
    }

    this.deployTroops = function(roomid, playerid, location) {
        if(games.get(roomid)) {
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
    }

    this.attackTerritory = function(roomid, playerid, start, target, trooppercent) {
        if(!games.get(roomid)) return;
        if(games.get(roomid).hasended) return;
        if(games.get(roomid).phase === "attack") {
            let starttroops = games.get(roomid).mapstate[start].troopcount;
            let targettroops = games.get(roomid).mapstate[target].troopcount;

            let targetedplayer = games.get(roomid).mapstate[target].player;

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

            if(targetedplayer) {
                let checkterritories = Object.keys(games.get(roomid).mapstate);
                let checkterritories_length = checkterritories.length;
                let istargetdead = true;
                for(let i = 0; i < checkterritories_length; i++) {
                    if(games.get(roomid).mapstate[checkterritories[i]].player === targetedplayer) {
                        istargetdead = false;
                        break;
                    }
                }

                if(istargetdead) {
                    checkterritories = Object.keys(games.get(roomid).mapstate);
                    let checkterritories_length = checkterritories.length;
                    let totalplayersinroom = [];
                    for(let i = 0; i < checkterritories_length; i++) {
                        if(games.get(roomid).mapstate[checkterritories[i]].player && !totalplayersinroom.includes(games.get(roomid).mapstate[checkterritories[i]].player)) {
                            totalplayersinroom.push(games.get(roomid).mapstate[checkterritories[i]].player);
                        }
                    }

                    if(!games.get(roomid).isprivate) {
                        auth.editPlayerGameStats(totalplayersinroom.length+1, games.get(roomid).totalplayers, idToPubkey(roomid, targetedplayer)).then(function(result) {
                            games.get(roomid).playerstate.find(item => item.id === targetedplayer).isaccounted = true;
                            self.emit("pstatschange", [roomid, targetedplayer, result]);
                        });
                    }
                    self.emit("playerdead", [roomid, targetedplayer, totalplayersinroom.length+1]);
                }
            }

            checkForWin(roomid);

            self.emit("updateMap", [roomid, games.get(roomid).mapstate]);
        }
    }

    //id = plane id ex. 69420
    //playerid = id of the player that sent it
    this.airlift = function(start, target, id, roomid, playerid, amount) {
        let parent = this;
        try {
            if(games.get(roomid).playerstate.find(item => item.id === playerid).powerups_status.airlift == true && (games.get(roomid).mapstate[start].troopcount * (amount / 100)) > 0) {
                games.get(roomid).playerstate.find(item => item.id === playerid).powerups_status.airlift = false;
                
                //create a "ghost territory" to serve as the plane
                let planeterritory = "plane-" + id + "-" + playerid;
                games.get(roomid).mapstate[planeterritory] = ({"territory": planeterritory, "player": playerid, "troopcount": 0});
                //then move troops to the ghost territory
                this.attackTerritory(roomid, playerid, start, planeterritory, amount);

                setTimeout(function() {
                    if(games.get(roomid)) {
                        if(games.get(roomid).playerstate.find(item => item.id === playerid)) {
                            games.get(roomid).playerstate.find(item => item.id === playerid).powerups_status.airlift = true;
                            self.emit("powerup_cooldownended", [roomid, playerid, "airlift"]);
                        }
                    }
                }, 20000);

                self.emit("powerup_initairlift", [roomid, start, target, id]);

                /*
                the plane travels 120px a second, so to get the traveltime
                you'll have to divide the total distance in pixels by 120
                */

                let x1 = territory_centers[games.get(roomid).mapname][start.toLowerCase()][1];
                let y1 = territory_centers[games.get(roomid).mapname][start.toLowerCase()][0];
                let x2 = territory_centers[games.get(roomid).mapname][target.toLowerCase()][1];
                let y2 = territory_centers[games.get(roomid).mapname][target.toLowerCase()][0];

                //pythag theoreum
                let distance = Math.sqrt(((x2 - x1) * (x2 - x1)) + ((y2 - y1) * (y2 - y1)));
                
                let traveltime = ((distance-50)/120)*1000;

                //500ms is the deploy time, so the travel time can't be less than around 500ms
                if(traveltime < 500) {
                    traveltime = 500;
                }

                setTimeout(function() {
                    //triggers both plane sync and paratrooper animation
                    self.emit("airliftarrived", [roomid, target, id]);

                    //paratroopers take 5s to reach the ground
                    setTimeout(function() {
                        //move all troops off the plane
                        parent.attackTerritory(roomid, playerid, planeterritory, target, 100);
                        //delete the plane "ghost" territory
                        delete games.get(roomid).mapstate[planeterritory]
                    }, 5000)
                }, traveltime);
            }
        } catch(e) {
            //console.log(e);
        }
    }

    this.nuke = function(target, roomid, playerid) {
        try {
            if(games.get(roomid).playerstate.find(item => item.id === playerid).powerups_status.nuke == true) {
                games.get(roomid).playerstate.find(item => item.id === playerid).powerups_status.nuke = false;
                setTimeout(function() {
                    if(games.get(roomid)) {
                        if(games.get(roomid).playerstate.find(item => item.id === playerid)) {
                            games.get(roomid).playerstate.find(item => item.id === playerid).powerups_status.nuke = true;
                            self.emit("powerup_cooldownended", [roomid, playerid, "nuke"]);
                        }
                    }
                }, 40000);

                self.emit("powerup_nuke", [roomid, target]);
                
                //splash damage from nuke calculations
                //import the data of the centers of each territory in the map
                let mapcenters = territory_centers[games.get(roomid).mapname];

                //get target coords
                let x1 = mapcenters[target.toLowerCase()][1];
                let y1 = mapcenters[target.toLowerCase()][0];

                //loop through all other territories, calc distance, and deal damage per algorithm
                let mapcentersCount = Object.keys(mapcenters).length;
                for(let i=0; i<mapcentersCount; i++) {
                    let x2 = mapcenters[Object.keys(mapcenters)[i]][1];
                    let y2 = mapcenters[Object.keys(mapcenters)[i]][0];
                    
                    //pythag theoreum (calc distance)
                    let distance = Math.sqrt(((x2 - x1) * (x2 - x1)) + ((y2 - y1) * (y2 - y1)));

                    //damage should be 70% at ground 0, decrease by 0.32% per unit
                    //y=-0.28x+70
                    let remProportion = 1 - (-0.32*(distance)+70)*0.01; //percent to decimal, then to proportion of troops remaining
                    
                    //edge cases in case a bad glitch occurs?
                    if(remProportion < 0) {
                        remProportion = 0;
                    } else if(remProportion > 1) {
                        remProportion = 1;
                    }

                    let territoryName = Object.keys(mapcenters)[i].toUpperCase();

                    //deal damage -- with chance of rounding normally or down (or if it's not the target)
                    if(randomnumber(0, 2) < 2 && Object.keys(mapcenters)[i] !== target.toLowerCase()) {
                        //2/3 chance of rounding damage normally
                        games.get(roomid).mapstate[territoryName].troopcount = Math.round(games.get(roomid).mapstate[territoryName].troopcount*remProportion);
                    } else {
                        //round down
                        games.get(roomid).mapstate[territoryName].troopcount = Math.floor(games.get(roomid).mapstate[territoryName].troopcount*remProportion);
                    }
                }
                
                self.emit("updateMap", [roomid, games.get(roomid).mapstate]);
            }
        } catch(e) {
            console.log(e);
        }
    }

    function checkForWin(roomid) {
        let checkterritories = Object.keys(games.get(roomid).mapstate);
        checkterritories_length = checkterritories.length;
        let totalplayersinroom = []
        for(let i = 0; i < checkterritories_length; i++) {
            if(games.get(roomid).mapstate[checkterritories[i]].player && !totalplayersinroom.includes(games.get(roomid).mapstate[checkterritories[i]].player)) {
                totalplayersinroom.push(games.get(roomid).mapstate[checkterritories[i]].player);
            }
        }

        if(totalplayersinroom.length == 1) {
            if(!games.get(roomid).isprivate && games.get(roomid)) {
                auth.editPlayerGameStats(1, games.get(roomid).totalplayers, idToPubkey(roomid, totalplayersinroom[0])).then(function(result) {
                    if(games.get(roomid)) {
                        games.get(roomid).playerstate.find(item => item.id === totalplayersinroom[0]).isaccounted = true;
                    }
                    self.emit("pstatschange", [roomid, totalplayersinroom[0], result]);
                });
            }
            self.emit("playerWon", [roomid, totalplayersinroom[0]]);
            games.get(roomid).hasended = true;
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
            let playerpubkey, isplayeraccounted = null;
            if(games.get(roomid).phase !== "lobby") {
                playerpubkey = idToPubkey(roomid, id);
                isplayeraccounted = games.get(roomid).playerstate.find(item => item.id === id).isaccounted;
            }

            games.get(roomid).playerstate = games.get(roomid).playerstate.filter(function(item) {
                return item.id !== id;
            });

            if(games.get(roomid).phase !== "lobby") {
                let allterritories = Object.keys(games.get(roomid).mapstate);
                allterritories_length = allterritories.length;
                for(let i=0; i<allterritories_length; i++) {
                    if(games.get(roomid).mapstate[allterritories[i]].player === id) {
                        games.get(roomid).mapstate[allterritories[i]].player = null;
                    }
                }

                checkterritories = Object.keys(games.get(roomid).mapstate);
                checkterritories_length = checkterritories.length;
                let totalplayersinroom = [];
                for(let i = 0; i < checkterritories_length; i++) {
                    if(games.get(roomid).mapstate[checkterritories[i]].player && !totalplayersinroom.includes(games.get(roomid).mapstate[checkterritories[i]].player)) {
                        totalplayersinroom.push(games.get(roomid).mapstate[checkterritories[i]].player);
                    }
                }

                if(!isplayeraccounted && !games.get(roomid).isprivate) {
                    auth.editPlayerGameStats(totalplayersinroom.length+1, games.get(roomid).totalplayers, playerpubkey);
                }
                self.emit("updateMap", [roomid, games.get(roomid).mapstate]);
            }

            checkForWin(roomid);
        } catch(e) {
            //console.log(e)
        };
        self.emit("removePlayer" + roomid, id);
    }

    this.addPlayer = function(roomid, id, pubkey) {
        return new Promise(function(resolve) {
            games.get(roomid).playerstate.push({"id": id, "pubkey": pubkey, "isaccounted": false, "powerups_status": {"airlift": false, "nuke": false}});
            resolve("ok");
        });
    }

    function idToPubkey(roomid, id) {
        if(games.get(roomid).playerstate) {
            let foundplayer = games.get(roomid).playerstate.find(item => item.id === id);
            return foundplayer.pubkey;
        } else {
            return false;
        }
    }
}

module.exports = game;
module.exports.gameevents = self;