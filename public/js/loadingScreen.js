var loadingtimeout = null;

function showLoadingScreen() {
    return new Promise((resolve) => {
        document.getElementById("loadingscreen").style.display = "block";

        setTimeout(function() {
            document.getElementById("loadingscreen").style.opacity = "1";
        }, 50);

        loadingtimeout = setTimeout(function() {
            document.getElementById("lobbyscreen").style.display = "none";
        }, 550);

        document.getElementById("loadingscreen").innerHTML = `
        <DIV CLASS="ls-bg"></DIV>
        <DIV CLASS="ls-inner">
            <DIV CLASS="ls-title">Joining game</DIV>
            <DIV CLASS="ls-loader-container"><DIV CLASS="ls-loader"></DIV></DIV>
        </DIV>`;
        setTimeout(function() {
            resolve("ok");
        }, 500);
    });
}

function hideLoadingScreen(haserror) {
    if(haserror) {
        clearTimeout(loadingtimeout);
        document.getElementById("lobbyscreen").style.display = "block";
    }
    document.getElementById("loadingscreen").style.opacity = "0";
    setTimeout(function() {
        document.getElementById("loadingscreen").style.display = "none";
        document.getElementById("loadingscreen").innerHTML = "";
    }, 500);
}