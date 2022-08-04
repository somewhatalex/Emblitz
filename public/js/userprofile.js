window.addEventListener("load", function() {
    fetch("/api", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({action: "getuserprofile", username: username})}).then(response => {
        response.json().then(function(result) {
            console.log(result);
        });
    });
});

const userWins = document.createElement("div");

ubody.append(userWins);