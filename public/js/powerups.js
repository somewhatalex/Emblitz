/*note: DO NOT turn the powerup funtions into a class.
The intended structure of this file is to have
several functions that'll synchronously run
powerups
*/
var canMoveTroops = true;
var powerupType = null;
let p_target1 = null;
let p_target2 = null;

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
        document.getElementById("statustext").innerHTML = "<B>Airlift Powerup</B> Select a starting territory that you own to move troops from.";
    }
}

//requests airlift (animation, ws message)
function sendAirlift(start, target) {
    console.log(start);
    console.log(target)
    console.log("[DEBUG] Sent airlift from " + start.getAttribute("data-code") + " to " + target.getAttribute("data-code"));
    canMoveTroops = true;
}