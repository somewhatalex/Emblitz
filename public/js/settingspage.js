window.addEventListener("load", function() {
    setAvatarColor();

    setColor(playercolor, document.getElementById(playercolor + "-colorselect"));
});

function setAvatarColor() {
    document.getElementById("avatar-frame").style.border = "5px solid " + playercolor;
    document.getElementById("avatar-frame").style.background = colorData[playercolor].normal;
}

function setColor(color, button) {
    playercolor = color;
    let colorbuttons = document.getElementsByClassName("s-cs-button");
    for (let i = 0; i < colorbuttons.length; i++) {
        colorbuttons[i].classList.remove("cs-selected");
    }
    button.classList.add("cs-selected");

    setAvatarColor();
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

function submitUserSettings() {
    if(playercolor !== or_playercolor) {
        editPlayerColor(playercolor);
    } else {
        notification("notify", "Saved changes", "Your changes were successfully saved!", 5);
    }
}

function editPlayerColor(color) {
    document.getElementById("save-button").innerText = "Saving...";
    document.getElementById("save-button").setAttribute("disabled", "disabled");
    document.getElementById("save-button").style.cursor = "no-drop";
    fetch("/api", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({action: "editplayercolor", color: color})}).then(response => {
        response.json().then(function(result) {
            document.getElementById("save-button").innerText = "Save changes";
            document.getElementById("save-button").removeAttribute("disabled");
            document.getElementById("save-button").style.cursor = "pointer";

            if(response.status == 429) {
                console.error("[SETTINGS] Error: invalid parameters");
                
                notification("error", "Error saving changes", "You're saving your changes too quickly! Please try again in a minute.", 4);
                return;
            }
            console.log("[SETTINGS] Updated player color");

            or_playercolor = color;

            notification("notify", "Saved changes", "Your changes were successfully saved!", 3);
        });
    });
};

window.addEventListener("beforeunload", function (e) {
    let unsavedchanges = false;

    if(or_playercolor !== playercolor) {
        unsavedchanges = true;
    }

    console.log(unsavedchanges)

    if(unsavedchanges) {
        var confirmationMessage = "You still have unsaved settings! If you leave the page, they'll be lost. Are you sure?";

        (e || window.event).returnValue = confirmationMessage
        return confirmationMessage;
    }
});

function promptLogout() {
    document.getElementById("logout-confirm").style.display = "block";
    setTimeout(function() {
        document.getElementById("logout-confirm").style.opacity = 1;
    }, 50);
}

window.onclick = function(event) {
    if (event.target === document.getElementById("logout-confirm") || event.target === document.getElementById("lc-exit") || event.target === document.getElementById("cancellogout")) {
        document.getElementById("logout-confirm").style.display = "none";
    }
}

function logoutUser() {
    document.getElementById("logout-confirm").style.display = "none";
    notification("notify", "Logging out...", "Logging you out, please wait.", 100);

    fetch("/api", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({action: "logoutuser"})}).then(function() {
        window.location.href = "../";
    });
}