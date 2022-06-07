let roomid = "";
let uid = "";
let pnames = [];

var mapdict = "";
var mapmoves = "";
var possibleMoves = [];

var inGame = false;

function getOffset(el) {
    var rect = el.getBoundingClientRect();
    var boundingmap = document.getElementById("mapsvgbox").getBoundingClientRect();
    var zoomlevel = Number(document.getElementById("mapcontainer").style.transform.replace(/\(/g, "").replace(/\)/g, "").replace(/scale/g, ""));
    return {
        left: rect.left/zoomlevel - boundingmap.left/zoomlevel,
        top: rect.top/zoomlevel - boundingmap.top/zoomlevel,
        width: rect.width/(zoomlevel),
        height: rect.height/(zoomlevel)
    };
}


function initializeMap() {
    let isDragging = false;
    var mapelements = document.getElementsByClassName("map-region");
    var selectedRegion = "";
    for(let i=0; i<mapelements.length; i++) {
        mapelements[i].setAttribute("fill", "#ffe2bf");
        mapelements[i].style.stroke = "#171717";
        mapelements[i].style.strokeWidth = "2px";
        mapelements[i].style.strokeLinejoin = "round";
        mapelements[i].style.cursor = "pointer";
        let labelpos = getOffset(mapelements[i]);
        document.getElementById("mapl2").innerHTML += `
        <DIV CLASS="territorylabel" STYLE="top: ${labelpos.top+35}px; left: ${labelpos.left+25}px">
            <DIV CLASS="t_name">${mapdict[mapelements[i].getAttribute("data-code")]}</DIV>
            <DIV CLASS="t_troops" ID="t_origin_${mapelements[i].getAttribute("data-code").toLowerCase().replace(/ /g, "")}"><DIV ID="t_troops" STYLE="margin-top: -7px; font-weight: bold; margin-left: -45px; width: 100px;">1</DIV></DIV>
        </DIV>`

        //show outline
        mapelements[i].addEventListener("mouseover", function(d) {
            let countryCode = mapelements[i].getAttribute("data-code");
            console.log(countryCode);
            mapelements[i].setAttribute("fill", "#ffc580");
            let area = d.currentTarget;
            if(selectedRegion != area) {
                area.style.stroke = "#ffffff";
                area.style.strokeWidth = "5px";
                area.style.strokeLinejoin = "round";
            }
        });
        //hide outline

        mapelements[i].addEventListener("mouseleave", function(d) {
            mapelements[i].setAttribute("fill", "#ffe2bf");
            let area = d.currentTarget;
            if(selectedRegion != area && !possibleMoves.includes(area.getAttribute("data-code"))) {
                mapelements[i].style.stroke = "#171717";
                mapelements[i].style.strokeWidth = "2px";
                mapelements[i].style.strokeLinejoin = "round";
            } else if(possibleMoves.includes(area.getAttribute("data-code") && selectedRegion)) {
                area.style.strokeWidth = "2px";
            } else {
                mapelements[i].style.stroke = "#171717";
                mapelements[i].style.strokeWidth = "2px";
                mapelements[i].style.strokeLinejoin = "round";
            }
        });

        //when clicked...
        mapelements[i].addEventListener("click", function(d) {
            //isDragging --> is the mouse moving? handled by "mousemove" event listener
            if(isDragging == false) {
                possibleMoves = [];
                let currentAttackLines = document.getElementsByClassName("attack-line");
                while(currentAttackLines[0]) {
                    currentAttackLines[0].parentNode.removeChild(currentAttackLines[0])
                }
                for(let i=0; i<mapmoves.length; i++) {
                    if(mapmoves[i].includes(d.currentTarget.getAttribute("data-code"))) {
                        let dest = mapmoves[i].split(" ").filter(function(item) {
                            return item !== d.currentTarget.getAttribute("data-code");
                        });
                        possibleMoves.push(dest.toString());
                    }
                }

                //reset regions
                let allregions = document.getElementsByClassName("map-region");
                for(let i=0; i<allregions.length; i++) {
                    allregions[i].style.stroke = "#171717";
                    allregions[i].style.strokeWidth = "2px";
                    allregions[i].style.strokeLinejoin = "round";
                }

                let territory = d.currentTarget;
                for(let i=0; i<possibleMoves.length; i++) {
                    let d2 = document.getElementById("t_origin_" + d.currentTarget.getAttribute("data-code").toLowerCase());
                    let area = document.getElementById("t_origin_" + possibleMoves[i].toString().toLowerCase())
                    connect(area, d2, "#e69420", 7);
                    let t_targeted = document.querySelector("[data-code='" + possibleMoves[i].toString() + "']");
                    t_targeted.style.stroke = "#ffffff";
                    t_targeted.style.strokeWidth = "2px";
                    t_targeted.style.strokeLinejoin = "round";
                }

                if(selectedRegion != territory) {
                    selectedRegion = territory;
                    territory.style.stroke = "#004ab3";
                    territory.style.strokeWidth = "5px";
                    territory.style.strokeLinejoin = "round";
                    attackTerritory(territory);
                } else {
                    while(currentAttackLines[0]) {
                        currentAttackLines[0].parentNode.removeChild(currentAttackLines[0])
                    }
                    let allregions = document.getElementsByClassName("map-region");
                    for(let i=0; i<allregions.length; i++) {
                        allregions[i].style.stroke = "#171717";
                        allregions[i].style.strokeWidth = "2px";
                        allregions[i].style.strokeLinejoin = "round";
                    }
                    selectedRegion.style.stroke = "#ffffff";
                    selectedRegion.style.strokeWidth = "5px";
                    selectedRegion.style.strokeLinejoin = "round";
                    selectedRegion = "";
                }
            }
        });
    }
    //manage zooming and panning
    let zoomElement = document.getElementById("mapcontainer");
    zoomElement.style.transform = "scale(1)";
    document.addEventListener("wheel", function(e) {
        if(zoomElement.contains(e.target) || e.target === document.getElementById("gamescreen")) {
            if(document.getElementById("player_gui").contains(e.target)) return;
            let elementTransform = Number(zoomElement.style.transform.replace(/\(/g, "").replace(/\)/g, "").replace(/scale/g, ""));
            var zoomdelta = (e.deltaY)/500;
            if(zoomdelta > 0.3) {
                zoomdelta = 0.3;
            } else if (zoomdelta < -0.3) {
                zoomdelta = -0.3;
            }
            if(elementTransform >= 1.7) {
                if(zoomdelta > 0) {
                    zoomdelta = 0;
                }
                zoomElement.style.transform = "scale(1.7)";
            } else if(elementTransform <= 0.5) {
                if(zoomdelta < 0) {
                    zoomdelta = 0;
                }
                zoomElement.style.transform = "scale(0.5)";
            }

            zoomElement.style.transform = `scale(${elementTransform += zoomdelta})`;
        }
    });

    //panning
    var mapElement = document.getElementById("map");
    var isMouseDown = 0;
    mapElement.style.transform = "translate(0px, 0px)";
    document.addEventListener("mousedown", function(e) {
        isMouseDown = 1;
    });
    document.addEventListener("mouseup", function(e) {
        isMouseDown = 0;
        //delay 1ms to prevent immediate cancelation
        if(isDragging == true) {
            setTimeout(function() {
                isDragging = false;
            }, 1)
        }
    });
    document.addEventListener("mousemove", function(e) {
        if(isMouseDown) {
            if(mapElement.contains(e.target) || e.target === document.getElementById("gamescreen")) {
                if(document.getElementById("player_gui").contains(e.target)) return;
                isDragging = true;
                let mapTranslate = mapElement.style.transform.replace(/\(/g, "").replace(/\)/g, "").replace(/translate/g, "").replace(/px/g, "").replace(/ /g, "").split(",");
                let mapZoom = Number(document.getElementById("mapcontainer").style.transform.replace(/\(/g, "").replace(/\)/g, "").replace(/scale/g, ""));

                let deltaX = e.movementX/1.3;
                let deltaY = e.movementY/1.3;

                //must check both x and y coords for scrolling
                if(mapTranslate[0] > 400 && deltaX > 0) {
                    deltaX = 0;
                } else if(mapTranslate[0] < -350 && deltaX < 0) {
                    deltaX = 0;
                }

                if(mapTranslate[1] > 180 && deltaY > 0) {
                    deltaY = 0;
                } else if(mapTranslate[1] < -200 && deltaY < 0) {
                    deltaY = 0;
                }
                if(!mapTranslate[1]) {
                    mapTranslate[1] = 0;
                }
                mapElement.style.transform = `translate(${Number(mapTranslate[0]) + deltaX/mapZoom}px, ${Number(mapTranslate[1]) + deltaY/mapZoom}px)`;
            }
        }
    });
}

