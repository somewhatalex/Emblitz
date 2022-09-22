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
    let distance = getDistance(start, target);
    start = start.getAttribute("data-code");
    target = target.getAttribute("data-code");
    console.log("[DEBUG] Sent airlift from " + start + " to " + target);
    websocket.send(JSON.stringify({"action": "powerup-airlift", "start": start, "target": target, "distance": distance, "uid": uid, "roomid": roomid, "gid": gid}));
    canMoveTroops = true;
}

//airlift animation for the plane only
//todo: add parachute and deploy animations
function airliftPlaneAnimation(start, target) {
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

    let deltax = Math.cos(angle * (Math.PI / 180)) * 50;
    let deltay = Math.sin(angle * (Math.PI / 180)) * 50;

    //and then style it and spawn it in
    plane.style.transform = "rotate(" + (angle + 180) + "deg)";
    plane.style.left = x + "px";
    plane.style.top = y + "px";

    plane.style.width = "150px";
    plane.style.marginTop = "-100px";
    plane.style.marginLeft = "-100px";

    
    document.getElementById("mapl2").append(plane);

    x -= deltax;
    y -= deltay;
    plane.style.left = x + "px";
    plane.style.top = y + "px";

    let planeinterval = setInterval(function() {
        //vector calculation to determine change in x and y
        x -= deltax;
        y -= deltay;

        plane.style.left = x + "px";
        plane.style.top = y + "px";

        iterations++;
        if(iterations > 55) {
            clearInterval(planeinterval);
            plane.remove();
        }
    }, 500);
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