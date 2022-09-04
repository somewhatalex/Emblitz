const fs = require("fs");
const gamehandler = require("./game.js");
const emitter = require("events").EventEmitter;

const game = new gamehandler();
const gameevents = gamehandler.gameevents;

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
    this.attacktimer = setInterval(function() {
      let mapdata = game.getMapState(parent.roomid);
      
      //wyatt write your attack ai here

    }, randomnumber(900, 1100));
  }

  initiateDeployAI() {
    let parent = this;
    this.deploytimer = setInterval(function() {
      let mapdata = game.getMapState(parent.roomid);
      
      //wyatt write your deploy ai here

    }, randomnumber(900, 1100));
  }

  endDeployAI() {
    clearInterval(this.deploytimer);
  }
}

module.exports = emblitzBot;