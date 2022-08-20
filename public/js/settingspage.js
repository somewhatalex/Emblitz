var selectedColor;

window.addEventListener("load", function() {
    setAvatarColor();
});

function setAvatarColor() {
    document.getElementById("avatar-frame").style.border = "5px solid " + playercolor;
    document.getElementById("avatar-frame").style.background = colorData[playercolor].normal;
}

function setColor(color) {
    selectedColor = color;
    let collection = document.getElementsByClassName("selected-button");
    for (let i = 0; i < collection.length; i++) {
        collection[i].classList.remove("selected-button");
      }
    switch(color){
        case "red":
            collection = document.getElementByClassName("s-cs-red");
            break;
        case "orange":
            collection = document.getElementByClassName("s-cs-orange");
            break;
        case "yellow":
            collection = document.getElementByClassName("s-cs-yellow");
            break;
        case "green":
            collection = document.getElementByClassName("s-cs-green");
            break;
        case "blue":
            collection = document.getElementByClassName("s-cs-blue");
            break;
        default:
            collection = document.getElementByClassName("s-cs-purple");
            break;
    }
    collection.classList.add("selected-button");
}

function callSave(){
    editPlayerColor(selectedColor);
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