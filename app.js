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
//const mysql = require("mysql");
const credentials = require("./auth.json");
//const auth = require("./scripts/auth.js");
const gamehandler = require("./scripts/game.js");
const emitter = require("events").EventEmitter;
const compression = require("compression");

//-- configs --
const authsecret = "average-balls-enjoyer-69";
var port = credentials.serverport;

//GAME VERSION
const gameversion = "Alpha 1.1.0 | 6/23/2022";

//mapname, maxplayers
const allmaps = {"miniworld": 3, "michigan": 6};
//-- end configs --

//-- version --
console.log("Using game version " + gameversion);
//-- end version --

//-- player colors --
const playercoloroptions = ["red", "orange", "yellow", "green", "blue", "purple"];
//-- end player colors --

var hostname = credentials.hostname + ":" + port;
if(credentials.production === "yes") {
    hostname = credentials.hostname;
    if(process.env.PORT) {
        port = process.env.PORT;
    }
}

const game = new gamehandler();
const gameevents = gamehandler.gameevents;


//database -- make it later
//edit this in auth.json
/*
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
*/

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

function requireHTTPS(req, res, next) {
    //for Heroku only
    if (!req.secure && req.get('x-forwarded-proto') !== 'https' && credentials.production === "yes") {
      return res.redirect('https://' + req.get('host') + req.url);
    }
    next();
}

app.set("view engine", "html");
app.engine("html", require("ejs").renderFile);
app.set("views", path.join(__dirname, "./public"));
app.disable("x-powered-by");
app.use(requireHTTPS);
app.use(compression());

//enable req.body to be used
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(cookieParser());

