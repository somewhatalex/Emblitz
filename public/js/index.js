let roomid = "";
let uid = "";
let pnames = [];

var mapdict = "";
var mapmoves = "";
var possibleMoves = [];

var inGame = false;

var myColor = "";
var playerColors = {};

var websocket = null;

var attackPhase = "";
var selectedRegion = "";

var coordadjusts = null;
var mapboundsX = null;
var mapboundsY = null;

var totalterritories = 1;

var lifetimepeaktroops = 0;
var lifetimepeakterritories = 0;

var mapname = "";

var sharedetails = "";

var setEventListeners = false; //do not reset this

var alltimeouts = [];

var mapselectindex = 0;
var mapselectedvalue = "random";

var showlb = false; //mobile only

var previoustouch;
var previousmobilezoom;

var p_startindex = 0;

//mobile detection
window.onload = function() {
    /*
    if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
        document.getElementsByClassName("mainlogoimg")[0].style.width = "250px";
        document.getElementById("join_input").innerHTML = `
        <DIV STYLE="margin-left: 10px; padding-bottom: 20px; font-size: 20px; color: var(--light);">Sorry, we're still working on the mobile version for the game! Please use a desktop computer or laptop to play Emblitz. Don't worry though, we'll get the mobile version done soon. There could even be an app for it.<BR><BR>This this message is a mistake and you aren't on mobile right now? If so, send us a bug report.</DIV>`
    }
    */

    if(history.scrollRestoration) {
        history.scrollRestoration = "manual";
    } else {
        window.onbeforeunload = function () {
            window.scrollTo(0, 0);
        }
    }

    getUserInfo();
    inithomepage();
    detectAdBlock();
}

function inithomepage() {
    if(!localStorage.getItem("map")) {
        localStorage.setItem("map", "random");
    }

    if(!localStorage.getItem("hasvisited")) {
        showtutorialtt();
        localStorage.setItem("hasvisited", true);
    }

    loadPosts("refresh");
    getUserInfo();

    for(let i=0; i<mapDescriptions.length; i++) {
        if(mapDescriptions[i][3] === localStorage.getItem("map")) {
            mapselectindex = i;

            mapselectedvalue = mapDescriptions[i][3];

            document.getElementById("s-title").innerText = mapDescriptions[mapselectindex][0];
            document.getElementById("s-description").innerText = mapDescriptions[mapselectindex][1];
            document.getElementById("s-image").src = mapDescriptions[mapselectindex][2];
            if(mapDescriptions[mapselectindex][4]) {
                document.getElementById("s-maxplayers").style.display = "block";
                document.getElementById("s-maxplayers").innerText = "Max players: " + mapDescriptions[mapselectindex][4];
            } else {
                document.getElementById("s-maxplayers").style.display = "none";
            }
            break;
        }
    }
}

function resetAll() {
    document.body.style.touchAction = "pan-y";
    document.getElementById("eventstimer").style.width = "0%";
    roomid = "";
    uid = "";
    pnames = [];

    mapdict = "";
    mapmoves = "";
    possibleMoves = [];

    inGame = false;

    myColor = "";
    playerColors = {};

    websocket = null;

    attackPhase = "";
    selectedRegion = "";

    coordadjusts = null;
    mapboundsX = null;
    mapboundsY = null;

    totalterritories = 1;

    lifetimepeaktroops = 0;
    lifetimepeakterritories = 0;

    mapname = "";

    sharedetails = "";
    
    alltimeouts = [];

    mapselectindex = 0;

    showlb = false;

    previoustouch = null;
    previousmobilezoom = null;

    p_startindex = 0;
}

function hidegamenews() {
    document.getElementById("gamenews-container").style.setProperty("display", "none", "important");
    document.getElementById("shownewsbutton").style.setProperty("display", "block", "important");
    document.getElementsByClassName("homeguicontainer")[0].style.setProperty("position", "absolute");
}

function shownewsstory(id) {
    document.getElementsByClassName("gn-reader")[0].style.display = "block";
    let title = document.getElementById(id).getElementsByClassName("news-title")[0].innerText;
    let date = document.getElementById(id).getElementsByClassName("news-date")[0].innerText;
    let content = document.getElementById(id).getElementsByClassName("news-content")[0].innerHTML;

    document.getElementById("gn-title").innerText = title;
    document.getElementById("gn-date").innerText = date;
    document.getElementById("gn-content").innerHTML = content;
}

function hidenewsreader() {
    document.getElementsByClassName("gn-reader")[0].style.display = "none";
    document.getElementById("gn-title").innerText = "Loading...";
    document.getElementById("gn-date").innerText = "Loading...";
    document.getElementById("gn-content").innerHTML = "Loading...";
}

