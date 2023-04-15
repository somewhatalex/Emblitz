const fs = require("fs");
const gamehandler = require("./game.js");
const emitter = require("events").EventEmitter;

const game = new gamehandler();
const gameevents = gamehandler.gameevents;

gameevents.setMaxListeners(0);

var botids = [];
var botgids = [];

//user ids start with u-, bots start with u-b-
//keep these separate

function botid() {
  let chars = "1234567890qwertyuiopasdfghjklzxcvbnm";
  let id = "u-b-";
  for(let i=0; i<20; i++) {
      id += chars.charAt(randomnumber(0, chars.length-1));
  }
  while(botids.includes(id)) {
      let id = "u-b-"
      for(let i=0; i<20; i++) {
          id += chars.charAt(randomnumber(0, chars.length-1));
      }
  }
  botids.push(id);
  return id;
}

function botgid() {
  let chars = "1234567890qwertyuiopasdfghjklzxcvbnm";
  let id = "b-";
  for(let i=0; i<40; i++) {
      id += chars.charAt(randomnumber(0, chars.length-1));
  }
  while(botgids.includes(id)) {
      let id = "b-"
      for(let i=0; i<40; i++) {
          id += chars.charAt(randomnumber(0, chars.length-1));
      }
  }
  botgids.push(id);
  return id;
}