app.get("/", (req, res) => {
    let gettoken = req.cookies.auth;

    //for now, create a new game id (GID) every time a page loads for security
    //this way, leaking the game id won't compromise a player's "account"
    //replacement for user registration FOR NOW
    let chars = "1234567890qwertyuiopasdfghjklzxcvbnm";
    let id = "";
    for(let i=0; i<30; i++) {
        id += chars.charAt(randomnumber(0, chars.length));
    }
    res.cookie("GID", id);

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
                //console.log(decoded);
            }
        });
    }

    res.render("index", {
        host_name: hostname,
        prod: credentials.production,
        gameversion: gameversion
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

app.get("/tutorial", (req, res) => {
    res.render("tutorial")
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
            fs.readFile("./mapdata/" + roommap + "/" + roommap + ".txt", "utf8", function(err, data) {
                fs.readFile("./mapdata/" + roommap + "/mapdict.json", "utf8", function(err, mapdict) {
                    fs.readFile("./mapdata/" + roommap + "/moves.json", "utf8", function(err, moves) {
                        fs.readFile("./mapdata/" + roommap + "/coordadjust.json", "utf8", function(err, coordadjust) {
                            fs.readFile("./mapdata/" + roommap + "/metadata.json", "utf8", function(err, metadata) {
                                res.json({"mapdata": data, "mapdict": mapdict, "moves": moves, "coordadjust": coordadjust, "metadata": metadata});
                            });
                        });
                    });
                });
            });
        } else if(req.body.action === "joingame") {
            //did player request for specific room?
            if(req.body.preset) {
                //does room exist?
                let preset = req.body.preset;
                let roomfound = false;
                for(let i=0; i<rooms.length; i++) {
                    if(rooms[i].id === preset) {
                        //is room full?
                        if(rooms[i]["players"] >= rooms[i]["maxplayers"]) {
                            res.json({"error": "room " + preset + " is full"});
                        } else {
                            res.json({"uid": userid(), "room": preset});
                        }
                        roomfound = true;
                        break;
                    }
                }
                if(!roomfound) {
                    res.json({"error": "room " + preset + " does not exist"});
                }
            } else {
                res.json({"uid": userid(), "room": joinroom(req.body.prefermap, req.body.createnewroom)});
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

function joinroom(map, createroom) {
    let roommap = "";
    let allmapnames = Object.keys(allmaps);
    let randommap = false;
    if(map !== "random" && allmapnames.includes(map)) {
        roommap = map;
    } else {
        roommap = allmapnames[Math.floor(Math.random()*allmapnames.length)];
        randommap = true;
    }

    let maxplayers = allmaps[roommap];
    let deploytime = 10;

    let isprivate = false;
    if(createroom) {
        isprivate = true;
    }

    if(rooms.length < 1 || createroom) {
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
        
        rooms.push({"id": id, "isprivate": isprivate, "ingame": false, "map": roommap, "created": Math.floor(new Date().getTime()), "deploytime": deploytime, "maxplayers": maxplayers, "players": 0, "playersconfirmed": [], "playersready": 0, "playerslist": []});
        game.newGame(id, roommap, deploytime).then(function(result) {
            //console.log(result)
        });
        return id;
    } else {
        for(let i=0; i<rooms.length; i++) {
            //remove rooms with 0 users that persist longer than 30 seconds -- futureproof, also see line 380ish
            if(rooms[i]["players"] < 1) {
                if((Math.floor(new Date().getTime()) - rooms[i]["created"]) > 30000) {
                    game.removeGame(rooms[i].id);
                    rooms.splice(i, 1);
                }
            }

            //join room if available (and NOT in active game)
            if(rooms[i]["players"] < rooms[i]["maxplayers"] && rooms[i]["ingame"] == false && rooms[i]["isprivate"] == false) {
                if(randommap) {
                    return rooms[i]["id"];
                } else if(rooms[i]["map"] === roommap) {
                    return rooms[i]["id"];
                }
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

        rooms.push({"id": id, "isprivate": isprivate, "ingame": false, "map": roommap, "created": Math.floor(new Date().getTime()), "maxplayers": maxplayers, "players": 0, "playersconfirmed": [], "playersready": 0, "playerslist": []});
        game.newGame(id, roommap, deploytime).then(function(result) {
            //console.log(result)
        });
        return id;
    }
}

httpserver.listen(port, function() {
    console.log("Server started on port " + port);
});

/* test:
setTimeout(function() {
    [...clients.keys()].forEach((client) => {
        client.send(JSON.stringify({"fard": "success"}));
    });
}, 10000);
*/

//send json message to all members in a room w/o request
function sendRoomMsg(roomid, message) {
    [...clients.keys()].forEach((client) => {
        let clientdata = clients.get(client);
        if(clientdata["room"] === roomid) {
            client.send(JSON.stringify(message));
        }
    });
}

gameevents.on("updateMap", function(result) {
    sendRoomMsg(result[0], {"updatemap": result[1]});
});

gameevents.on("startAttackPhase", function(result) {
    sendRoomMsg(result[0], {"startAttackPhase": "ok"});
    game.addTroopsPassively(result[0])
});

gameevents.on("startDeployPhase", function(result) {
    sendRoomMsg(result[0], {"startgame": true, "deploytime": result[1]/1000});
    let roomcount = rooms.length;
    for(let i=0; i<roomcount; i++) {
        if(rooms[i].id === result[0]) {
            rooms[i]["ingame"] = true;
            break;
        }
    }
});

gameevents.on("syncTroopTimer", function(result) {
    sendRoomMsg(result[0], {"syncTroopTimer": result[1]});
});

gameevents.on("updateLobbyTimer", function(result) {
    setTimeout(function() {
        sendRoomMsg(result[0], {"lobbytimer": Math.round(result[1]/1000)-1});
    }, 1000);
});

gameevents.on("playerdead", function(result) {
    sendRoomMsg(result[0], {"playerdead": result[1], "place": result[2]});
});

gameevents.on("playerWon", function(result) {
    sendRoomMsg(result[0], {"playerWon": result[1]});
});

//passively send messages to all users in room w/o request
//format: sendRoomMsg("room69", {"bobux": "momento"});

wss.on("connection", (ws) => {
    //passively send message to single player w/o request
    ws.send(JSON.stringify({"connection": "success"}));

    //send json message to all members in a room w/o request
    function sendRoomMsg(roomid, message) {
        [...clients.keys()].forEach((client) => {
            let clientdata = clients.get(client);
            if(clientdata["room"] === roomid) {
                //do everything in here
                client.send(JSON.stringify(message));
            }
        });
    }

    //passively send messages to all users in room w/o request
    //format: sendRoomMsg("room69", {"bobux": "momento"});

    ws.on("message", (response) => {
        //RESPONDS TO A SINGULAR PLAYER REQUEST
        let message = response.toString();
        let action = JSON.parse(message).action;

        //auth
        if(action !== "userlogin") {
            if(clients.get(ws).gid !== JSON.parse(message).gid || clients.get(ws).uid !== JSON.parse(message).uid) {
                ws.send(JSON.stringify({"error": "invalid credentials"}));
                return;
            }
        }

        if(action === "userlogin") {
            let userinfo = JSON.parse(message);
            let uid = escapeHTML(userinfo.uid);
            let room = escapeHTML(userinfo.roomid);
            let gid = userinfo.gid;

            //is room full? as a double check measure
            //first add the player to the total room count though before checking
            let totalroomcount = rooms.length;
            for(let i=0; i<totalroomcount; i++) {
                if(rooms[i].id === room) {
                    rooms[i]["players"]++;
                    if(rooms[i]["players"] > 1) {
                        if(game.queryGameStatus(rooms[i]["id"]) === "lobby") {
                            game.resumeLobbyTimer(rooms[i]["id"]);
                        }
                    }
                    break;
                }
            }
            let roomplayercount = rooms.filter(function(item) {
                return item.id === room;
            });
            roomplayercount = roomplayercount[0];
            let maxroomplayers = roomplayercount.maxplayers;
            roomplayercount = roomplayercount.players;
            if(roomplayercount > maxroomplayers) {
                ws.send(JSON.stringify({"error": "roomfull"}));
            }

            let pname = escapeHTML(userinfo.pname).substring(0, 18);
            let pcolor = escapeHTML(userinfo.pcolor);
            //player name not set, assign a random one
            if(pname === "") {
                pname = genPname();
            }

            //no player color set? assign red
            if(pcolor === "") {
                pcolor = "red";
            }

            //give players their preferred color; if taken, assign a different random color
            for(let i=0; i < rooms.length; i++) {
                if (rooms[i].id === room) {
                    let takencolors = [];
                    let availablecolors = playercoloroptions;
                    let playerliststring = rooms[i]["playerslist"];
                    for(let i=0; i<playerliststring.length; i++) {
                        takencolors.push(playerliststring[i]["pcolor"]);
                    }
                    
                    if(takencolors.includes(pcolor)) {
                        for(let i=0; i<takencolors.length; i++) {
                            availablecolors = availablecolors.filter(function(item) {
                                return item !== takencolors[i];
                            });
                        }
                        pcolor = availablecolors[(Math.random() * availablecolors.length) | 0];
                    }
                    break;
                }
            }
            
            var metadata = {uid, room, pname, pcolor, gid};
            clients.set(ws, metadata);

            ws.send(JSON.stringify({"setcolor": pcolor}));

            //add pname to room list
            let tclient = clients.get(ws);
            for (var i=0; i < rooms.length; i++) {
                if (rooms[i].id === tclient.room) {
                    rooms[i]["playerslist"].push({"id": uid, "name": pname, "pcolor": pcolor});
                    game.addPlayer(tclient.room, uid).then(function(result) {
                        //console.log(result);
                    })
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

                    if(rooms[i]["playersconfirmed"].length == rooms[i]["players"] && rooms[i]["players"] > 1) {
                        game.skipLobbyTimer(rooms[i].id);
                    }
                    break;
                }
            }
        /* NOTE: also leave EVERY player move handler down here since message sending is done separately.
           This is to stop a new event emitter from being created for every player */
        } else if(action === "deploy") {
            //see game.js, deployTroops
            game.deployTroops(JSON.parse(message).roomid, JSON.parse(message).uid, JSON.parse(message).target);
        } else if(action === "attack") {
            game.attackTerritory(JSON.parse(message).roomid, JSON.parse(message).uid, JSON.parse(message).start, JSON.parse(message).target, JSON.parse(message).trooppercent);
        }
    
        //EVERYTHING BELOW HERE WILL BE SENT TO ALL MEMBERS OF A ROOM
        [...clients.keys()].forEach((client) => {
            let clientdata = clients.get(client);

            if(clientdata["room"] === JSON.parse(message).roomid) {
                //to simplify things a little
                function sendmsg(message) {
                    client.send(JSON.stringify(message));
                }

                //begin possible inbound commands
                if(action === "mapready") {
                    sendmsg({"usersready": rooms[i]["playersready"]});
                    //console.log(rooms[i]["playersready"] + " / " + rooms[i]["players"])
                    if(rooms[i]["playersready"] == rooms[i]["players"]) {
                        sendmsg({"message": "all users loaded"});
                        sendmsg({"users": rooms[i]["playerslist"], "playersconfirmed": rooms[i]["playersconfirmed"]});
                    }
                } else if(action === "userlogin") {
                    sendmsg({"users": rooms[i]["playerslist"], "playersconfirmed": rooms[i]["playersconfirmed"], "isprivateroom": rooms[i]["isprivate"]});
                } else if(action === "userconfirm") {
                    sendmsg({"confirmedusers": rooms[i]["playersconfirmed"]});
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
                if(rooms[i]["players"] < 2) {
                    if(game.queryGameStatus(rooms[i]["id"]) === "lobby") {
                        game.pauseLobbyTimer(rooms[i]["id"]);
                    }
                }
                if(rooms[i].ingame) {
                    rooms[i]["playersready"]--;
                }

                //splice client id as well
                if(rooms[i]["players"] < 1) {
                    game.removeGame(rooms[i].id);
                    rooms.splice(i, 1);
                }
                break;
            }
        }
        clients.delete(ws);
  
        game.removePlayer(removeclient.room, removeclientid)
        gameevents.once("removePlayer" + removeclient.room, function(result) {
            //console.log(result);
        });

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