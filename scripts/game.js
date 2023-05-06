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
const allmaps = require("./mapconfig.js");
const configs = require("../configs.json");
const player_stats = require("./player_stats.js");

function randomnumber(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function game() {
    this.newGame = function(roomid, roommap, deploytime, isprivate) {
        return new Promise(function(resolve) {
            gameTimingEvents(roomid, deploytime);
            fs.readFile("./mapdata/" + roommap + "/mapdict.json", "utf8", function(err, mapterritorynames) {
                let mapdict = JSON.parse(mapterritorynames);
                let mapstate = {};
                let playerstate = [];

                //select boosted territories
                let availableterritories = Object.keys(mapdict);
                let selectedterritories = [];
                
                for(let i=0; i<allmaps[roommap]; i++) {
                    let territoryindex = Math.floor(Math.random()*availableterritories.length);
                    selectedterritories.push(availableterritories[territoryindex]);
                    availableterritories.splice(territoryindex, 1);
                }

                for(let [key] of Object.entries(mapdict)) {
                    if(selectedterritories.includes(key)) {
                        mapstate[key] = {"territory": key, "player": null, "troopcount": configs.gameSettings.startingTroopsPerBoostedTerritory, "troopmultiplier": 2, "defensemultiplier": 1};
                    } else {
                        mapstate[key] = {"territory": key, "player": null, "troopcount": configs.gameSettings.startingTroopsPerTerritory, "troopmultiplier": 1, "defensemultiplier": 1};
                    }
                }
                games.set(roomid, {"mapstate": mapstate, "playerstate": playerstate, "phase": "lobby", "deploytime": deploytime*1000, "totalplayers": 0, "isprivate": isprivate, "hasended": false, "mapname": roommap, "boostedterritories": selectedterritories, "suppliedterritories": []});
                resolve("ok");
            });
        });
    }

    this.queryGameStatus = function(roomid) {
        return games.get(roomid).phase;
    }

    this.isPlayerDead = function(roomid, playerid) {
        if(!games.get(roomid)) return;
        if(!games.get(roomid).playerstate) return;
        
        return games.get(roomid).playerstate.find(item => item.id === playerid).isdead;
    }

    this.getMapState = function(roomid) {
        if(!games.get(roomid)) return "no room";
        return games.get(roomid).mapstate;
    }

    this.getBoostedTerritories = function(roomid) {
        if(!games.get(roomid)) return "no room";
        return games.get(roomid).boostedterritories;
    }

    this.getSuppliedTerritories = function(roomid) {
        if(!games.get(roomid)) return "no room";
        return games.get(roomid).suppliedterritories;
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
                self.emit("startDeployPhase", [roomid, deploytime, games.get(roomid).boostedterritories]);
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
            if(games.get(roomid).mapstate[targetterritory[i]].player == null && !games.get(roomid).boostedterritories.includes(targetterritory[i])) {
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
                if(games.get(roomid).playerstate) {
                    if(games.get(roomid).playerstate.find(item => item.id === allplayers[i].id)) {
                        games.get(roomid).playerstate.find(item => item.id === allplayers[i].id).powerups_status.airlift = true;
                        self.emit("powerup_cooldownended", [roomid, allplayers[i].id, "airlift"]);
                    }
                }
            }, configs.gameSettings.powerupSettings.airlift.cooldown);
            setTimeout(function() {
                if(games.get(roomid).playerstate) {
                    if(games.get(roomid).playerstate.find(item => item.id === allplayers[i].id)) {
                        games.get(roomid).playerstate.find(item => item.id === allplayers[i].id).powerups_status.supplydrop = true;
                        self.emit("powerup_cooldownended", [roomid, allplayers[i].id, "supplydrop"]);
                    }
                }
            }, configs.gameSettings.powerupSettings.supplydrop.cooldown);
            setTimeout(function() {
                if(games.get(roomid).playerstate) {
                    if(games.get(roomid).playerstate.find(item => item.id === allplayers[i].id)) {
                        games.get(roomid).playerstate.find(item => item.id === allplayers[i].id).powerups_status.nuke = true;
                        self.emit("powerup_cooldownended", [roomid, allplayers[i].id, "nuke"]);
                    }
                }
            }, configs.gameSettings.powerupSettings.nuke.cooldown);
        }
    }

    this.addTroopsPassively = function(roomid) {
        attackIntervals[roomid] = setInterval(function() {
            if(games.get(roomid).hasended) return;
            let allterritories = Object.keys(games.get(roomid).mapstate);
            let allterritories_length = allterritories.length;
            for(let i=0; i<allterritories_length; i++) {
                if(games.get(roomid).mapstate[allterritories[i]].player != null && !games.get(roomid).mapstate[allterritories[i]].territory.startsWith("plane-")) {
                    let troopaddamount = Math.round(games.get(roomid).mapstate[allterritories[i]].troopcount * configs.gameSettings.passiveTroopAddRate) + 1;
                    
                    let maxtrooplimiter = configs.gameSettings.maxTroopAddAmount;
                    if(troopaddamount > maxtrooplimiter) {
                        troopaddamount = maxtrooplimiter;
                    }
                    troopaddamount = troopaddamount * games.get(roomid).mapstate[allterritories[i]].troopmultiplier;
                    games.get(roomid).mapstate[allterritories[i]].troopcount = games.get(roomid).mapstate[allterritories[i]].troopcount + troopaddamount;
                }
            }
            self.emit("updateMap", [roomid, games.get(roomid).mapstate]);
            self.emit("syncTroopTimer", [roomid, true]);
        }, 10000);
    }

    this.deployTroops = function(roomid, playerid, location) {
        if(games.get(roomid)) {
            if(games.get(roomid).phase === "deploy" && !games.get(roomid).boostedterritories.includes(location)) {
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

            let moveAmount = Math.round((starttroops-1)*trooppercent*0.01);
            if(moveAmount < 1) {
                return;
                /*if(starttroops >= 1) {
                    moveAmount = 1;
                } else {
                    return;
                }*/
            }

            //TODO - also check if move is valid through moves.json
            if(games.get(roomid).mapstate[start].player === playerid) {
                //"attacking" themselves? Add troops instead -- it's moving troops
                if(games.get(roomid).mapstate[target].player === playerid) {
                    games.get(roomid).mapstate[target].troopcount = targettroops + moveAmount;
                    games.get(roomid).mapstate[start].troopcount = starttroops - moveAmount;
                } else {
                    //attacking enemy
                    let defenseMultiplier = games.get(roomid).mapstate[target].defensemultiplier;
                    //boost enemy troop strength temporarily by 1.2 (or whatever is specified in configs.json) * defense multiplier
                    let targetProxyTroops = targettroops * configs.gameSettings.baseDefenseBuff * defenseMultiplier;
                    // Add defense bonus to supplied territories
                    if((games.get(roomid).suppliedterritories).includes(target)){
                        targetProxyTroops *= 1.4;
                    }
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
                        player_stats.updatePlayerStat(idToPubkey(roomid, playerid), "totalterritories", 1)
                    }

                    //if territory has 0 troops, it becomes neutral
                    if(games.get(roomid).mapstate[target].troopcount == 0) {
                        games.get(roomid).mapstate[target].player = null;
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

                    if(!games.get(roomid).isprivate && !games.get(roomid).playerstate.find(item => item.id === targetedplayer).isaccounted) {
                        auth.editPlayerGameStats(totalplayersinroom.length+1, games.get(roomid).totalplayers, idToPubkey(roomid, targetedplayer)).then(function(result) {
                            games.get(roomid).playerstate.find(item => item.id === targetedplayer).isaccounted = true;
                            self.emit("pstatschange", [roomid, targetedplayer, result]);
                        });
                    }
                    self.emit("playerdead", [roomid, targetedplayer, totalplayersinroom.length+1]);
                    games.get(roomid).playerstate.find(item => item.id === targetedplayer).isdead = true;
                }
            }

            checkForWin(roomid);

            self.emit("updateMap", [roomid, games.get(roomid).mapstate]);
        }
    }
    
    this.supplydrop = function(target, id, roomid, playerid) {
        try {
            let mapdata;
            let start;
            let distance;

            if(games.get(roomid).playerstate.find(item => item.id === playerid).powerups_status.airlift == false){
                return;
            }

            mapdata = this.getMapState(roomid);

            {
                let tempterritory = "temp-" + playerid;
                games.get(roomid).mapstate[tempterritory] = ({"territory": tempterritory, "player": playerid, "troopcount": 0});
                
                start = tempterritory;
                let startTroopCount = games.get(roomid).mapstate[start].troopcount;

                Object.keys(mapdata).forEach((key) => {
                    if(!(key.startsWith("plane-") || key.startsWith("temp-")) && mapdata[key].player === playerid){

                        if(games.get(roomid).mapstate[key].troopcount > startTroopCount && key !== target){
                            start = key;
                            startTroopCount = games.get(roomid).mapstate[start].troopcount;
                        }
                    }
                });

                delete games.get(roomid).mapstate[tempterritory];

                if(start === tempterritory){
                    return;
                }

                let x1 = territory_centers[games.get(roomid).mapname][target.toLowerCase()][1];
                let y1 = territory_centers[games.get(roomid).mapname][target.toLowerCase()][0];
                let x2 = territory_centers[games.get(roomid).mapname][start.toLowerCase()][1];
                let y2 = territory_centers[games.get(roomid).mapname][start.toLowerCase()][0];

                //pythag theoreum
                distance = Math.sqrt(((x2 - x1) * (x2 - x1)) + ((y2 - y1) * (y2 - y1)));
            }

            if(games.get(roomid).hasended) return;
            
            if(games.get(roomid).playerstate.find(item => item.id === playerid).powerups_status.supplydrop == true) {
                games.get(roomid).playerstate.find(item => item.id === playerid).powerups_status.supplydrop = false;
                setTimeout(function() {
                    if(games.get(roomid)) {
                        if(games.get(roomid).playerstate.find(item => item.id === playerid)) {
                            games.get(roomid).playerstate.find(item => item.id === playerid).powerups_status.supplydrop = true;
                            self.emit("powerup_cooldownended", [roomid, playerid, "supplydrop"]);
                        }
                    }
                }, configs.gameSettings.powerupSettings.supplydrop.cooldown);

                self.emit("powerup_initsupplydrop", [roomid, start, target, id]);

                // the plane travels 72px a second, so to get the traveltime you'll have to divide the total distance in pixels by 120
                
                let traveltime = ((distance-50)/72)*1000;

                //500ms is the deploy time, so the travel time can't be less than around 500ms
                if(traveltime < 500) {
                    traveltime = 500;
                }

                setTimeout(function() {
                    //triggers both plane sync and paratrooper animation
                    self.emit("supplydroparrived", [roomid, target, id]);

                    //paratroopers take 5s to reach the ground
                    setTimeout(function() {
                        // Functionality for when the supply crate lands
                        let index = games.get(roomid).suppliedterritories.length;
                        let suppliedterritoriesArr = games.get(roomid).suppliedterritories;
                        suppliedterritoriesArr.push(target);
                        setTimeout(function() {
                            // Remove territory supply once it wears off
                            if (index > -1) { // only splice array when item is found
                                suppliedterritoriesArr.splice(index, 1);
                              }
                        }, 30000)
                    }, 5000)
                }, traveltime);
            }
        } catch(e) {
            //console.log(e);
        }
    }

    //id = plane id ex. 69420
    //playerid = id of the player that sent it
    this.airlift = function(start, target, id, roomid, playerid, amount) {
        let parent = this;
        try {
            if(games.get(roomid).hasended) return;
            
            if(games.get(roomid).playerstate.find(item => item.id === playerid).powerups_status.airlift == true && (games.get(roomid).mapstate[start].troopcount * (amount / 100)) > 0) {
                games.get(roomid).playerstate.find(item => item.id === playerid).powerups_status.airlift = false;
                
                //create a "ghost territory" to serve as the plane
                let planeterritory = "plane-" + id + "-" + playerid;
                games.get(roomid).mapstate[planeterritory] = ({"territory": planeterritory, "player": playerid, "troopcount": 0});
                //then move troops to the ghost territory
                this.attackTerritory(roomid, playerid, start, planeterritory, amount);

                //TODO - get the actual # of troops rather than percent
                //player_stats.updatePlayerStat(idToPubkey(roomid, playerid), "airliftedtroops", troopcount)

                setTimeout(function() {
                    if(games.get(roomid)) {
                        if(games.get(roomid).playerstate.find(item => item.id === playerid)) {
                            games.get(roomid).playerstate.find(item => item.id === playerid).powerups_status.airlift = true;
                            self.emit("powerup_cooldownended", [roomid, playerid, "airlift"]);
                        }
                    }
                }, configs.gameSettings.powerupSettings.airlift.cooldown);

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
                        //Add 1 troop to the plane to account for the subtracted troops from start territory in attackTerritory function
                        games.get(roomid).mapstate[planeterritory].troopcount += 1;
                        //move all troops off the plane
                        parent.attackTerritory(roomid, playerid, planeterritory, target, 100);
                        //delete the plane "ghost" territory
                        delete games.get(roomid).mapstate[planeterritory];

                        /*
                        --death detection--
                        Triggers death if you fail to capture territory and have 0 territories left.
                        Normally you won't die if you fail an attack, but airlifts work differently.
                        */
                        let checkterritories = Object.keys(games.get(roomid).mapstate);
                        let checkterritories_length = checkterritories.length;
                        let isplayerdead = true;
                        for(let i = 0; i < checkterritories_length; i++) {
                            if(games.get(roomid).mapstate[checkterritories[i]].player === playerid) {
                                isplayerdead = false;
                                break;
                            }
                        }
        
                        if(isplayerdead) {
                            checkterritories = Object.keys(games.get(roomid).mapstate);
                            let checkterritories_length = checkterritories.length;
                            let totalplayersinroom = [];
                            for(let i = 0; i < checkterritories_length; i++) {
                                if(games.get(roomid).mapstate[checkterritories[i]].player && !totalplayersinroom.includes(games.get(roomid).mapstate[checkterritories[i]].player)) {
                                    totalplayersinroom.push(games.get(roomid).mapstate[checkterritories[i]].player);
                                }
                            }
        
                            if(!games.get(roomid).isprivate) {
                                auth.editPlayerGameStats(totalplayersinroom.length+1, games.get(roomid).totalplayers, idToPubkey(roomid, playerid)).then(function(result) {
                                    games.get(roomid).playerstate.find(item => item.id === playerid).isaccounted = true;
                                    self.emit("pstatschange", [roomid, playerid, result]);
                                });
                            }
                            self.emit("playerdead", [roomid, playerid, totalplayersinroom.length+1]);
                            games.get(roomid).playerstate.find(item => item.id === playerid).isdead = true;
                        }
            
                        checkForWin(roomid);
                    }, 5000)
                }, traveltime);
            }
        } catch(e) {
            //console.log(e);
        }
    }

    this.nuke = function(target, roomid, playerid) {
        try {
            if(games.get(roomid).hasended) return;

            if(games.get(roomid).playerstate.find(item => item.id === playerid).powerups_status.nuke == true) {
                games.get(roomid).playerstate.find(item => item.id === playerid).powerups_status.nuke = false;
                setTimeout(function() {
                    if(games.get(roomid)) {
                        if(games.get(roomid).playerstate.find(item => item.id === playerid)) {
                            games.get(roomid).playerstate.find(item => item.id === playerid).powerups_status.nuke = true;
                            self.emit("powerup_cooldownended", [roomid, playerid, "nuke"]);
                        }
                    }
                }, configs.gameSettings.powerupSettings.nuke.cooldown);

                self.emit("powerup_nuke", [roomid, target]);
                player_stats.updatePlayerStat(idToPubkey(roomid, playerid), "nukesused", 1)
                
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
                    //y=-0.32x+70
                    //or whatever is specified in configs.json
                    let remProportion = 1 - (-configs.gameSettings.powerupSettings.nuke.damageDecay*(distance) + configs.gameSettings.powerupSettings.nuke.groundZeroDamage)*0.01; //percent to decimal, then to proportion of troops remaining
                    
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

                    let targetid = games.get(roomid).mapstate[territoryName].player;

                    //if territory has 0 troops, it becomes neutral
                    if(games.get(roomid).mapstate[territoryName].troopcount == 0) {
                        games.get(roomid).mapstate[territoryName].player = null;
                    }

                    if(targetid) {
                        /*
                        --death detection--
                        For players that get their territories knocked to 0 troops and wiped out.
                        */
                        let checkterritories = Object.keys(games.get(roomid).mapstate);
                        let checkterritories_length = checkterritories.length;
                        let isplayerdead = true;
                        for(let i = 0; i < checkterritories_length; i++) {
                            if(games.get(roomid).mapstate[checkterritories[i]].player === targetid) {
                                isplayerdead = false;
                                break;
                            }
                        }
        
                        if(isplayerdead) {
                            checkterritories = Object.keys(games.get(roomid).mapstate);
                            let checkterritories_length = checkterritories.length;
                            let totalplayersinroom = [];
                            for(let i = 0; i < checkterritories_length; i++) {
                                if(games.get(roomid).mapstate[checkterritories[i]].player && !totalplayersinroom.includes(games.get(roomid).mapstate[checkterritories[i]].player)) {
                                    totalplayersinroom.push(games.get(roomid).mapstate[checkterritories[i]].player);
                                }
                            }
        
                            if(!games.get(roomid).isprivate) {
                                auth.editPlayerGameStats(totalplayersinroom.length+1, games.get(roomid).totalplayers, idToPubkey(roomid, targetid)).then(function(result) {
                                    games.get(roomid).playerstate.find(item => item.id === targetid).isaccounted = true;
                                    self.emit("pstatschange", [roomid, targetid, result]);
                                });
                            }
                            self.emit("playerdead", [roomid, targetid, totalplayersinroom.length+1]);
                            games.get(roomid).playerstate.find(item => item.id === targetid).isdead = true;
                        }
            
                        checkForWin(roomid);
                    }
                }
                
                self.emit("updateMap", [roomid, games.get(roomid).mapstate]);
            }
        } catch(e) {
            console.log(e);
        }
    }

    function checkForWin(roomid) {
        if(games.get(roomid).hasended) return;

        let checkterritories = Object.keys(games.get(roomid).mapstate);
        let checkterritories_length = checkterritories.length;
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
                let allterritories_length = allterritories.length;
                for(let i=0; i<allterritories_length; i++) {
                    if(games.get(roomid).mapstate[allterritories[i]].player === id) {
                        games.get(roomid).mapstate[allterritories[i]].player = null;
                    }
                }

                let totalplayersinroom = games.get(roomid).playerstate.length;

                if(!isplayeraccounted && !games.get(roomid).isprivate) {
                    auth.editPlayerGameStats(totalplayersinroom+1, games.get(roomid).totalplayers, playerpubkey);
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
            //isaccounted = is dead or spectating (means player is marked as not being alive)
            games.get(roomid).playerstate.push({"id": id, "pubkey": pubkey, "isaccounted": false, "isdead": false, "powerups_status": {"airlift": false, "nuke": false}});
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