const express = require("express");
const app = express();
const httpserver = require("http").createServer();
const WebSocket = require("ws");
const wss = new WebSocket.Server({server: httpserver, path: "/ws"});
const fs = require("fs");
const bodyParser = require("body-parser");
const path = require("path");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const mysql = require("mysql");
const credentials = require("./auth.json");
const auth = require("./scripts/auth.js");
const gamehandler = require("./scripts/game.js");
const emitter = require("events").EventEmitter;

//-- configs --
const authsecret = "average-balls-enjoyer-69";
const port = 6969;
//-- end configs --

const hostname = credentials.hostname + ":" + port;
const game = new gamehandler();
const gameevents = gamehandler.gameevents;

//edit this in auth.json
const db = mysql.createConnection({
    host: credentials.host,
    user: credentials.user,
    password: credentials.password,
    port: credentials.port,
    database: credentials.database
});

db.connect(function(err) {
    if (err) throw err; //literally just give up by this point

    //export db configs
    module.exports.db = db;

    console.log("Connected to database!");
    auth.getUserInfo("bobux");


});

const clients = new Map();
const rooms = [];
var userids = [];

function escapestring(str) {
    return (str + '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
}

function escapeHTML(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
 }

function randomnumber(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function removeFromArray(arr, item) {
    for (var i = arr.length; i--;) {
      if (arr[i] === item) arr.splice(i, 1);
    }
 }

app.set("view engine", "html");
app.engine("html", require("ejs").renderFile);
app.set("views", path.join(__dirname, "./public"));
app.disable("x-powered-by");

//enable req.body to be used
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(cookieParser());

app.get("/", (req, res) => {
    let gettoken = req.cookies.auth;

    //-- USER AUTH (work in progress) --
    //does user have a token?

    //TODO: ADD USER REGISTRATION
    let u_info = [{user: "bobux"}]; //user info
    let userid = "69420666"; //user id
    let issuer = "bobux man" //issuer of token
    if(!gettoken) {
        //no token found... generate one
        let token = jwt.sign({
            data: u_info,
            sub: userid,
            iss: issuer
        }, authsecret);

        res.cookie("auth", token);
    } else {
        jwt.verify(gettoken, authsecret, function(err, decoded) {
            //invalid token, generate new one
            if(err || decoded.iss != issuer) {
                let token = jwt.sign({
                    data: u_info,
                    sub: userid,
                    iss: issuer
                }, authsecret);

                res.cookie("auth", token);
            } else {
                //do something with a valid token
                console.log(decoded);
            }
        });
    }

    res.render("index", {
        host_name: hostname
    });
});

httpserver.on("request", app);

app.get("/api", (req, res) => {
    res.json({"error": "invalid form body"});
});

app.get("/login", (req, res) => {
    res.render("login", {
        host_name: hostname
    });
});

//id = roomid
function getroommap(id) {
    for(let i=0; i<rooms.length; i++) {
        if(rooms[i].id === id) {
            return rooms[i].map.toString();
        }
    }
}


app.post("/api", (req, res) => {
    try {
        if(req.body.action === "getmap") {
            var roommap = getroommap(req.body.roomid);
            fs.readFile("./mapdata/" + roommap + "/miniworld.txt", "utf8", function(err, data) {
                fs.readFile("./mapdata/" + roommap + "/mapdict.json", "utf8", function(err, mapdict) {
                    fs.readFile("./mapdata/" + roommap + "/moves.json", "utf8", function(err, moves) {
                        res.json({"mapdata": data, "mapdict": mapdict, "moves": moves});
                    });
                });
            });
        } else if(req.body.action === "joingame") {
            //did player request for specific room?
            if(req.body.preset) {
                //does room exist?
                let preset = req.body.preset;
                for(let i=0; i<rooms.length; i++) {
                    if(rooms[i].id === preset) {
                        //is room full?
                        if(rooms[i]["players"] >= rooms[i]["maxplayers"]) {
                            res.json({"error": "room " + preset + " is full"});
                        } else {
                            rooms[i]["players"]++;
                            res.json({"uid": userid(), "room": preset});
                        }
                        return;
                    } else {
                        res.json({"error": "room " + preset + " does not exist"});
                    }
                }
            } else {
                res.json({"uid": userid(), "room": joinroom()});
            }
        } else if(req.body.action === "login") {
            // -- WORK ON PROGRESS --
            auth.getUserInfo("bobux").then(function(result) {
                res.json({"response": result})
            })
        } else {
            res.json({"error": "invalid form body"});
            res.end();
        }
    } catch(e) {
        console.log(e);
    }
});

app.use(express.static(__dirname + "/public"));

app.use(function(req, res, next) {
    res.status(404);
    res.sendFile("./public/errorpages/404.html", {root: __dirname});
});

//public id generator
function userid() {
    let chars = "1234567890qwertyuiopasdfghjklzxcvbnm";
    let id = "u-";
    for(let i=0; i<20; i++) {
        id += chars.charAt(randomnumber(0, chars.length));
    }
    while(userids.includes(id)) {
        let id = "u-"
        for(let i=0; i<20; i++) {
            id += chars.charAt(randomnumber(0, chars.length));
        }
    }
    userids.push(id);
    return id;
}

//if no username is specified, generate a random username
function genPname() {
    return "Player " + randomnumber(1, 999);
    //TODO: check and prevent duplicate names
}

//returns true if duplicate room ids exist
function checkDupeRoom(id) {
    for(let i=0; i<rooms.length; i++) {
        if(rooms[i].id === id) {
            return true;
        }
    }
}

function joinroom() {
    let roommap = "miniworld";
    let maxplayers = 6;
    if(rooms.length < 1) {
        let chars = "1234567890qwertyuiopasdfghjklzxcvbnm";
        let id = "r-";
        for(let i=1; i<7; i++) {
            id += chars.charAt(randomnumber(0, chars.length));
        }

        while(checkDupeRoom(id)) {
            id = "r-";
            for(let i=1; i<7; i++) {
                id += chars.charAt(randomnumber(0, chars.length));
            }
        }
        
        rooms.push({"id": id, "ingame": false, "map": roommap, "maxplayers": maxplayers, "players": 1, "playersconfirmed": [], "playersready": 0, "playerslist": []});
        game.newGame(id, roommap).then(function(result) {
            console.log(result)
        });
        return id;
    } else {
        for(let i=0; i<rooms.length; i++) {
            //remove rooms with 0 users -- futureproof, also see line 375
            if(rooms[i]["players"] < 1) {
                game.removeGame(rooms[i].id);
                rooms.splice(i, 1);
            }

            //join room if available (and NOT in active game)
            if(rooms[i]["players"] < rooms[i]["maxplayers"] && rooms[i]["ingame"] == false) {
                rooms[i]["players"]++;
                return rooms[i]["id"];
            }
        }

        let chars = "1234567890qwertyuiopasdfghjklzxcvbnm";
        let id = "r-";
        for(let i=1; i<7; i++) {
            id += chars.charAt(randomnumber(0, chars.length));
        }

        while(checkDupeRoom(id)) {
            id = "r-";
            for(let i=1; i<7; i++) {
                id += chars.charAt(randomnumber(0, chars.length));
            }
        }

        rooms.push({"id": id, "ingame": false, "map": roommap, "maxplayers": maxplayers, "players": 1, "playersconfirmed": [], "playersready": 0, "playerslist": []});
        game.newGame(id, roommap).then(function(result) {
            console.log(result)
        });
        return id;
    }
}

httpserver.listen(port, function() {
    console.log("Server started on port " + port);
});

wss.on("connection", (ws) => {
    ws.on("message", (response) => {
        //RESPONDS TO A SINGULAR PLAYER REQUEST
        let message = response.toString();
        let action = JSON.parse(message).action;
        if(action === "userlogin") {
            let userinfo = JSON.parse(message);
            let uid = escapeHTML(userinfo.uid);
            let room = escapeHTML(userinfo.roomid);

            //is room full? as a double check measure
            let roomplayercount = rooms.filter(function(item) {
                return item.id !== room;
            });
            let maxroomplayers = roomplayercount.maxplayers;
            roomplayercount = roomplayercount.players;
            if(roomplayercount == maxroomplayers) {
                ws.send(JSON.stringify({"error": "roomfull"}));
            }

            let pname = escapeHTML(userinfo.pname).substring(0, 18);
            let framecolor = escapeHTML(userinfo.framecolor);
            //player name not set, assign a random one
            if(pname === "") {
                pname = genPname();
            }
            var metadata = {uid, room, pname, framecolor};
            clients.set(ws, metadata);

            //add pname to room list
            let tclient = clients.get(ws);
            for (var i=0; i < rooms.length; i++) {
                if (rooms[i].id === tclient.room) {
                    rooms[i]["playerslist"].push({"id": uid, "name": pname, "framecolor": framecolor});
                    break;
                }
            }

            ws.send(JSON.stringify({"mapname": getroommap(tclient.room)}));
        } else if (action === "mapready") {
            let tclient = clients.get(ws);
            for (var i=0; i < rooms.length; i++) {
                if (rooms[i].id === tclient.room) {
                    rooms[i]["playersready"]++;
                    break;
                }
            }
        } else if (action === "userconfirm") {
            let tclient = clients.get(ws);
            for (var i=0; i < rooms.length; i++) {
                if (rooms[i].id === tclient.room) {
                    if(!rooms[i]["playersconfirmed"].includes(JSON.parse(message).uid)) {
                        rooms[i]["playersconfirmed"].push(JSON.parse(message).uid);
                    }
                    break;
                }
            }
        }
    
        //EVERYTHING BELOW HERE WILL BE SENT TO ALL MEMBERS OF A ROOM
        [...clients.keys()].forEach((client) => {
            let clientdata = clients.get(client);

            if(clientdata["room"] === JSON.parse(message).roomid) {
                //to simplify things a little
                function sendmsg(message) {
                    client.send(JSON.stringify(message));
                }

                //begin possible imbound commands
                if(action === "mapready") {
                    sendmsg({"usersready": rooms[i]["playersready"]});
                } else if(action === "userlogin") {
                    sendmsg({"users": rooms[i]["playerslist"], "playersconfirmed": rooms[i]["playersconfirmed"]});
                } else if(action === "userconfirm") {
                    sendmsg({"confirmedusers": rooms[i]["playersconfirmed"]});
                    //once all players have confirmed in lobby...
                    if(rooms[i]["playersconfirmed"].length == rooms[i]["players"] && rooms[i]["players"] > 1) {
                        rooms[i]["ingame"] = true;
                        sendmsg({"startgame": true});
                    }
                } else {
                    if(action !== "mapready") { //idk why this works, but it just does
                        sendmsg({"error": "invalid command", "root": action});
                    }
                }
            }
        });
    });

    ws.on("close", () => {
        let removeclient = clients.get(ws);
        let removeclientid = removeclient.uid;
        removeFromArray(userids, removeclientid);
        for (var i=0; i < rooms.length; i++) {
            if (rooms[i].id === removeclient.room) {
                rooms[i]["players"]--;
                rooms[i]["playersready"]--;
                //splice client id as well
                if(rooms[i]["players"] < 1) {
                    game.removeGame(rooms[i].id);
                    rooms.splice(i, 1);
                }
                break;
            }
        }
        clients.delete(ws);

        /*
        game.removePlayer(JSON.parse(message).roomid, "fard")
        gameevents.once("removePlayer" + JSON.parse(message).roomid, function(result) {
            console.log(result);
        });
        */

        //EVERYTHING BELOW HERE WILL BE SENT TO ALL MEMBERS OF A ROOM
        [...clients.keys()].forEach((client) => {
            let clientdata = clients.get(client);

            if(clientdata["room"] === removeclient.room) {
                //to simplify things a little
                function sendmsg(message) {
                    client.send(JSON.stringify(message));
                }

                rooms[i]["playerslist"] = rooms[i]["playerslist"].filter(function(item) {
                    return item.id !== removeclientid;
                });

                rooms[i]["playersconfirmed"] = rooms[i]["playersconfirmed"].filter(e => e !== removeclientid);

                sendmsg({"playerleft": removeclientid});
            }
        });
    });
});

process.on("uncaughtException", function(error) {
    console.log(error.stack);
});