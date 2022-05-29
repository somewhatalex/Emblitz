let roomid = "";
let uid = "";
let pnames = [];

function initializeMap() {
    var mapelements = document.getElementsByClassName("map-region");
    var selectedRegion = "";
    for(let i=0; i<mapelements.length; i++) {
        mapelements[i].setAttribute("fill", "#ffe2bf");
        mapelements[i].style.cursor = "pointer";

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
            if(selectedRegion != area) {
                area.style.stroke = "none";
            }
        });

        //when clicked...
        mapelements[i].addEventListener("click", function(d) {
            let area = d.currentTarget;
            let d2 = document.getElementsByClassName("map-region")[1]
connect(area, d2, 'green', 5)
            if(selectedRegion != area) {
                selectedRegion = area;
                area.style.stroke = "#004ab3";
                area.style.strokeWidth = "5px";
                area.style.strokeLinejoin = "round";
                attackTerritory(area);
            } else {
                selectedRegion = "";
                area.style.stroke = "#ffffff";
                area.style.strokeWidth = "5px";
                area.style.strokeLinejoin = "round";
            }
        });
    }
    //manage zooming and panning
    let zoomElement = document.getElementById("mapcontainer");
    zoomElement.style.transform = "scale(1)";
    document.addEventListener("wheel", function(e) {
        if(zoomElement.contains(e.target)) {
            let elementTransform = Number(zoomElement.style.transform.replace(/\(/g, "").replace(/\)/g, "").replace(/scale/g, ""));
            var zoomdelta = (e.deltaY)/500;
            if(elementTransform >= 3) {
                zoomElement.style.transform = "scale(3)";
                if(zoomdelta > 0) {
                    zoomdelta = 0;
                }
            } else if(elementTransform <= 0.7) {
                zoomElement.style.transform = "scale(0.7)";
                if(zoomdelta < 0) {
                    zoomdelta = 0;
                }
            }

            zoomElement.style.transform = `scale(${elementTransform += zoomdelta})`;
        }
    });

    //panning
    var mapElement = document.getElementById("map");
    var isMouseDown = 0;
    mapElement.style.transform = "translate(0px, 0px)";
    document.addEventListener("mousedown", function(e) {
        if(mapElement.contains(e.target)) isMouseDown = 1;
    });
    document.addEventListener("mouseup", function(e) {
        isMouseDown = 0;
    });
    document.addEventListener("mousemove", function(e) {
        if(isMouseDown && mapElement.contains(e.target)) {
            let mapTranslate = mapElement.style.transform.replace(/\(/g, "").replace(/\)/g, "").replace(/translate/g, "").replace(/px/g, "").replace(/ /g, "").split(",");

            let deltaX = e.movementX/1.5;
            let deltaY = e.movementY/1.5;

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
            mapElement.style.transform = `translate(${Number(mapTranslate[0]) + deltaX}px, ${Number(mapTranslate[1]) + deltaY}px)`;
        }
    });
}

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
  
function connect(div1, div2, color, thickness) {
    var off1 = getOffset(div1);
    var off2 = getOffset(div2);
    var x1 = off1.left + off1.width;
    var y1 = off1.top + off1.height;
    var x2 = off2.left + off2.width;
    var y2 = off2.top + off2.height;
    var length = Math.sqrt(((x2 - x1) * (x2 - x1)) + ((y2 - y1) * (y2 - y1)));
    var cx = ((x1 + x2) / 2) - (length / 2);
    var cy = ((y1 + y2) / 2) - (thickness / 2);
    var angle = Math.atan2((y1 - y2), (x1 - x2)) * (180 / Math.PI);
    var htmlLine = "<div style='padding:0px; margin:0px; height:" + thickness + "px; background-color:" + color + "; line-height: 1px; position: absolute; left:" + cx + "px; top:" + cy + "px; width:" + length + "px; -moz-transform:rotate(" + angle + "deg); -webkit-transform:rotate(" + angle + "deg); -o-transform:rotate(" + angle + "deg); -ms-transform:rotate(" + angle + "deg); transform:rotate(" + angle + "deg);' />";
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