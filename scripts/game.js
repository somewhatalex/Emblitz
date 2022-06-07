const emitter = require("events").EventEmitter;

function game() {
    var response = new emitter();
    this.newGame = function(roomid, metadata) {
        return new Promise(function(resolve, reject) {
            response.emit("createGame", metadata);
        });
    }
    
    //players can't join once game starts, so remove players only
    this.removePlayer = function(roomid, id) {
        return new Promise(function(resolve, reject) {
            response.emit("removePlayer", id)
        });
    }
}

module.exports = game;