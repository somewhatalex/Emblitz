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
        parent.initiateAttackAI();
      }
    });
  }

  initiateAttackAI() {
    let parent = this;
    let territoriesOwned = [];

    let moveslength = this.moves.length;

    let ownedTerritories = [];
      let mapdata = game.getMapState(parent.roomid);
      let path = [];
      let possibleMoves = [];
      let isBorder = false;
      let bestOption = '';
      let bestOptionCount = 0;
      let workingVariable = '';
      if(mapdata === "no room") clearTimeout(parent.attacktimer);

    this.attacktimer = setInterval(function() {
      ownedTerritories = [];
      mapdata = game.getMapState(parent.roomid);
      path = [];
      possibleMoves = [];
      isBorder = false;
      bestOption = '';
      bestOptionCount = 0;
      workingVariable = '';
      if(mapdata === "no room") clearTimeout(parent.attacktimer);
      
      //wyatt write your attack ai here
      Object.keys(mapdata).forEach((key) => {
        if(mapdata[key].player == parent.id){
          ownedTerritories.push(mapdata[key].territory);
        }
      });
      
      path.push(ownedTerritories[randomnumber(0, (ownedTerritories.length - 1))]); // Select a random territory owned to start at
      for(let i = 0; i < moveslength; i++){ // Gather up the possible moves
          workingVariable = parent.moves[i].split(" ");
          if(workingVariable[0] == path[0]){
            possibleMoves.push(workingVariable[1]);
            if(mapdata[workingVariable[1]].player != parent.id){ //Check for forign move potential to see if it is a border territory
              isBorder = true;
            }
          }
      }
      if(isBorder){
        bestOptionCount = Infinity;
        for(let i = 0; i < possibleMoves.length; i++){ // Find which enemy is the weakest
          if(mapdata[possibleMoves[i]].troopcount < bestOptionCount){
            bestOption = possibleMoves[i];
            bestOptionCount = mapdata[possibleMoves[i]].troopcount;
          }
        }
        let troopaddamount = (bestOptionCount * 0.1) + 1;
          if(troopaddamount > 5) {
            troopaddamount = 5;
          } 
          bestOptionCount = (bestOptionCount + troopaddamount) * 1.2;

          if(mapdata[path[0]].troopcount > bestOptionCount){
            game.attackTerritory(parent.roomid, parent.id, path[0], bestOption, 100); // 100 is temporary, am tired
          }
      }else{
        for(let i = 0; i < possibleMoves.length; i++){
          if(mapdata[possibleMoves[i]].troopcount > bestOptionCount){
            bestOption = possibleMoves[i];
            bestOptionCount = mapdata[possibleMoves[i]].length;
          }
        }
        game.attackTerritory(parent.roomid, parent.id, workingVariable[0], bestOption, 95); // 95 is temporary, am tired
      }
    }, randomnumber(900, 1100));
  }

  initiateDeployAI() {
    let parent = this;
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
          if(mapdata[key].player == null) {
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
