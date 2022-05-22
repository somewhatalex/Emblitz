const express = require("express");
const app = express();
const port = 6969;
const host = "0.0.0.0";
const WebSocket = require("ws");
const wss = new WebSocket.Server({port: 3069});
const fs = require("fs");
const bodyParser = require("body-parser");

const clients = new Map();
const rooms = [];

function escapestring(str) {
    return (str + '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
}

function randomnumber(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

//enable req.body to be used
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

app.get("/", (req, res) => {
    res.sendFile("./public/index.html", {root: __dirname});
});

app.listen(port, host, () => {
    console.log("Server started at port " + port + ".")
});

app.get("/api", (req, res) => {
    res.json({"error": "invalid form body"});
});

app.post("/api", (req, res) => {
    try {
        if(req.body.action === "getmap") {
            fs.readFile("./mapdata/world.txt", "utf8", function(err, data) {
                res.json({"mapdata": data});
            });
        } else if(req.body.action === "joingame") {
            res.json({"uid": userid(), "room": joinroom()})
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

//auth
function userid() {
    let chars = "1234567890qwertyuiopasdfghjklzxcvbnm";
    let id = "u-";
    for(let i=0; i<20; i++) {
        id += chars.charAt(randomnumber(0, chars.length));
        if(i % 5 == 0) {
            id += "-"
        }
    }
    return id;
}

//if no username is specified, generate a random username
function genPname() {
    return "Player " + randomnumber(1, 999);
    //TODO: check and prevent duplicate names
}

function joinroom() {
    if(rooms.length < 1) {
        let chars = "1234567890qwertyuiopasdfghjklzxcvbnm";
        let id = "r-";
        for(let i=1; i<10; i++) {
            id += chars.charAt(randomnumber(0, chars.length));
            if(i % 5 == 0) {
                id += "-"
            }
        }
        rooms.push({"id": id, "players": 1, "playersready": 0, "playerslist": []});
        return id;
    } else {
        for(let i=0; i<rooms.length; i++) {
            if(rooms[i]["players"] < 1) {
                rooms.splice(i, 1);
            }
            if(rooms[i]["players"] < 6) {
                rooms[i]["players"]++;
                return rooms[i]["id"];
            }
        }

        let chars = "1234567890qwertyuiopasdfghjklzxcvbnm";
        let id = "r-";
        for(let i=1; i<10; i++) {
            id += chars.charAt(randomnumber(0, chars.length));
            if(i % 5 == 0) {
                id += "-"
            }
        }
        rooms.push({"id": id, "players": 1, "playersready": 0, "playerslist": []});
        return id;
    }
}

wss.on("connection", (ws) => {
    ws.on("message", (response) => {
        //RESPONDS TO A SINGULAR PLAYER REQUEST
        let message = response.toString();
        let action = JSON.parse(message).action;
        if(action === "userlogin") {
            let userinfo = JSON.parse(message);
            let uid = userinfo.uid;
            let room = userinfo.roomid;
            let pname = userinfo.pname;
            //player name not set, assign a random one
            if(pname === "") {
                pname = genPname();
            }
            var metadata = {uid, room, pname};
            clients.set(ws, metadata);

            //add pname to room list
            let tclient = clients.get(ws);
            for (var i=0; i < rooms.length; i++) {
                if (rooms[i].id === tclient.room) {
                    rooms[i]["playerslist"].push(pname);
                    break;
                }
            }
        } else if (action === "mapready") {
            let tclient = clients.get(ws);
            for (var i=0; i < rooms.length; i++) {
                if (rooms[i].id === tclient.room) {
                    rooms[i]["playersready"]++;
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
                } if(action === "userlogin") {
                    sendmsg({"users": rooms[i]["playerslist"]});
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
        let removeclientname = removeclient.pname;
        for (var i=0; i < rooms.length; i++) {
            if (rooms[i].id === removeclient.room) {
                rooms[i]["players"]--;
                rooms[i]["playersready"]--;
                if(rooms[i]["players"] < 1) {
                    rooms.splice(i, 1);
                }
                break;
            }
        }
        clients.delete(ws);

        //EVERYTHING BELOW HERE WILL BE SENT TO ALL MEMBERS OF A ROOM
        [...clients.keys()].forEach((client) => {
            let clientdata = clients.get(client);

            if(clientdata["room"] === removeclient.room) {
                //to simplify things a little
                function sendmsg(message) {
                    client.send(JSON.stringify(message));
                }

                rooms[i]["playerslist"] = rooms[i]["playerslist"].filter(function(item) {
                    return item !== removeclientname;
                })

                sendmsg({"playerleft": removeclientname});
            }
        });
    });
});