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
    let switchVar = [];
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
      
      //wyatt write your attack ai here
      Object.keys(mapdata).forEach((key) => {
        if(!key.startsWith("plane-"))
          if(mapdata[key].player == parent.id){
            ownedTerritories.push(mapdata[key]);
          }else{
            unownedTerritories.push(mapdata[key]);
          }
      });

      //Find out what territories are borders and put them into borderTerritories array
      Object.keys(ownedTerritories).forEach((key) => {
        for(let i = 0; i < moveslength; i++){
          workingVariable = parent.moves[i].split(" ");
          if(workingVariable[0] == ownedTerritories[key].territory && mapdata[workingVariable[1]].player != parent.id){
            borderTerritories.push(ownedTerritories[key]);
          }else if(workingVariable[1] == ownedTerritories[key].territory){
            switchVar = workingVariable[1];
            workingVariable[1] = workingVariable[0];
            workingVariable[0] = switchVar;
            if(mapdata[workingVariable[1]].player != parent.id){
              borderTerritories.push(ownedTerritories[key]);
            }
          }else{
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
          if(workingVariable[0] == path[0]){
            possibleMoves.push(workingVariable[1]);
          }else if(workingVariable[1] == path[0]){
            switchVar = workingVariable[1];
            workingVariable[1] = workingVariable[0];
            workingVariable[0] = switchVar;
            possibleMoves.push(workingVariable[1]);
          }
      }

      bestOptionCount = Infinity;
      for(let i = 0; i < possibleMoves.length; i++){ // Find which enemy is the weakest
        if((mapdata[possibleMoves[i]].troopcount < bestOptionCount) && (mapdata[possibleMoves[i]].player != parent.id)){
          bestOption = possibleMoves[i];
          bestOptionCount = mapdata[possibleMoves[i]].troopcount;
        }
      }
      /*let troopaddamount = (bestOptionCount * 0.1) + 1;
       if(troopaddamount > 5) {
          troopaddamount = 5;
      } 

      bestOptionCount = (bestOptionCount + troopaddamount) * 1.2;*/

      if(mapdata[path[0]]) {
        if(mapdata[path[0]].troopcount > bestOptionCount){
          game.attackTerritory(parent.roomid, parent.id, path[0], bestOption, 100); // 100 is temporary, am tired
        }
      }

       //Move troops internally
      if(internalTerritories.length > 0){
        path.push(internalTerritories[randomnumber(0, (internalTerritories.length - 1))].territory); // Select a random territory owned to start at
      for(let i = 0; i < moveslength; i++){ // Gather up the possible moves
          workingVariable = parent.moves[i].split(" ");
          if(workingVariable[0] == path[0]){
            possibleMoves.push(workingVariable[1]);
          }else if(workingVariable[1] == path[0]){
            switchVar = workingVariable[1];
              workingVariable[1] = workingVariable[0];
              workingVariable[0] = switchVar;
              possibleMoves.push(workingVariable[1]);
            }
        }

       for(let i = 0; i < possibleMoves.length; i++){
          if(mapdata[possibleMoves[i]].troopcount > bestOptionCount){
            bestOption = possibleMoves[i];
            bestOptionCount = mapdata[possibleMoves[i]].length;
         }
        }
        if(bestOption !== '') {
          game.attackTerritory(parent.roomid, parent.id, workingVariable[0], bestOption, 95); // 95 is temporary, am tired
        }
      }

      //Attempt to use an airlift
      if(internalTerritories.length > 0 && randomnumber(0, 3) == 1 && internalTerritories.length > 0 && internalTerritories[randomnumber(0, internalTerritories.length - 1)]) {
          game.airlift(internalTerritories[randomnumber(0, internalTerritories.length - 1)].territory, unownedTerritories[randomnumber(0, unownedTerritories.length - 1)].territory, randomnumber(0, 999999), parent.roomid, parent.id, 90);
      }

      //Attempt to nuke players
      if(ownedTerritories.length > 0 && randomnumber(0, 5) == 1){
        let targetedTerritory = unownedTerritories[0];

        for(let x = 0; x < unownedTerritories.length; x++){
          if(targetedTerritory.troopcount < unownedTerritories[x].troopcount){
            targetedTerritory = unownedTerritories[x];
          }
        }

        game.nuke(targetedTerritory.territory, parent.roomid, parent.id);
      }

    }, randomnumber(425, 700));
  }

  /*
  initiateAttackAI_B() {
    let parent = this;

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
      } else {
        for(let i = 0; i < possibleMoves.length; i++){
          if(mapdata[possibleMoves[i]].troopcount > bestOptionCount){
            bestOption = possibleMoves[i];
            bestOptionCount = mapdata[possibleMoves[i]].length;
          }
        }
        if(bestOption !== '') {
          game.attackTerritory(parent.roomid, parent.id, workingVariable[0], bestOption, 95); // 95 is temporary, am tired
        }
      }
    }, randomnumber(900, 1100));
  }
  

  initiateAttackAI_C() {
    let parent = this;
    let moveslength = this.moves.length;

    let aggression = 0;
    let prev_OT = 0; //previous owned territories

    this.attacktimer = setInterval(function() {
      let ownedTerritories = [];
      let mapdata = game.getMapState(parent.roomid);
      let path = [];
      let possibleMoves = [];
      let isBorder = false;
      let bestOption = '';
      let bestOptionCount = 0;
      let workingVariable = '';

      let priorityscores = []; //all the priority scores aggregated
      let priorityscore = 0; //priority of territory being considered
      let territoryindex = 0; //index of territory being considered
      let territoryconsidered = ""; //abbr. of territory

      if(mapdata === "no room") clearTimeout(parent.attacktimer);

      prev_OT = ownedTerritories.length;

      //wyatt write your attack ai here
      Object.keys(mapdata).forEach((key) => {
        if(mapdata[key].player == parent.id){
          ownedTerritories.push(mapdata[key].territory);
        }
      });

      if(ownedTerritories.length < prev_OT) {
        aggression += 0.05; //bot was attacked, increase aggression
      }
      
      
      aggression += 0.05; //slightly increase aggression each iteration

      //aggression score: the higher it is, the more willing the bot is
      //to attack other players' territories
      

      //----PRIORITY ALGORITHM----//

      priorityscores = []; //all the priority scores aggregated
      priorityscore = 0; //priority of territory being considered
      territoryindex = 0; //index of territory being considered
      territoryconsidered = ""; //abbr. of territory
      
      for(let i=0; i<ownedTerritories.length; i++) {
        let temp_priority = 0; //temp priority being considered

        //find possible moves from territory
        for(let x = 0; x < moveslength; x++) {
          if(parent.moves[x].includes(ownedTerritories[i])) {
            let otherterritory = parent.moves[x].split(" ").filter(function(item) {
              return item !== ownedTerritories[i];
            });
            var g_targetterritory = otherterritory;
            if(mapdata[otherterritory].player !== parent.id){ //Check for foreign move potential to see if it is a border territory
              isBorder = true;
              temp_priority += 1;
              
              //prefer non-player occupied regions if aggression is low
              if(!mapdata[otherterritory].player && randomnumber(0.5, 25) > aggression) {
                temp_priority += randomnumber(0.9, 2);
              }

              //real player
              if(mapdata[otherterritory].player) {
                let abs_aggression = aggression;
                if(abs_aggression < 0.2) {
                  abs_aggression = 0.2;
                } else if(abs_aggression > 1) {
                  abs_aggression = 1;
                }
                let to_add = ((mapdata[ownedTerritories[i]].troopcount/mapdata[otherterritory].troopcount)/1.2) * abs_aggression + randomnumber(-0.2, 0.2);
                if(to_add > 2) {
                  to_add = 2;
                }

                for(let z = 0; z < moveslength; z++) {
                  if(parent.moves[z].includes(ownedTerritories[i])) {
                    let otherterritory = parent.moves[z].split(" ").filter(function(item) {
                      return item !== ownedTerritories[i];
                    });
                    if(mapdata[otherterritory].player === parent.id){
                      //request for help
                      let pscoreslength = priorityscores.length;
                      for(let p=0; p<pscoreslength; p++) {
                        if(priorityscores[p][0].toString() === otherterritory[0]) {
                          let to_add = ((mapdata[otherterritory].troopcount/mapdata[ownedTerritories[i]].troopcount)/1.6) + ((mapdata[g_targetterritory].troopcount/mapdata[ownedTerritories[i]].troopcount)/1.3) + randomnumber(-0.2, 0.2);
                          if(to_add > 5) {
                            to_add = 5;
                          }

                          priorityscores[p][2] += to_add;
                        }
                      }
                    }
                  }
                }

                temp_priority += to_add;
              }
            } else {
              let to_add = ((mapdata[ownedTerritories[i]].troopcount/mapdata[otherterritory].troopcount)/2) + randomnumber(-0.2, 0.2);
              if(to_add > 1.2) {
                to_add = 1.2;
              }

              temp_priority += to_add;
            }
          }
        }

        //console.log(ownedTerritories[i] + ": " + temp_priority)
        
        priorityscores.push([ownedTerritories[i], i, temp_priority]);
      }

      let pscoreslength = priorityscores.length;
      for(let i=0; i<pscoreslength; i++) {
        if(priorityscores[i][2] > priorityscore) {
          territoryconsidered = ownedTerritories[i];
          territoryindex = i;
          priorityscore = priorityscores[i][2];
        }
      }

      //console.log("highest: " + territoryconsidered + " -- " + priorityscore)

      //----END PRIORITY ALGORITHM----//
      
      path.push(ownedTerritories[territoryindex]); // Select a random territory owned to start at
      for(let i = 0; i < moveslength; i++){ // Gather up the possible moves
        if(parent.moves[i].includes(territoryconsidered)) {
          let dest = parent.moves[i].split(" ").filter(function(item) {
              return item !== territoryconsidered;
          });
          possibleMoves.push(dest);
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
        //let troopaddamount = (bestOptionCount * 0.1) + 1;
        //if(troopaddamount > 5) {
        //  troopaddamount = 5;
        //}
        bestOptionCount = (bestOptionCount + 1) * 1.2;

        let neededtroops_percent = (bestOptionCount/mapdata[path[0]].troopcount) * 100;

        if(mapdata[path[0]].troopcount > bestOptionCount){
          game.attackTerritory(parent.roomid, parent.id, path[0], bestOption, neededtroops_percent + randomnumber(15, 25));
        } else {
          if(randomnumber(1, 4) < aggression) {
            let sendpercent = neededtroops_percent/randomnumber(1.5, 2.5);
            if(sendpercent > 50) {
              sendpercent = 50 - randomnumber(0, 40);
            }
            game.attackTerritory(parent.roomid, parent.id, path[0], bestOption, sendpercent);
          }
        }
      } else {
        for(let i = 0; i < possibleMoves.length; i++){
          if(mapdata[possibleMoves[i]]) {
            if(mapdata[possibleMoves[i]].troopcount > bestOptionCount){
              bestOption = possibleMoves[i];
              bestOptionCount = mapdata[possibleMoves[i]].length;
            }
          }
        }
        if(bestOption !== '') {
          game.attackTerritory(parent.roomid, parent.id, workingVariable[0], bestOption, 50); // 95 is temporary, am tired
        }
      }
    }, randomnumber(900, 1200));
  }
  */

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
          if(mapdata[key].player == null && !boostedTerritories.includes(mapdata[key])) {
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