function connect(div1, div2, color, thickness) {
    var off1 = getOffset(div1);
    var off2 = getOffset(div2);
    var x1 = off1.left + off1.width+20;
    var y1 = off1.top + off1.height+20;
    var x2 = off2.left + off2.width+20;
    var y2 = off2.top + off2.height+20;
    var length = Math.sqrt(((x2 - x1) * (x2 - x1)) + ((y2 - y1) * (y2 - y1)));
    var cx = ((x1 + x2) / 2) - (length / 2);
    var cy = ((y1 + y2) / 2) - (thickness / 2);
    var angle = Math.atan2((y1 - y2), (x1 - x2)) * (180 / Math.PI);
    var htmlLine = "<div class='attack-line' style='background: linear-gradient(" + angle + "deg, #ffc000 0%, #ff0000 100%); pointer-events: none; z-index: -1; padding:0px; margin:0px; height:" + thickness + "px; background-color:" + color + "; line-height: 1px; position: absolute; left:" + cx + "px; top:" + cy + "px; width:" + length + "px; -moz-transform:rotate(" + angle + "deg); -webkit-transform:rotate(" + angle + "deg); -o-transform:rotate(" + angle + "deg); -ms-transform:rotate(" + angle + "deg); transform:rotate(" + angle + "deg);' />";
    document.getElementById("mapl2").innerHTML += htmlLine;
}