function randomnumber(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

class emblitzBot {
  constructor(roomid, botname, color, moves) {
    this.roomid = roomid;
    this.botname = botname;
    this.color = color;
    this.moves = moves;
    this.id = botid();
    this.gid = botgid();
    this.deploytimer = null;
    this.attacktimer = null;
  }

  /*
  -- valid bot actions in-game --
  game.deployTroops(roomid, playerid, location);
  game.attackTerritory(roomid, playerid, start, target, trooppercent);
  game.getMapState(roomid);

  > game.getMapState gets the current map state (can be called anytime)
  > game.attackTerritory takes care of moving troops as well between territories
  */

  moveToTerritory(territory) {
    console.log(territory); //placeholder for now
    console.log(this.roomid + this.botname + this.color);
  }

  joinGame() {
    let parent = this; //the promise seems to override "this"
    return new Promise(function(resolve) {
      game.addPlayer(parent.roomid, parent.id, parent.gid).then(function() {
        resolve([parent.id, parent.botname, parent.color]);
      });
    });
  }

  initiateController() {
    let parent = this;
    gameevents.on("startDeployPhase", function(result) {
      if(result[0] === parent.roomid) {
        parent.initiateDeployAI();
      }
    });
    
    gameevents.on("startAttackPhase", function(result) {
      if(result[0] === parent.roomid) {
        parent.endDeployAI();
        parent.initiateAttackAI_A();
      }
    });
  }

  //A is the current algorithm
  initiateAttackAI_A() {
    let parent = this;

    let moveslength = this.moves.length;

    let ownedTerritories = [];
    let borderTerritories = [];
    let internalTerritories = [];
    let unownedTerritories = [];
    let mapdata = game.getMapState(parent.roomid);
    let path = [];
    let possibleMoves = [];
    let bestOption = '';
    let bestOptionCount = 0;
    let workingVariable = '';
    if(mapdata === "no room") clearTimeout(parent.attacktimer);

    this.attacktimer = setInterval(function() {
      ownedTerritories = [];
      borderTerritories = [];
      internalTerritories = [];
      unownedTerritories = [];
      mapdata = game.getMapState(parent.roomid);
      path = [];
      possibleMoves = [];
      bestOption = '';
      bestOptionCount = 0;
      workingVariable = '';
      if(mapdata === "no room") clearTimeout(parent.attacktimer);
      
      //Wyatt's bot attack algorithem
      Object.keys(mapdata).forEach((key) => {
        if(!key.startsWith("plane-"))
          if(mapdata[key].player === parent.id){
            ownedTerritories.push(mapdata[key]);
          }else{
            unownedTerritories.push(mapdata[key]);
          }
      });

      //Find out what territories are borders and put them into borderTerritories array
      Object.keys(ownedTerritories).forEach((key) => {
        for(let i = 0; i < moveslength; i++) {
          workingVariable = parent.moves[i].split(" ");
          if(workingVariable[0] === ownedTerritories[key].territory && mapdata[workingVariable[1]].player !== parent.id){
            borderTerritories.push(ownedTerritories[key]);
          } else if(workingVariable[1] === ownedTerritories[key].territory) {
            let switchVar = workingVariable[1];
            workingVariable[1] = workingVariable[0];
            workingVariable[0] = switchVar;
            if(mapdata[workingVariable[1]].player !== parent.id) {
              borderTerritories.push(ownedTerritories[key]);
            }
          } else {
            internalTerritories.push(ownedTerritories[key]);
          }
        }
      });
      
      //Launch an attack
      if(borderTerritories[randomnumber(0, borderTerritories.length - 1)]) {
        path.push(borderTerritories[randomnumber(0, borderTerritories.length - 1)].territory); // Select a random territory owned to start at
      }
      for(let i = 0; i < moveslength; i++){ // Gather up the possible moves
          workingVariable = parent.moves[i].split(" ");
          if(workingVariable[0] === path[0]){
            possibleMoves.push(workingVariable[1]);
          } else if(workingVariable[1] === path[0]){
            possibleMoves.push(workingVariable[0]);
          }
      }

      bestOptionCount = Infinity;
      for(let i = 0; i < possibleMoves.length; i++){ // Find which enemy is the weakest
        if((mapdata[possibleMoves[i]].troopcount < bestOptionCount) && (mapdata[possibleMoves[i]].player !== parent.id)){
          bestOption = possibleMoves[i];
          bestOptionCount = mapdata[possibleMoves[i]].troopcount;
        }
      }
      /*let troopaddamount = (bestOptionCount * 0.1) + 1;
       if(troopaddamount > 5) {
          troopaddamount = 5;
      } 

      bestOptionCount = (bestOptionCount + troopaddamount) * 1.2;*/

      let movedDuringCycle = false; //has bot moved during this check cycle?

      if(mapdata[path[0]]) {
        if(mapdata[path[0]].troopcount > bestOptionCount) {
          if(internalTerritories.includes(path[0])) {
            //move more troops if is internal territory
            game.attackTerritory(parent.roomid, parent.id, path[0], bestOption, randomnumber(70, 120)); //go over 100 to maximize rng for 100 (since everything above it is set to 100)
          } else {
            let moveAmount = ((bestOptionCount / (bestOptionCount + mapdata[path[0]].troopcount)) * 100) + 20 + randomnumber(10, 60);
            game.attackTerritory(parent.roomid, parent.id, path[0], bestOption, moveAmount);
          }
          movedDuringCycle = true;
        }
      }

      //Move troops internally
      if(internalTerritories.length > 0) {
        path = [];
        path.push(internalTerritories[randomnumber(0, (internalTerritories.length - 1))].territory); // Select a random territory owned to start at
        possibleMoves = [];
        for(let i = 0; i < moveslength; i++) { // Gather up the possible moves
          workingVariable = parent.moves[i].split(" ");
          if(workingVariable[0] === path[0]) {
            possibleMoves.push(workingVariable[1]);
          } else if(workingVariable[1] === path[0]) {
            possibleMoves.push(workingVariable[0]);
          }
        }

        bestOption = possibleMoves[0];
        bestOptionCount = 0;
        for(let i = 0; i < possibleMoves.length; i++) {
          if(mapdata[possibleMoves[i]].troopcount > bestOptionCount && mapdata[bestOption].player === parent.id) {
            bestOption = possibleMoves[i];
            bestOptionCount = mapdata[possibleMoves[i]].length;
          }
        }

        if(mapdata[bestOption]) {
          if(movedDuringCycle == false && mapdata[bestOption].player === parent.id && randomnumber(0, 2) <= 1) {
            game.attackTerritory(parent.roomid, parent.id, path[0], bestOption, randomnumber(80, 100));
          }
        }
      }

      //Attempt to use an airlift
      if(internalTerritories.length > 0 && randomnumber(0, 5) == 1 && internalTerritories.length > 0 && internalTerritories[randomnumber(0, internalTerritories.length - 1)]) {
          game.airlift(internalTerritories[randomnumber(0, internalTerritories.length - 1)].territory, unownedTerritories[randomnumber(0, unownedTerritories.length - 1)].territory, randomnumber(0, 999999), parent.roomid, parent.id, 90);
      }

      //Attempt to nuke players
      if(ownedTerritories.length > 0 && randomnumber(0, 6) == 1){
        let loopStartIndex;
        let targetedTerritory;

        for(let x = 0; x < unownedTerritories.length; x++){
          if(unownedTerritories[x].player != null){
            targetedTerritory = unownedTerritories[x];
            loopStartIndex = x;
            break;
          }
        }

        for(let x = 0; x < unownedTerritories.length; x++){
          if(targetedTerritory.troopcount < unownedTerritories[x].troopcount && unownedTerritories[x].player != null){
            targetedTerritory = unownedTerritories[x];
          }
        }

        game.nuke(targetedTerritory.territory, parent.roomid, parent.id);
      }

      //Attempt to supply drop to players
      if(ownedTerritories.length > 1 && randomnumber(0, 6) == 1){
        bestOption = -1;
        //TEMPORARY: Reinforce the weakest territory
        for(let x = 0; x < borderTerritories.length; x++){
          if(borderTerritories[x].troopcount < bestOptionCount){
            bestOption = borderTerritories[x];
            bestOptionCount = mapdata[borderTerritories[x]].troopcount;
          }
          /*possibleMoves = [];
          workingVariable = [];

          for(let i = 0; i < moveslength; i++){ // Gather up the possible moves
            workingVariable = parent.moves[i].split(" ");
            if(workingVariable[0] === borderTerritories[x]){
              possibleMoves.push(workingVariable[1]);
            } else if(workingVariable[1] === borderTerritories[x]){
              possibleMoves.push(workingVariable[0]);
            }
        }
          for(let i = 0; i < possibleMoves.length; i++){ // Find which enemy is the strongest
            if(mapdata[possibleMoves[i]].troopcount > bestOptionCount && mapdata[possibleMoves[i]].player !== parent.id){
              bestOption = possibleMoves[i];
              bestOptionCount = mapdata[possibleMoves[i]].troopcount;
            }
          }*/
        }

        game.supplydrop(bestOption, randomnumber(0, 999999), parent.roomid, parent.id);
      }

    }, randomnumber(625, 820));
  }

  initiateDeployAI() {
    let parent = this;
    let boostedTerritories = game.getBoostedTerritories(parent.roomid);
    let deployiterations = 0;
    let iterationsneeded = randomnumber(1, 5); //iterations until bot can deploy troops
    let hasdeployedtroops = false; //has deployed troops initially
    let targetterritory;

    this.deploytimer = setInterval(function() {
      if(deployiterations >= iterationsneeded) {
        let mapdata = game.getMapState(parent.roomid);
        if(mapdata === "no room") clearTimeout(parent.deploytimer);
        
        //deploy ai code
        let availableterritories = [];
        Object.keys(mapdata).forEach((key) => {
          if(mapdata[key].player == null && !boostedTerritories.includes(key)) {
              availableterritories.push(mapdata[key]);
          }
        });

        //determine where to deploy
        if(!hasdeployedtroops) {
          targetterritory = availableterritories[Math.floor(Math.random()*availableterritories.length)];
          hasdeployedtroops = true;
        } else {
          if(randomnumber(1, 5) <= 3) { // 3/5 chance of doing the change territory algorithm
            //get neighboring territories

            let pm_length = parent.moves.length;
            for(let i=0; i<pm_length; i++) {
              if(parent.moves[i].includes(targetterritory.territory)) {
                let dest = parent.moves[i].split(" ").filter(function(item) {
                    return item !== targetterritory.territory;
                });
                //if the bot is next to another player, move somewhere else
                if(mapdata[dest]) {
                  if(mapdata[dest].player != null && mapdata[dest].player != parent.id) {
                    let at_length = availableterritories.length;
                    let new_territories = [];
                    for(let i=0; i<at_length; i++) {
                      if(availableterritories[i].territory !== targetterritory.territory) {
                        new_territories.push(availableterritories[i]);
                      }
                    }
                    //choose a territory from the available ones (besides the current one)
                    targetterritory = new_territories[Math.floor(Math.random()*new_territories.length)];
                  }
                }
              }
            }
          }
        }

        game.deployTroops(parent.roomid, parent.id, targetterritory.territory);
      }

      deployiterations++;
    }, randomnumber(900, 1500));
  }

  endDeployAI() {
    clearInterval(this.deploytimer);
  }
}

module.exports = emblitzBot;
