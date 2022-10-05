/*note: DO NOT turn the powerup funtions into a class.
The intended structure of this file is to have
several functions that'll synchronously run
powerups
*/
var canMoveTroops = true;
var powerupType = null;
let p_target1 = null;
let p_target2 = null;

//preload plane asset
var planeAsset = new Image();
planeAsset.src = "./images/assets/airliftplane.svg";
planeAsset.className = "powerups-airplane";
planeAsset.style.position = "absolute";

//preload parachute asset
var parachuteAsset = new Image();
parachuteAsset.src = "./images/assets/airliftparachute.svg";
parachuteAsset.className = "powerups-parachute";
parachuteAsset.style.position = "absolute";

//random number generator
function randomnumber(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

//do this at the start of every new round
function resetPowerupBars() {
    //reset all the powerup buttons
    let powerupbuttons = document.getElementsByClassName("powerup-btn");
    for(let i=0; i<powerupbuttons.length; i++) {
        powerupbuttons[i].getElementsByClassName("powerup-recharge")[0].style.transition = "0.2s linear";
        powerupbuttons[i].getElementsByClassName("powerup-recharge")[0].style.height = "0%";
        powerupbuttons[i].style.cursor = "no-drop";
        powerupbuttons[i].setAttribute("disabled", "disabled");
    }

    //disable the red notification icons
    let powerupnotify = document.getElementsByClassName("powerup-notify");
    for(let i=0; i<powerupnotify.length; i++) {
        powerupnotify[i].style.display = "none";
    }
}

function resetPowerupCooldowns() {
    triggerPowerupCooldown("airlift", 20);
}

//function to control the powerup button timers
//duration is in seconds
//call this function whenever a powerup is used
function triggerPowerupCooldown(item, duration) {
    document.getElementById(item + "-notify-icon").style.display = "none";
    duration = duration*1000; //convert to ms

    //get the button that triggers the powerup
    let powerupbutton = document.getElementById(item + "-powerup");

    //slight timeout to trigger css
    setTimeout(function() {
        powerupbutton.getElementsByClassName("powerup-recharge")[0].style.transition = "0.2s linear";
        powerupbutton.getElementsByClassName("powerup-recharge")[0].style.height = "0%";
    }, 50);
    
    powerupbutton.style.cursor = "no-drop";
    powerupbutton.setAttribute("disabled", "disabled");

    setTimeout(function() {
        powerupbutton.getElementsByClassName("powerup-recharge")[0].style.transition = (duration-250)/1000 + "s linear"; //subtract 100ms to account for css trick delay
        powerupbutton.getElementsByClassName("powerup-recharge")[0].style.height = "100%";
    }, 250); //accounts for previous timeout and 0.2s transition
}

//powerup timing is handled server-side
function syncPowerupCooldown(item) {
    let powerupbutton = document.getElementById(item + "-powerup");
    powerupbutton.removeAttribute("disabled");
    powerupbutton.style.cursor = "pointer";
    document.getElementById(item + "-notify-icon").style.display = "block";
    powerupbutton.getElementsByClassName("powerup-recharge")[0].style.transition = "0.2s linear";
    setTimeout(function() {
        powerupbutton.getElementsByClassName("powerup-recharge")[0].style.height = "100%";
    }, 50);
}

//triggers airlift
function airlift() {
    if(attackPhase === "attack") {
        canMoveTroops = false;
        powerupType = "airlift";
        selectedRegion = "";

        //show the notification
        document.getElementById("eventstimer").style.display = "none";
        document.getElementById("eventstimer").style.width = "0%";
        infobar("show");
        document.getElementById("statustext").innerHTML = "<B>Airlift Powerup:</B> Select a starting territory that you own to move troops from.";
    }
}

//requests airlift (animation, ws message)
function sendAirlift(start, target) {
    triggerPowerupCooldown("airlift", 20);
    let plane_id = randomnumber(0, 99999);
    let distance = getDistance(start, target);
    start = start.getAttribute("data-code");
    target = target.getAttribute("data-code");
    console.log("[DEBUG] Sent airlift from " + start + " to " + target);

    websocket.send(JSON.stringify({"action": "powerup-airlift", "start": start, "target": target, "distance": distance, "plane_id": plane_id, "uid": uid, "roomid": roomid, "gid": gid, "amount": Math.round(document.getElementById("troopslider").value)}));
    canMoveTroops = true;
}

//airlift animation for the plane only
//todo: add parachute and deploy animations
function airliftPlaneAnimation(start, target, id) {
    let iterations = 0;

    //calculate starting location
    var off1 = getOffset(start);
    var x = off1.left + off1.width + 20;
    var y = off1.top + off1.height + 20;

    //get angle to the destination
    let angle = getAngle(start, target);

    //clone a new instance of the plane
    let plane = planeAsset.cloneNode(true);

    if(angle < 0) {
        angle = 360 + angle;
    }

    let deltax = Math.cos(angle * (Math.PI / 180)) * 60;
    let deltay = Math.sin(angle * (Math.PI / 180)) * 60;

    //attach unique id for plane
    plane.id = "powerup_plane_" + id;

    //and then style it and spawn it in
    plane.style.transform = "rotate(" + (angle + 180) + "deg)";
    plane.style.left = x + "px";
    plane.style.top = y + "px";

    plane.style.width = "20px";
    plane.style.marginTop = "-10px";
    plane.style.marginLeft = "-10px";

    plane.style.opacity = 0;

    setTimeout(function() {
        plane.style.width = "210px";
        plane.style.marginTop = "-105px";
        plane.style.marginLeft = "-105px";
        plane.style.opacity = 1;
    }, 50);

    
    document.getElementById("mapl1").append(plane);

    x -= deltax;
    y -= deltay;
    plane.style.left = x + "px";
    plane.style.top = y + "px";

    let planeinterval = setInterval(function() {
        //vector calculation to determine change in x and y
        x = parseInt(plane.style.left.replace("px", ""));
        y = parseInt(plane.style.top.replace("px", ""));
        x -= deltax;
        y -= deltay;

        plane.style.left = x + "px";
        plane.style.top = y + "px";

        iterations++;
        if(iterations > 65) {
            clearInterval(planeinterval);
            plane.remove();
        }
    }, 500);
}

function airliftParachuteAnimation(x, y) {
    for(let i=0; i<2; i++) {
        //clone a new parachute asset
        let parachute = parachuteAsset.cloneNode(true);
        parachute.style.transform = "rotate(" + randomnumber(0, 30) + "deg)";
        parachute.style.left = x + "px";
        parachute.style.top = y + "px";

        parachute.style.width = "20px";
        parachute.style.marginTop = "-10px";
        parachute.style.marginLeft = "-10px";

        parachute.style.opacity = 0;

        //once it's styled, prepend it to the div (prepend to make it appear behind planes)
        document.getElementById("mapl1").prepend(parachute);

        //slight delay to trigger parachute deploy animation
        setTimeout(function() {
            parachute.style.width = "80px";
            parachute.style.marginTop = "-40px";
            parachute.style.marginLeft = "-40px";

            //randomize origin to stagger parachutes
            x += randomnumber(-35, 35);
            y += randomnumber(-35, 35);
            parachute.style.left = x + "px";
            parachute.style.top = y + "px";

            parachute.style.opacity = 1;
            setTimeout(function() {
                parachute.style.transition = "4s linear";
                parachute.style.width = "30px";
                parachute.style.marginTop = "-15px";
                parachute.style.marginLeft = "-15px";
            }, 950);
        }, 50);

        //delete the parachute after 5 seconds
        setTimeout(function() {
             parachute.remove();       
        }, 5000);
    }
}

//get the angle between 2 territories
function getAngle(div1, div2) {
    var off1 = getOffset(div1);
    var off2 = getOffset(div2);
    var x1 = off1.left + off1.width+20;
    var y1 = off1.top + off1.height+20;
    var x2 = off2.left + off2.width+20;
    var y2 = off2.top + off2.height+20;
    return Math.atan2((y1 - y2), (x1 - x2)) * (180 / Math.PI);
}

//find the distance between 2 territories (ie. for airlift time calculation)
function getDistance(div1, div2) {
    var off1 = getOffset(div1);
    var off2 = getOffset(div2);
    var x1 = off1.left + off1.width+20;
    var y1 = off1.top + off1.height+20;
    var x2 = off2.left + off2.width+20;
    var y2 = off2.top + off2.height+20;
    //pythag theorum
    return Math.sqrt(((x2 - x1) * (x2 - x1)) + ((y2 - y1) * (y2 - y1)));
}