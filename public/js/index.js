let roomid = "";
let uid = "";
let pnames = [];

function initializeMap() {
    var mapelements = document.getElementsByClassName("map-region");
    for(let i=0; i<mapelements.length; i++) {
        mapelements[i].setAttribute("fill", "#ffe2bf");
        mapelements[i].style.cursor = "pointer";
        mapelements[i].addEventListener("mouseover", function(d) {
            let countryCode = mapelements[i].getAttribute("data-code");
            console.log(countryCode);
            mapelements[i].setAttribute("fill", "#ffc580");
            let area = d.currentTarget;
            area.style.stroke = "#ffffff";
            area.style.strokeWidth = "5px";
            area.style.strokeLinejoin = "round";
        });
        mapelements[i].addEventListener("mouseleave", function(d) {
            mapelements[i].setAttribute("fill", "#ffe2bf");
            let area = d.currentTarget;
            area.style.stroke = "none";
        });
    }
}

async function connectToServer() {
    const ws = new WebSocket("ws://" + hostname + "/ws");
    return new Promise((resolve, reject) => {
        const timer = setInterval(() => {
            if(ws.readyState === 1) {
                clearInterval(timer);
                console.log("[Outbound] ==> Established connection with server.")
                resolve(ws);
            }
        }, 10);
    });
}

function downloadMap() {
    return new Promise((resolve, reject) => {
        fetch("/api", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({action: "getmap"})}).then(response => {
            response.json().then(function(text) {
                makemap(text.mapdata);
                resolve("ok");
            });
        });
    });
}

function joinGame() {
    return new Promise((resolve, reject) => {
        fetch("/api", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({action: "joingame"})}).then(response => {
            response.json().then(function(text) {
                roomid = text.room;
                uid = text.uid;
                resolve("ok");
            });
        });
    });
}

function gameConnect(name) {
    document.getElementById("lobbyscreen").style.display = "none";
    document.getElementById("gamescreen").style.display = "block";
    joinGame().then(function() {
        connectToServer().then(function(ws) {
            ws.send(JSON.stringify({"action": "userlogin", "uid": uid, "roomid": roomid, "pname": name}));

            downloadMap().then(function() {
                ws.send(JSON.stringify({"action": "mapready", "roomid": roomid, "uid": uid}));
            });

            ws.onmessage = (message) => {
                let response = JSON.parse(message.data);
                if(response.mapdata) {
                    
                }

                if(response.users) {
                    document.getElementById("players_container").innerHTML = "";
                    for(let i=0; i<response.users.length; i++) {
                        document.getElementById("players_container").innerHTML += `
                        <DIV CLASS="lb_player">
                            <DIV CLASS="lb_avatar-frame"></DIV>
                            <DIV CLASS="lb_p_info"><DIV ID="p_name" CLASS="lb_p_name">` + response.users[i] + `</DIV></DIV>
                        </DIV>`;
                    }
                    pnames = response.users;
                } else if(response.playerleft) {
                    for(let i=0; i<document.getElementsByClassName("lb_player").length; i++) {
                        let p_displayed = document.getElementsByClassName("lb_player")[i];
                        if(p_displayed.getElementsByClassName("lb_p_name")[0].innerText === response.playerleft) {
                            p_displayed.remove();
                        }
                    }
                }
            }
        });
    });
}