function attackTerritory(area) {

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
        fetch("/api", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({action: "getmap", roomid: roomid})}).then(response => {
            response.json().then(function(text) {
                mapdict = JSON.parse(text.mapdict);
                mapmoves = JSON.parse(text.moves);
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

function confirmJoinGame() {
    return new Promise((resolve, reject) => {
        document.getElementById("startvote").addEventListener("click", function sendvote(d) {
            document.getElementById("startvote").removeEventListener("click", sendvote);
            resolve("ok");
        });
    });
}

function initLB() {
    document.getElementById("players_container").innerHTML = "";
    for(let i=0; i<pnames.length; i++) {
        document.getElementById("players_container").innerHTML += `
        <DIV CLASS="lb_player" ID="l-${pnames[i].id}">
            <DIV CLASS="lb_avatar-frame" STYLE="border: 5px solid ${pnames[i].framecolor}"></DIV>
            <DIV CLASS="lb_p_info"><DIV ID="p_name" CLASS="lb_p_name">${pnames[i].name}</DIV></DIV>
        </DIV>`;
    }
}

function gameConnect(name, framecolor) {
    document.getElementById("lobbyscreen").style.display = "none";
    document.getElementById("gamescreen").style.display = "none";
    document.getElementById("gamelobby").style.display = "block";
    joinGame().then(function() {
        connectToServer().then(function(ws) {
            ws.send(JSON.stringify({"action": "userlogin", "uid": uid, "roomid": roomid, "pname": name, "framecolor": framecolor}));
            confirmJoinGame().then(function() {
                ws.send(JSON.stringify({"action": "userconfirm", "roomid": roomid, "uid": uid}));
            });

            ws.onmessage = (message) => {
                let response = JSON.parse(message.data);
                if(response.mapdata) {
                    
                } else if(response.mapname) {
                    document.getElementById("mapname").innerText = mapnames[response.mapname];
                } else if(response.users) {
                    if(inGame) {
                        document.getElementById("players_container").innerHTML = "";
                        for(let i=0; i<response.users.length; i++) {
                            document.getElementById("players_container").innerHTML += `
                            <DIV CLASS="lb_player" ID="l-${response.users[i].id}">
                                <DIV CLASS="lb_avatar-frame" STYLE="border: 5px solid ${response.users[i].framecolor}"></DIV>
                                <DIV CLASS="lb_p_info"><DIV ID="p_name" CLASS="lb_p_name">${response.users[i].name}</DIV></DIV>
                            </DIV>`;
                        }
                    } else {
                        //in lobby
                        document.getElementById("lobbyptable").innerHTML = "";
                        for(let i=0; i<response.users.length; i++) {
                            document.getElementById("lobbyptable").innerHTML += `
                            <DIV CLASS="glb_player" ID="l-${response.users[i].id}">
                                <DIV CLASS="glb_avatar-frame" STYLE="border: 5px solid ${response.users[i].framecolor}"></DIV>
                                <DIV CLASS="glb_p_info"><DIV ID="p_name" CLASS="lb_p_name">${response.users[i].name}</DIV></DIV>
                            </DIV>`;
                        }

                        //add green outline for confirmed users
                        if(response.playersconfirmed) {
                            for(let i=0; i<response.playersconfirmed.length; i++) {
                                document.getElementById("l-" + response.playersconfirmed[i]).style.border = "2px solid green";
                            }
                        }
                    }
                    pnames = response.users;
                } else if(response.playerleft) {
                    let p_displayed = document.getElementById("l-" + response.playerleft);
                    p_displayed.remove();
                //start game
                } else if(response.startgame) { //now load in map...
                    document.getElementById("lobbyscreen").style.display = "none";
                    document.getElementById("gamescreen").style.display = "block";
                    document.getElementById("gamelobby").style.display = "none";
                    document.getElementById("lobbyptable").innerHTML = "";
                    downloadMap().then(function() {
                        inGame = true;
                        initLB();
                        ws.send(JSON.stringify({"action": "mapready", "roomid": roomid, "uid": uid}));
                    });
                } else if(response.confirmedusers) {
                    for(let i=0; i<response.confirmedusers.length; i++) {
                        document.getElementById("l-" + response.confirmedusers[i]).style.border = "2px solid green";
                    }
                }
            }
        });
    });
}