function loadPosts(refresh) {
    let postarea = document.getElementById("gn-body");
    let amount = 6;

    if(document.getElementsByClassName("gn-loadmore")[0]) {
        document.getElementsByClassName("gn-loadmore")[0].remove();
    }

    if(refresh) {
        postarea.innerHTML = "Loading...";
        p_startindex = 0;
    }
    fetch("/api", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({action: "fetchposts", startindex: p_startindex, amount: amount})}).then(response => {
        response.json().then(function(text) {
            if(text.error == 429) {
                notification("error", "Too many requests", "You're making too many requests, please slow down!", 8);
                return;
            }
            if(text.posts.length == 0) {
                postarea.innerHTML += `<DIV STYLE="font-size: 17px; margin-bottom: 20px">No more posts; you're all caught up!</DIV>`
                return;
            }
            if(refresh) {
                postarea.innerHTML = "";
            }
            let trtoappend = "";
            for(let i=0; i<text.posts.length; i++) {
                trtoappend += `
                <DIV CLASS="news-container" ID="${text.posts[i].id}">
                    <DIV CLASS="news-title">${text.posts[i].title}</DIV>
                    <DIV CLASS="news-date">${text.posts[i].submittedtime}</DIV>
                    <DIV CLASS="news-content">${text.posts[i].content}</DIV>
                    <BUTTON CLASS="news-readmore" ONCLICK=shownewsstory("${text.posts[i].id}")>Read more...</BUTTON>
                </DIV>`
            }

            trtoappend += `<BUTTON CLASS="gn-loadmore jb_gray" ONCLICK="loadPosts()">Load more news</BUTTON>`;
            postarea.innerHTML += trtoappend;
            p_startindex = p_startindex + 6;
        });
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

function showJoinRoom() {
    if(document.getElementById("joinroom_area").style.display === "none") {
        document.getElementById("joinroom_area").style.display = "block";
    } else {
        document.getElementById("joinroom_area").style.display = "none";
    }
}

//element = element (ex. mapelements[i]) and darken = true/false
function getColor(element, darken) {
    let colortype = element.getAttribute("data-color");
    if(darken) {
        return colorData[colortype].darken;
    } else {
        return colorData[colortype].normal;
    }
}

function initializeMap() {
    let isDragging = false;
    var mapelements = document.getElementsByClassName("map-region");
    selectedRegion = "";
    for(let i=0; i<mapelements.length; i++) {
        mapelements[i].setAttribute("fill", getColor(mapelements[i], false));
        mapelements[i].style.stroke = "#171717";
        mapelements[i].style.strokeWidth = "2px";
        mapelements[i].style.strokeLinejoin = "round";
        mapelements[i].style.cursor = "pointer";
        let labelpos = getOffset(mapelements[i]);
        if(coordadjusts[mapelements[i].getAttribute("data-code")]) {
            let adjustamount = coordadjusts[mapelements[i].getAttribute("data-code")];
            document.getElementById("mapl2").innerHTML += `
            <DIV CLASS="territorylabel" STYLE="top: ${labelpos.top+35+adjustamount[1]}px; left: ${labelpos.left+25+adjustamount[0]}px">
                <DIV CLASS="t_troop_change" ID="t_troops_change_${mapelements[i].getAttribute("data-code").toLowerCase().replace(/ /g, "")}">+0</DIV>
                <DIV CLASS="t_name">${mapdict[mapelements[i].getAttribute("data-code")]}</DIV>
                <DIV CLASS="t_troops" ID="t_origin_${mapelements[i].getAttribute("data-code").toLowerCase().replace(/ /g, "")}"><DIV CLASS="t_troops_value" STYLE="margin-top: -7px; font-weight: bold; margin-left: -45px; width: 100px;">1</DIV></DIV>
            </DIV>`
        } else {
            document.getElementById("mapl2").innerHTML += `
            <DIV CLASS="territorylabel" STYLE="top: ${labelpos.top+35}px; left: ${labelpos.left+25}px">
                <DIV CLASS="t_troop_change" ID="t_troops_change_${mapelements[i].getAttribute("data-code").toLowerCase().replace(/ /g, "")}">+0</DIV>
                <DIV CLASS="t_name">${mapdict[mapelements[i].getAttribute("data-code")]}</DIV>
                <DIV CLASS="t_troops" ID="t_origin_${mapelements[i].getAttribute("data-code").toLowerCase().replace(/ /g, "")}"><DIV CLASS="t_troops_value" STYLE="margin-top: -7px; font-weight: bold; margin-left: -45px; width: 100px;">1</DIV></DIV>
            </DIV>`
        }

        //show outline
        mapelements[i].addEventListener("mouseover", function(d) {
            let countryCode = mapelements[i].getAttribute("data-code");
            //console.log(countryCode);
            mapelements[i].setAttribute("fill", getColor(mapelements[i], true));
            let area = d.currentTarget;
            if(selectedRegion != area) {
                area.style.stroke = "#ffffff";
                area.style.strokeWidth = "5px";
                area.style.strokeLinejoin = "round";
            }
        });
        //hide outline

        mapelements[i].addEventListener("mouseleave", function(d) {
            mapelements[i].setAttribute("fill", getColor(mapelements[i], false));
            let area = d.currentTarget;
            if(selectedRegion != area && !possibleMoves.includes(area.getAttribute("data-code"))) {
                mapelements[i].style.stroke = "#171717";
                mapelements[i].style.strokeWidth = "2px";
                mapelements[i].style.strokeLinejoin = "round";
            } else if(possibleMoves.includes(area.getAttribute("data-code") && selectedRegion)) {
                mapelements[i].style.strokeWidth = "2px";
            } else if(area != selectedRegion) {
                mapelements[i].style.strokeWidth = "2px";
                mapelements[i].style.strokeLinejoin = "round";
            }
        });

        //when clicked...
        mapelements[i].addEventListener("click", function(d) {
            //isDragging --> is the mouse moving? handled by "mousemove" event listener
            if(isDragging == false) {
                if(attackPhase === "deploy") {
                    deployTroops(d.currentTarget);
                } else if(attackPhase === "attack") {
                    let currentAttackLines = document.getElementsByClassName("attack-line");
                    while(currentAttackLines[0]) {
                        currentAttackLines[0].parentNode.removeChild(currentAttackLines[0])
                    }

                    //reset regions
                    let allregions = document.getElementsByClassName("map-region");
                    for(let i=0; i<allregions.length; i++) {
                        allregions[i].style.stroke = "#171717";
                        allregions[i].style.strokeWidth = "2px";
                        allregions[i].style.strokeLinejoin = "round";
                    }

                    let territory = d.currentTarget;
                    if(selectedRegion !== territory) {
                        if(possibleMoves.includes(territory.getAttribute("data-code"))) {
                            document.getElementById("sendamount").innerText = "--";
                            possibleMoves = [];
                            attackTerritory(selectedRegion, territory);
                            selectedRegion = "";
                            return;
                        }
                    }

                    if(territory.getAttribute("data-color") !== myColor) { //super scuffed, but it should work for basic client-side validation
                        return;
                    }

                    possibleMoves = [];

                    for(let i=0; i<mapmoves.length; i++) {
                        if(mapmoves[i].includes(d.currentTarget.getAttribute("data-code"))) {
                            let dest = mapmoves[i].split(" ").filter(function(item) {
                                return item !== d.currentTarget.getAttribute("data-code");
                            });
                            possibleMoves.push(dest.toString());
                        }
                    }

                    let troopmoveamount = Math.round(Number(document.getElementById("t_origin_" + d.currentTarget.getAttribute("data-code").toLowerCase()).getElementsByClassName("t_troops_value")[0].innerText) * Number(document.getElementById("troopslider").value) * 0.01);
                    if(troopmoveamount < 1) {
                        troopmoveamount = 1;
                    }
                    document.getElementById("sendamount").innerText = troopmoveamount + " troops";

                    for(let i=0; i<possibleMoves.length; i++) {
                        let area = document.getElementById("t_origin_" + possibleMoves[i].toString().toLowerCase());
                        let d2 = document.getElementById("t_origin_" + d.currentTarget.getAttribute("data-code").toLowerCase());
                        connect(area, d2, "#e69420", 4);
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
                        document.getElementById("sendamount").innerText = "--"
                        possibleMoves = [];
                    }
                }
            }
        });
    }

    //manage zooming and panning
    let zoomElement = document.getElementById("mapcontainer");
    zoomElement.style.transform = "scale(1)";
    var mapElement = document.getElementById("map");
    var isMouseDown = 0;
    mapElement.style.transform = "translate(0px, 0px)";

    if(!setEventListeners) {
        setEventListeners = true;
        document.addEventListener("wheel", function(e) {
            if(zoomElement.contains(e.target) || e.target === document.getElementById("gamescreen")) {
                if(document.getElementById("player_gui").contains(e.target)) return;
                let elementTransform = Number(zoomElement.style.transform.replace(/\(/g, "").replace(/\)/g, "").replace(/scale/g, ""));
                var zoomdelta = (e.deltaY)/-500;
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
        document.addEventListener("pointerdown", function(e) {
            if(document.getElementById("quitconfirm").style.display === "block" && e.target !== document.getElementById("quitconfirm") && e.target !== document.getElementById("leavegamebutton") && !document.getElementById("quitconfirm").contains(e.target) && !document.getElementById("leavegamebutton").contains(e.target)) {
                document.getElementById("quitconfirm").style.display = "none";
            }
            isMouseDown = 1;
        });
        document.addEventListener("pointerup", function(e) {
            isMouseDown = 0;
            //delay 1ms to prevent immediate cancelation
            if(isDragging == true) {
                setTimeout(function() {
                    isDragging = false;
                }, 1)
            }
        });
        //mobile
        document.addEventListener("touchend", (e) => {
            previoustouch = null;
            previousmobilezoom = null;
        });
        document.addEventListener("touchmove", (e) => {
            //mobile panning
            if(mapElement.contains(e.target) || e.target === document.getElementById("gamescreen")) {
                if(document.getElementById("player_gui").contains(e.target)) return;
                isDragging = true;
                let mapTranslate = mapElement.style.transform.replace(/\(/g, "").replace(/\)/g, "").replace(/translate/g, "").replace(/px/g, "").replace(/ /g, "").split(",");
                let mapZoom = Number(document.getElementById("mapcontainer").style.transform.replace(/\(/g, "").replace(/\)/g, "").replace(/scale/g, ""));

                let touch = e.touches[0];
                if(previoustouch) {
                    e.movementX = touch.pageX - previoustouch.pageX;
                    e.movementY = touch.pageY - previoustouch.pageY;
                }
                previoustouch = touch;

                let deltaX = e.movementX/1.3;
                let deltaY = e.movementY/1.3;

                //must check both x and y coords for scrolling
                if(mapTranslate[0] > mapboundsX[0] && deltaX > 0) {
                    deltaX = 0;
                } else if(mapTranslate[0] < mapboundsX[1] && deltaX < 0) {
                    deltaX = 0;
                }

                if(mapTranslate[1] > mapboundsY[0] && deltaY > 0) {
                    deltaY = 0;
                } else if(mapTranslate[1] < mapboundsY[1] && deltaY < 0) {
                    deltaY = 0;
                }
                if(!mapTranslate[1]) {
                    mapTranslate[1] = 0;
                }
                mapElement.style.transform = `translate(${Number(mapTranslate[0]) + deltaX/mapZoom}px, ${Number(mapTranslate[1]) + deltaY/mapZoom}px)`;
            }

            //mobile zooming
            if(zoomElement.contains(e.target) || e.target === document.getElementById("gamescreen")) {
                if(!e.touches[1]) return;
                if(document.getElementById("player_gui").contains(e.target)) return;

                let currentzoom = Math.sqrt((e.touches[1].pageX - e.touches[0].pageX)**2 + (e.touches[1].pageY - e.touches[0].pageY)**2);
                if(previousmobilezoom) {
                    e.deltaY = currentzoom - previousmobilezoom;
                }
                previousmobilezoom = currentzoom;

                let elementTransform = Number(zoomElement.style.transform.replace(/\(/g, "").replace(/\)/g, "").replace(/scale/g, ""));
                var zoomdelta = (e.deltaY)/250;
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
        document.addEventListener("pointermove", function(e) {
            switch(e.pointerType) {
                case "touch":
                    break;
                default:
                    if(isMouseDown) {
                        if(mapElement.contains(e.target) || e.target === document.getElementById("gamescreen")) {
                            if(document.getElementById("player_gui").contains(e.target)) return;
                            isDragging = true;
                            let mapTranslate = mapElement.style.transform.replace(/\(/g, "").replace(/\)/g, "").replace(/translate/g, "").replace(/px/g, "").replace(/ /g, "").split(",");
                            let mapZoom = Number(document.getElementById("mapcontainer").style.transform.replace(/\(/g, "").replace(/\)/g, "").replace(/scale/g, ""));

                            let deltaX = e.movementX/1.3;
                            let deltaY = e.movementY/1.3;

                            //must check both x and y coords for scrolling
                            if(mapTranslate[0] > mapboundsX[0] && deltaX > 0) {
                                deltaX = 0;
                            } else if(mapTranslate[0] < mapboundsX[1] && deltaX < 0) {
                                deltaX = 0;
                            }

                            if(mapTranslate[1] > mapboundsY[0] && deltaY > 0) {
                                deltaY = 0;
                            } else if(mapTranslate[1] < mapboundsY[1] && deltaY < 0) {
                                deltaY = 0;
                            }
                            if(!mapTranslate[1]) {
                                mapTranslate[1] = 0;
                            }
                            mapElement.style.transform = `translate(${Number(mapTranslate[0]) + deltaX/mapZoom}px, ${Number(mapTranslate[1]) + deltaY/mapZoom}px)`;
                        }
                    }
            }
        });
    }
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

function attackTerritory(start, target) {
    console.log("[DEBUG] Attacking from " + start.getAttribute("data-code") + " to " + target.getAttribute("data-code"));
    let trooppercent = Math.round(document.getElementById("troopslider").value);
    if(start.getAttribute("data-color") === myColor) { //once again, it's super scuffed but it should do for basic client-side validation
        websocket.send(JSON.stringify({"action": "attack", "start": start.getAttribute("data-code"), "target": target.getAttribute("data-code"), "trooppercent": trooppercent, "uid": uid, "roomid": roomid, "gid": gid}));
    }
}

function deployTroops(target) {
    console.log("[DEBUG] Deployed troops to " + target.getAttribute("data-code"));
    if(target.getAttribute("data-color") === "default") {
        target.setAttribute("data-color", myColor);
        target.setAttribute("fill", getColor(target, false));
        websocket.send(JSON.stringify({"action": "deploy", "target": target.getAttribute("data-code"), "uid": uid, "roomid": roomid, "gid": gid}));
    }
}

async function connectToServer() {
    let websockettype = "ws://"
    if(prod === "yes") {
        websockettype = "wss://";
    }
    const ws = new WebSocket(websockettype + hostname + "/ws");
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
                coordadjusts = JSON.parse(text.coordadjust);
                mapboundsX = JSON.parse(text.metadata).boundsX;
                mapboundsY = JSON.parse(text.metadata).boundsY;
                makemap(text.mapdata);
                resolve("ok");
            });
        });
    });
}

function joinGame(inputroomid, pmap, createnewroom) {
    return new Promise((resolve, reject) => {
        fetch("/api", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({action: "joingame", prefermap: pmap, preset: inputroomid, createnewroom: createnewroom})}).then(response => {
            response.json().then(function(text) {
                if(!text.error) {
                    roomid = text.room;
                    uid = text.uid;
                    resolve("ok");
                } else if(text.error === "room " + inputroomid + " is full") {
                    reject("The room you tried joining is full. Try joining another game.");
                } else if(text.error === "room " + inputroomid + " does not exist") {
                    reject("The room you tried joining does not exist. Did you type the join code correctly?");
                }
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

function troopChangeAnimation(value, location) {
    let troopschangecounter = document.getElementById("t_troops_change_" + location);
    troopschangecounter.style.display = "block";
    troopschangecounter.style.top = "-15px";
    troopschangecounter.style.opacity = "0";
    setTimeout(function() {
        document.getElementById("t_troops_change_" + location).style.top = "-30px";
        document.getElementById("t_troops_change_" + location).style.opacity = "1";
        setTimeout(function() {
            document.getElementById("t_troops_change_" + location).style.top = "-15px";
            document.getElementById("t_troops_change_" + location).style.opacity = "0";
            setTimeout(function() {
                document.getElementById("t_troops_change_" + location).style.display = "none";
            }, 200)
        }, 1200);
    }, 200);
    if(value > 0) {
        troopschangecounter.innerText = "+" + value;
        troopschangecounter.style.color = "#12c708";
    } else  {
        troopschangecounter.innerText = value;
        troopschangecounter.style.color = "#d40d1a";
    }
}

function initLB() {
    document.getElementById("players_container").innerHTML = "";
    for(let i=0; i<pnames.length; i++) {
        document.getElementById("players_container").innerHTML += `
        <DIV CLASS="lb_player" ID="l-${pnames[i].id}">
            <DIV CLASS="lb_avatar-frame" STYLE="border: 5px solid ${pnames[i].pcolor}"></DIV>
            <DIV CLASS="lb_p_info"><DIV ID="p_name" CLASS="lb_p_name">${pnames[i].name}</DIV></DIV>
        </DIV>`;
    }
}

function infobar(display) {
    if(display === "hide") {
        document.getElementById("infobar").style.top = "-70px";
    } else {
        document.getElementById("infobar").style.display = "block";
        document.getElementById("infobar").style.top = "20px";
    }
}

function troopTimerBar() {
    var troopTimerInterval = null;
    document.getElementById("troopstimer").style.transitionDuration = "0.5s";
    document.getElementById("troopstimer").style.width = "0%";

    document.getElementById("troopseconds").innerText = "10";
    let trooptimeleft = 10;
    troopTimerInterval = setInterval(function() {
        trooptimeleft--;
        if(trooptimeleft < 0) {
            trooptimeleft = 0;
            clearInterval(troopTimerInterval);
        }
        document.getElementById("troopseconds").innerText = trooptimeleft;
    }, 1000);

    alltimeouts.push(setTimeout(function() {
        clearInterval(troopTimerInterval);
        document.getElementById("troopseconds").innerText = "10";
        trooptimeleft = 10;
    }, 9900))

    alltimeouts.push(setTimeout(function() {
        document.getElementById("troopstimer").style.transitionDuration = "9.5s";
        document.getElementById("troopstimer").style.width = "100%";
    }, 500));
}

function notification(type, title, content, persisttime) {
    let toastcolor = "";
    let currenttoast = document.createElement("div");
    currenttoast.className = "notification";
    currenttoast.style.right = "-320px";
    
    if(type === "warn") {
        toastcolor = "#dae813";
    } else if(type === "notify") {
        toastcolor = "#1356e8";
    } else if(type === "error") {
        toastcolor = "#e81313";
    }
    
    currenttoast.innerHTML = `<DIV CLASS="notification-bg" STYLE="border-left: 5px solid ${toastcolor}"></DIV>
    <DIV CLASS="notification-inner">
        <DIV CLASS="notification-title" ID="note-title">${title}</DIV>
        <DIV CLASS="notification-content" ID="note-content">${content}</DIV>
    </DIV>`

    document.getElementById("notifications").appendChild(currenttoast);

    setTimeout(function() {
        currenttoast.style.right = "0px";
    }, 10);

    setTimeout(function() {
        currenttoast.style.right = "-320px";
        setTimeout(function() {
            currenttoast.remove();
        }, 300)
    }, persisttime*1000);
}

// Adblocker notification
function detectAdBlock(){
    let x = document.querySelector(".adsbygoogle");
    let x_height = x.offsetHeight;
     
   if(x_height){
   } else{
    notification("notify","Adblocker","It seems that you're using an addblocker! If you don't mind, all of our profits go to a non-profit charity and disabling your adblocker would really help us. Thank you"
    , 15);
}
}

function getCookie(name) {
    var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    if (match) return match[2];
}

const gid = getCookie("GID");

var lobbytimeinterval = null;
var lobbycountdown = 20;
function tickLobbyTimer() {
    lobbycountdown = 20;
    document.getElementById("timeramount").innerText = lobbycountdown;
    lobbytimeinterval = setInterval(function() {
        if(document.getElementsByClassName("glb_player").length > 1 && lobbycountdown > 0) {
            lobbycountdown--
            document.getElementById("timeramount").innerText = lobbycountdown;
        }
    }, 1000);
}

function getUserInfo() {
    fetch("/api", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({action: "getmyinfo"})}).then(response => {
        response.json().then(function(result) {
            document.getElementById("ms_medals").innerText = result.medals;
            document.getElementById("ms_badges").innerText = Object.keys(JSON.parse(result.badges)).length;
        });
    });
}

function gameConnect(inputroomid, pmap, createnewroom) {
    document.getElementById("lobbyscreen").style.display = "none";
    document.getElementById("gamescreen").style.display = "none";
    document.getElementById("gamelobby").style.display = "block";
    joinGame(inputroomid, pmap, createnewroom).then(function() {
        connectToServer().then(function(ws) {
            document.getElementById("invitecode").innerText = roomid.replace("r-", "");
            tickLobbyTimer();
            websocket = ws;
            ws.send(JSON.stringify({"action": "userlogin", "uid": uid, "roomid": roomid, "uuid": getCookie("uuid"), "gid": gid, "pubkey": getCookie("publickey")}));
            confirmJoinGame().then(function() {
                ws.send(JSON.stringify({"action": "userconfirm", "roomid": roomid, "uid": uid, "gid": gid}));
            });

            ws.onmessage = (message) => {
                let response = JSON.parse(message.data);
                if(response.mapdata) {
                    
                } else if(response.mapname) {
                    document.getElementById("mapname").innerText = mapnames[response.mapname];
                    mapname = mapnames[response.mapname];
                } else if(response.users) {
                    if(inGame) {
                        document.getElementById("players_container").innerHTML = "";
                        for(let i=0; i<response.users.length; i++) {
                            if(response.users[i].id === uid) {
                                document.getElementById("players_container").innerHTML += `
                                <DIV CLASS="lb_player" ID="l-${response.users[i].id}" STYLE="background-color: ${colorData[response.users[i].pcolor].normal}; box-shadow: inset 0px 0px 7px 1px ${colorData[response.users[i].pcolor].darken}; -webkit-box-shadow: inset 0px 0px 7px 1px ${colorData[response.users[i].pcolor].darken};">
                                    <DIV CLASS="lb_avatar-frame" STYLE="border: 5px solid ${response.users[i].pcolor}"><IMG STYLE="width: 60px; height: 60px" SRC="./images/defaultpfp.png"></DIV>
                                    <DIV CLASS="lb_p_info"><DIV ID="p_name" CLASS="lb_p_name"><I CLASS="fa fa-user-o"></I> ${response.users[i].name}</DIV>
                                    <BR><DIV CLASS="l-stats"><I CLASS="fa fa-male"></I> <SPAN ID="troops-${response.users[i].id}">0</SPAN> | <I CLASS="fa fa-map-marker"></I> <SPAN ID="territories-${response.users[i].id}">0</SPAN></DIV></DIV>
                                </DIV>`;
                                document.getElementById("t-avatar-frame").style.border = "5px solid " + response.users[i].pcolor;
                                document.getElementById("t-avatar-frame").innerHTML = `<IMG STYLE="width: 100%; height: 100%" SRC="./images/defaultpfp.png">`;
                                document.getElementById("t-avatar-frame").style.background = colorData[response.users[i].pcolor].normal;
                            } else {
                                document.getElementById("players_container").innerHTML += `
                                <DIV CLASS="lb_player" ID="l-${response.users[i].id}" STYLE="background-color: ${colorData[response.users[i].pcolor].normal}; box-shadow: inset 0px 0px 7px 1px ${colorData[response.users[i].pcolor].darken}; -webkit-box-shadow: inset 0px 0px 7px 1px ${colorData[response.users[i].pcolor].darken};">
                                    <DIV CLASS="lb_avatar-frame" STYLE="border: 5px solid ${response.users[i].pcolor}"><IMG STYLE="width: 60px; height: 60px" SRC="./images/defaultpfp.png"></DIV>
                                    <DIV CLASS="lb_p_info"><DIV ID="p_name" CLASS="lb_p_name">${response.users[i].name}</DIV>
                                    <BR><DIV CLASS="l-stats"><I CLASS="fa fa-male"></I> <SPAN ID="troops-${response.users[i].id}">0</SPAN> | <I CLASS="fa fa-map-marker"></I> <SPAN ID="territories-${response.users[i].id}">0</SPAN></DIV></DIV>
                                </DIV>`;
                            }
                            playerColors[response.users[i].id] = response.users[i].pcolor;
                        }
                        
                    } else {
                        //in lobby
                        document.getElementById("lobbyptable").innerHTML = "";
                        if(response.isprivateroom) {
                            document.getElementById("proomdisplay").style.display = "block";
                        } else {
                            document.getElementById("proomdisplay").style.display = "none";
                        }
                        for(let i=0; i<response.users.length; i++) {
                            if(response.users[i].id === uid) {
                                if(response.users[i].name.startsWith("Player ")) {
                                    document.getElementById("lobbyptable").innerHTML += `
                                    <DIV CLASS="glb_player" ID="l-${response.users[i].id}" STYLE="background-color: ${colorData[response.users[i].pcolor].normal}; box-shadow: inset 0px 0px 7px 1px ${colorData[response.users[i].pcolor].darken}; -webkit-box-shadow: inset 0px 0px 7px 1px ${colorData[response.users[i].pcolor].darken};">
                                        <DIV CLASS="glb_avatar-frame" STYLE="border: 5px solid ${response.users[i].pcolor}"><IMG STYLE="width: 60px; height: 60px" SRC="./images/defaultpfp.png"></DIV>
                                        <DIV CLASS="glb_p_info"><DIV ID="p_name" CLASS="lb_p_name"><I CLASS="fa fa-user-o"></I> ${response.users[i].name}</DIV></DIV>
                                    </DIV>`;
                                } else {
                                    document.getElementById("lobbyptable").innerHTML += `
                                    <DIV CLASS="glb_player" ID="l-${response.users[i].id}" ONCLICK="window.open('./user/${response.users[i].name}', '_blank');" TITLE="View ${response.users[i].name}'s profile in a new window" STYLE="background-color: ${colorData[response.users[i].pcolor].normal}; box-shadow: inset 0px 0px 7px 1px ${colorData[response.users[i].pcolor].darken}; -webkit-box-shadow: inset 0px 0px 7px 1px ${colorData[response.users[i].pcolor].darken}; cursor: pointer">
                                        <DIV CLASS="glb_avatar-frame" STYLE="border: 5px solid ${response.users[i].pcolor}"><IMG STYLE="width: 60px; height: 60px" SRC="./images/defaultpfp.png"></DIV>
                                        <DIV CLASS="glb_p_info"><DIV ID="p_name" CLASS="lb_p_name"><I CLASS="fa fa-user-o"></I> ${response.users[i].name}</DIV></DIV>
                                    </DIV>`;
                                }
                            } else {
                                if(response.users[i].name.startsWith("Player ")) {
                                    document.getElementById("lobbyptable").innerHTML += `
                                    <DIV CLASS="glb_player" ID="l-${response.users[i].id}" STYLE="background-color: ${colorData[response.users[i].pcolor].normal}; box-shadow: inset 0px 0px 7px 1px ${colorData[response.users[i].pcolor].darken}; -webkit-box-shadow: inset 0px 0px 7px 1px ${colorData[response.users[i].pcolor].darken};">
                                        <DIV CLASS="glb_avatar-frame" STYLE="border: 5px solid ${response.users[i].pcolor}"><IMG STYLE="width: 60px; height: 60px" SRC="./images/defaultpfp.png"></DIV>
                                        <DIV CLASS="glb_p_info"><DIV ID="p_name" CLASS="lb_p_name"><I CLASS="fa fa-user-o"></I> ${response.users[i].name}</DIV></DIV>
                                    </DIV>`;
                                } else {
                                    document.getElementById("lobbyptable").innerHTML += `
                                    <DIV CLASS="glb_player" ID="l-${response.users[i].id}" ONCLICK="window.open('./user/${response.users[i].name}', '_blank');" TITLE="View ${response.users[i].name}'s profile in a new window" STYLE="background-color: ${colorData[response.users[i].pcolor].normal}; box-shadow: inset 0px 0px 7px 1px ${colorData[response.users[i].pcolor].darken}; -webkit-box-shadow: inset 0px 0px 7px 1px ${colorData[response.users[i].pcolor].darken}; cursor: pointer">
                                        <DIV CLASS="glb_avatar-frame" STYLE="border: 5px solid ${response.users[i].pcolor}"><IMG STYLE="width: 60px; height: 60px" SRC="./images/defaultpfp.png"></DIV>
                                        <DIV CLASS="glb_p_info"><DIV ID="p_name" CLASS="lb_p_name">${response.users[i].name}</DIV></DIV>
                                    </DIV>`;
                                }
                            }
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
                    if(p_displayed) {
                        p_displayed.remove();
                    }
                    if(inGame) {
                        let leftname = pnames.filter(obj => {
                            return obj.id === response.playerleft;
                        });
                        leftname = leftname[0].name;
                        notification("notify", leftname + " left", leftname + " has left the game.", 5);
                    }
                //start game
                } else if(response.startgame) { //now load in map...
                    document.getElementById("lobbyscreen").style.display = "none";
                    document.getElementById("gamescreen").style.display = "block";
                    document.getElementById("gamelobby").style.display = "none";
                    document.getElementById("lobbyptable").innerHTML = "";
                    document.body.style.touchAction = "none";
                    downloadMap().then(function() {
                        inGame = true;
                        initLB();
                        ws.send(JSON.stringify({"action": "mapready", "roomid": roomid, "uid": uid, "gid": gid}));

                        infobar("show");
                        let deploytime = response.deploytime;
                        document.getElementById("eventstimer").style.width = "0%";
                        document.getElementById("eventstimer").style.transitionDuration = deploytime-1 + "s";
                        setTimeout(function() {
                            document.getElementById("eventstimer").style.width = "100%";
                        }, 10)
                        alltimeouts.push(setTimeout(function() {
                            infobar("hide");
                        }, deploytime*1000));

                        document.getElementById("troopslider").addEventListener("input", function() {
                            let value = document.getElementById("troopslider").value;
                            document.getElementById("trooppercentage").innerText = value + "%";
                            this.style.background = "linear-gradient(to right, var(--green) 0%, var(--green) " + value + "%, var(--medium) " + value + "%, var(--medium) 100%)";

                            if(selectedRegion) {
                                let troopmoveamount = Math.round(Number(document.getElementById("t_origin_" + selectedRegion.getAttribute("data-code").toLowerCase()).getElementsByClassName("t_troops_value")[0].innerText) * Number(document.getElementById("troopslider").value) * 0.01);
                                if(troopmoveamount < 1) {
                                    troopmoveamount = 1;
                                }
                                document.getElementById("sendamount").innerText = troopmoveamount + " troops";
                            } else {
                                document.getElementById("sendamount").innerText = "--";
                            }
                        });

                        totalterritories = document.getElementsByClassName("map-region").length;

                        document.getElementById("statsbar-bg").style.borderTop = "10px solid " + colorData[myColor].normal;
                        document.getElementById("territoryprogress").style.background = colorData[myColor].normal;
                        document.getElementById("territoryprogress").style.width = "0%";
                        document.getElementById("s-totalterritories").innerText = totalterritories;

                        document.getElementById("s-troops").innerText = "0";
                        document.getElementById("s-territories").innerText = "0";
                    });
                } else if(response.confirmedusers) {
                    for(let i=0; i<response.confirmedusers.length; i++) {
                        document.getElementById("l-" + response.confirmedusers[i]).style.border = "2px solid green";
                    }
                } else if(response.message === "all users loaded") {
                    attackPhase = "deploy";
                } else if(response.updatemap) {
                    let updatemapdata = response.updatemap;
                    let reslength = Object.keys(updatemapdata).length;
                    let playeroccupied = 0;
                    let playertotaltroops = 0;
                    let playerstats = {};
                    for(let i=0; i<reslength; i++) {
                        let c_update_map_info = updatemapdata[Object.keys(updatemapdata)[i]];
                        let selectterritory = document.querySelector("[data-code='" + c_update_map_info.territory + "']");
                        if(!document.getElementById("t_origin_" + c_update_map_info.territory.toLowerCase())) {
                            console.log(c_update_map_info.territory.toLowerCase());
                        }
                        let initialtroops = document.getElementById("t_origin_" + c_update_map_info.territory.toLowerCase()).getElementsByClassName("t_troops_value")[0].innerText;
                        let initialcolor = selectterritory.getAttribute("data-color");
                        document.getElementById("t_origin_" + c_update_map_info.territory.toLowerCase()).getElementsByClassName("t_troops_value")[0].innerText = c_update_map_info.troopcount;
                        if(c_update_map_info.player != null) {
                            selectterritory.setAttribute("data-color", playerColors[c_update_map_info.player])
                            selectterritory.setAttribute("fill", getColor(selectterritory, false));
                        } else {
                            selectterritory.setAttribute("data-color", "default");
                            selectterritory.setAttribute("fill", getColor(selectterritory, false));
                        }

                        if(selectterritory.getAttribute("data-color") === myColor) {
                            playertotaltroops = playertotaltroops + Number(document.getElementById("t_origin_" + c_update_map_info.territory.toLowerCase()).getElementsByClassName("t_troops_value")[0].innerText);
                            playeroccupied++;
                        } else if(selectterritory.getAttribute("data-color") !== "default"){
                            if(!playerstats.hasOwnProperty(selectterritory.getAttribute("data-color"))) {
                                playerstats[selectterritory.getAttribute("data-color")] = [Number(document.getElementById("t_origin_" + c_update_map_info.territory.toLowerCase()).getElementsByClassName("t_troops_value")[0].innerText), 1];
                            } else {
                                playerstats[selectterritory.getAttribute("data-color")] = [playerstats[selectterritory.getAttribute("data-color")][0] + Number(document.getElementById("t_origin_" + c_update_map_info.territory.toLowerCase()).getElementsByClassName("t_troops_value")[0].innerText), playerstats[selectterritory.getAttribute("data-color")][1] + 1];
                            }
                        }

                        if(attackPhase === "attack") {
                            if(initialcolor === selectterritory.getAttribute("data-color")) {
                                if(c_update_map_info.troopcount - initialtroops != 0) {
                                    troopChangeAnimation(c_update_map_info.troopcount - initialtroops, c_update_map_info.territory.toLowerCase());
                                }
                            } else {
                                troopChangeAnimation(c_update_map_info.troopcount, c_update_map_info.territory.toLowerCase());
                            }

                            if(selectedRegion) {
                                let troopmoveamount = Math.round(Number(document.getElementById("t_origin_" + selectedRegion.getAttribute("data-code").toLowerCase()).getElementsByClassName("t_troops_value")[0].innerText) * Number(document.getElementById("troopslider").value) * 0.01);
                                if(troopmoveamount < 1) {
                                    troopmoveamount = 1;
                                }
                                document.getElementById("sendamount").innerText = troopmoveamount + " troops";
                            }
                        } else if(attackPhase === "deploy" && c_update_map_info.troopcount - initialtroops != 0 && selectterritory.getAttribute("data-color") !== "default") {
                            troopChangeAnimation(c_update_map_info.troopcount, c_update_map_info.territory.toLowerCase());
                        }
                    }

                    if(playertotaltroops > lifetimepeaktroops) {
                        lifetimepeaktroops = playertotaltroops;
                    }

                    if(playeroccupied > lifetimepeakterritories) {
                        lifetimepeakterritories = playeroccupied;
                    }

                    document.getElementById("s-troops").innerText = playertotaltroops;
                    document.getElementById("s-territories").innerText = playeroccupied;
                    document.getElementById("territoryprogress").style.width = (playeroccupied/totalterritories)*100 + "%";

                    document.getElementById("troops-" + uid).innerText = playertotaltroops;
                    document.getElementById("territories-" + uid).innerText = playeroccupied;

                    for(p_key in playerstats) {
                        for(key in playerColors) {
                            if(playerColors[key] === p_key) {
                                document.getElementById("troops-" + key).innerText = playerstats[p_key][0];
                                document.getElementById("territories-" + key).innerText = playerstats[p_key][1];
                                break;
                            }
                        }
                    }
                } else if(response.setcolor) {
                    myColor = response.setcolor;
                } else if(response.startAttackPhase) {
                    attackPhase = "attack";

                    troopTimerBar();
                    
                    setTimeout(function() {
                        document.getElementById("eventstimer").style.display = "none";
                        document.getElementById("eventstimer").style.width = "0%";
                        infobar("show");
                        document.getElementById("statustext").innerHTML = "<B>Attack Phase Started:</B> Select one of your own territories to move troops or attack! Last person standing wins!";
                        alltimeouts.push(setTimeout(function() {
                            infobar("hide");
                            setTimeout(function() {
                                document.getElementById("infobar").style.display = "none";
                            }, 400);
                        }, 7000));
                    }, 1000);
                } else if(response.syncTroopTimer) {
                    troopTimerBar();
                } else if(response.error) {
                    if(response.error === "invalid credentials") {
                        ws.close();
                        notification("error", "Error: Invalid credentials", "Please reload the page and join a new game. If this problem persists, contact us.", 10);
                    }
                } else if(response.playerdead) {
                    let p_displayed = document.getElementById("l-" + response.playerdead);
                    p_displayed.remove();
                    if(response.playerdead !== uid) {
                        let defeatedname = pnames.filter(obj => {
                            return obj.id === response.playerdead;
                        });
                        defeatedname = defeatedname[0].name;
                        notification("warn", defeatedname + " was defeated", defeatedname + " lost all their territories and was defeated!", 6)
                    } else {
                        //you died
                        document.getElementById("endscreen").style.display = "block";
                        document.getElementById("endscreen").style.opacity = "0";
                        document.getElementById("e-troops").innerText = lifetimepeaktroops;
                        document.getElementById("e-territories").innerText = lifetimepeakterritories;

                        let yourplace = response.place;
                        switch(yourplace) {
                            case 1:
                                yourplace += "st";
                                break;
                            case 2:
                                yourplace += "nd";
                                break;
                            case 3:
                                yourplace += "rd";
                                break;
                            default:
                                yourplace += "th";
                        }
                        document.getElementById("e-place").innerText = yourplace;
                        document.getElementById("e-map").innerText = mapname;
                        document.getElementById("e-header").innerText = "You were defeated";
                        document.getElementById("e-intro").innerText = "You lost all your territories and were defeated!";
                        document.getElementById("e-ending").innerText = "Better luck next time!";
                        sharedetails = "I played ⚔Emblitz, a real-time online strategy game, and placed " + yourplace + " in the " + mapname + " map. I had " + lifetimepeaktroops + " troops and captured " + lifetimepeakterritories + " territories at my peak. Play it at https://emblitz.com\n\n#Emblitz";
                        setTimeout(function() {
                            document.getElementById("endscreen").style.opacity = "1";
                        }, 100);
                    }
                } else if(response.playerWon) {
                    if(response.playerWon !== uid) {
                        let winname = pnames.filter(obj => {
                            return obj.id === response.playerdead;
                        });
                        winname = winname[0].name;
                        notification("notify", winname + " won the game!", winname + " defeated all other players and is the last player standing!", 6)
                    } else {
                        //you died
                        document.getElementById("endscreen").style.display = "block";
                        document.getElementById("endscreen").style.opacity = "0";
                        document.getElementById("e-troops").innerText = lifetimepeaktroops;
                        document.getElementById("e-territories").innerText = lifetimepeakterritories;
                        document.getElementById("e-place").innerText = "1st";
                        document.getElementById("e-map").innerText = mapname;
                        document.getElementById("e-header").innerText = "You won the battle";
                        document.getElementById("e-intro").innerText = "You won the battle by being the last player standing!";
                        document.getElementById("e-ending").innerText = "Congrats! Maybe join a new game and give it another go?";
                        sharedetails = "I played ⚔Emblitz, a real-time online strategy game, and won a battle in the " + mapname + " map. I had " + lifetimepeaktroops + " troops and captured " + lifetimepeakterritories + " territories at my peak. Play it at https://emblitz.com\n\n#Emblitz";
                        setTimeout(function() {
                            document.getElementById("endscreen").style.opacity = "1";
                        }, 100);
                    }
                } else if(response.lobbytimer) {
                    lobbycountdown = response.lobbytimer;
                    document.getElementById("timeramount").innerText = lobbycountdown;
                } else if(response.playermedalchange && response.playermedalchange === uid) {
                    if(response.amount === "none") {
                        document.getElementById("e-medal-change").style.display = "none";
                    } else {
                        document.getElementById("e-medal-change").style.display = "block";
                        let medalPlurality = 's';
                        let medalSign = '+';
                        if(response.amount == 1){
                            medalPlurality = '';
                        }
                        if(response.amount < 0){
                            medalSign = '';
                        }
                        document.getElementById("e-medals").innerText = `${medalSign}${response.amount} medal${medalPlurality}`;
                    }
                } else if(response.playerxpchange && response.playerxpchange === uid) {
                    if(response.amount === "none") {
                        //document.getElementById("e-medal-change").style.display = "none";
                    } else {
                        //document.getElementById("e-medal-change").style.display = "block";
                        console.log(response.amount);
                    }
                }
            }
        });
    }).catch(function(error) {
        notification("error", "Error", error, 6);
        exitLobby();
    });
}

function share() {
    if (parent.navigator.clipboard && window.isSecureContext) {
        parent.navigator.clipboard.writeText(sharedetails);
    } else {
        //insecure copy paste for development purposes
        let textArea = document.createElement("textarea");
        textArea.value = sharedetails;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
    }
    notification("notify", "Copied to clipboard!", "Copied your game stats to your clipboard. Feel free to share them whereever! Thanks for playing Emblitz.", 10);
}

function spectategame() {
    document.getElementById("endscreen").style.opacity = "0";
    setTimeout(function() {
        document.getElementById("endscreen").style.display = "none";
        notification("notify", "Spectating", "You're now spectating the game.", 6);
    }, 3000);
}

function leavegame() {
    websocket.close();
    for (let i=0; i<alltimeouts.length; i++) {
        clearTimeout(alltimeouts[i]);
    }
    document.getElementById("troopseconds").innerText = "10";
    resetAll();
    document.getElementById("mapl2").innerHTML = "";
    document.getElementById("mapsvgbox").remove();
    document.getElementById("lobbyscreen").style.display = "block";
    document.getElementById("gamescreen").style.display = "none";
    document.getElementById("gamelobby").style.display = "none";
    document.getElementById("lobbyptable").innerHTML = "";

    document.getElementById("infobar").innerHTML = `<DIV CLASS="infobar-bg"></DIV>
    <DIV CLASS="ibmain-text" ID="statustext"><B>Deploy Phase:</B> Select a starting point</DIV>
    <DIV CLASS="timer-bg"><DIV CLASS="timer-line" ID="eventstimer"></DIV></DIV>`;
    document.getElementById("infobar").style.top = "-70px";
    document.getElementById("eventstimer").style.transitionDuration = "0.3s";
    document.getElementById("eventstimer").style.width = "0%";
    document.getElementById("troopstimer").style.transitionDuration = "0.5s";
    document.getElementById("troopstimer").style.width = "0%";

    document.getElementById("endscreen").style.opacity = "0";
    document.getElementById("endscreen").style.display = "none";

    inithomepage()
}

function toggleqcvisibility() {
    if(document.getElementById("quitconfirm").style.display === "block") {
        document.getElementById("quitconfirm").style.display = "none";
    } else {
        document.getElementById("quitconfirm").style.display = "block"
    }
}

function changeMapSelect(direction) {
    if(direction === "left") {
        mapselectindex--;
        if(mapselectindex < 0) {
            mapselectindex = mapDescriptions.length-1;
        }
    } else {
        mapselectindex++;
        if(mapselectindex >= mapDescriptions.length) {
            mapselectindex = 0;
        }
    }

    mapselectedvalue = mapDescriptions[mapselectindex][3];
    
    document.getElementById("s-title").innerText = mapDescriptions[mapselectindex][0];
    document.getElementById("s-description").innerText = mapDescriptions[mapselectindex][1];
    document.getElementById("s-image").src = mapDescriptions[mapselectindex][2];
    if(mapDescriptions[mapselectindex][4]) {
        document.getElementById("s-maxplayers").style.display = "block";
        document.getElementById("s-maxplayers").innerText = "Max players: " + mapDescriptions[mapselectindex][4];
    } else {
        document.getElementById("s-maxplayers").style.display = "none";
    }

    localStorage.setItem("map", mapDescriptions[mapselectindex][3]);
}

function exitLobby() {
    if(websocket) {
        websocket.close();
    }
    for (let i=0; i<alltimeouts.length; i++) {
        clearTimeout(alltimeouts[i]);
    }
    clearInterval(lobbytimeinterval);
    lobbycountdown = 20;
    document.getElementById("lobbyscreen").style.display = "block";
    document.getElementById("gamescreen").style.display = "none";
    document.getElementById("gamelobby").style.display = "none";
}

function hidetutorialtt() {
    document.getElementById('t-tooltip').style.right = "-350px";
    setTimeout(function() {
        document.getElementById('t-tooltip').style.display = "none";
    }, 300)
}

function showtutorialtt() {
    document.getElementById("t-tooltip").style.display = "block";
    setTimeout(function() {
        document.getElementById("t-tooltip").style.right = "10px";
    }, 100);
}

function togglelb() {
    if(showlb == false) {
        showlb = true;
        document.getElementById("togglelb").style.right = "230px";
        document.getElementsByClassName("leaderboard")[0].style.display = "block";
        document.getElementById("togglelb-inner").innerHTML = `<I CLASS="fa fa-angle-double-right"></I>`;
    } else {
        showlb = false;
        document.getElementById("togglelb").style.right = "0";
        document.getElementsByClassName("leaderboard")[0].style.display = "none";
        document.getElementById("togglelb-inner").innerHTML = `<I CLASS="fa fa-angle-double-left"></I>`;
    }
}

function gameTutorial() {

}