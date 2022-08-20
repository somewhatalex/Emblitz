window.addEventListener("load", function() {
    setAvatarColor();
});

function setAvatarColor() {
    document.getElementById("avatar-frame").style.border = "5px solid " + playercolor;
    document.getElementById("avatar-frame").style.background = colorData[playercolor].normal;
}

function editPlayerColor(color) {
    fetch("/api", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({action: "editplayercolor", color: color})}).then(response => {
        response.json().then(function(result) {
            if(response.error) {
                console.error("[SETTINGS] Error: invalid parameters");
                //on error run code here
            }
            console.log("[SETTINGS] Updated player color");

            //on success run code here
        });
    });
};