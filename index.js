const express = require("express");
const app = express();
const port = 6969;
const WebSocket = require("ws");
const wss = new WebSocket.Server({port: 3069});
const fs = require("fs");

const clients = new Map();

function escapestring(str) {
    return (str + '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
}

function randomnumber(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

app.get("/", (req, res) => {
    res.sendFile("./public/index.html", {root: __dirname});
});

app.listen(port, () => {
    console.log("Server started at port " + port + ".")
});

app.post("/", (req, res) => {
    try {
        if(req.body.action === "getmap") {
            res.json({"mapsvg": readFile("./mapdata/world.txt")});
            res.end();
        }
    } catch(e) {
        console.log(e);
    }
});

app.use(express.static(__dirname + "/public"));

//auth
function userid() {
    let chars = "1234567890qwertyuiopasdfghjklzxcvbnm";
    let id = "average-balls-enjoyer-69-";
    for(let i=0; i<20; i++) {
        id += chars.charAt(randomnumber(0, chars.length));
        if(i % 5 == 0) {
            id += "-"
        }
    }
    return id;
}

wss.on("connection", (ws) => {
    var id = userid();
    var metadata = { id };

    clients.set(ws, metadata);

    ws.on("message", (response) => {
        let message = response.toString();
        [...clients.keys()].forEach((client) => {
            if(message === "userlogin") {
                client.send(id);
            } else if (message === "downloadmap") {
                client.send("map: use rest api");
            } else {
                client.send("invalid command")
            }
        });
    });

    ws.on("close", () => {
        clients.delete(ws);
    });
});

function readFile(filepath) {
    try {
        fs.readFile(filepath, "utf8", function(err, data) {
            return data;
        });
    } catch {
        win.webContents.send("readFile", null);
    }
}