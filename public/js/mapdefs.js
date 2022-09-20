function makemap(data) {
    document.getElementById("maploading").innerHTML = "";
    document.getElementById("svg-map-bg").innerHTML += data;
    for(let i=0; i<document.getElementsByClassName("map-region").length; i++) {
        document.getElementsByClassName("map-region")[i].setAttribute("data-color", "default");
    }
    initializeMap();
}

const mapnames = {
    miniworld: "Micro World",
    michigan: "Michigan",
    florida: "Florida"
}

const mapDescriptions = [
    ["Random Map", "You'll join a game with a random map. It could be anything, so be prepared!", "./images/randompreview.JPG", "random", null],
    ["Micro World Map", "Battle for the entire globe! Oh wait... it got shrunken down a little. Who did it?", "./images/miniworldpreview.JPG", "miniworld", 3],
    ["Michigan", "Michigan's cities broke apart for some reason. Can you unite them before Ohio invades?", "./images/michiganpreview.JPG", "michigan", 6],
    ["Florida", "Florida man started a war again. Can you stop it before it gets out of hand?", "./images/floridapreview.JPG", "florida", 6]
]

const colorData = {
    "default": {"normal": "#ffe2bf", "darken": "#ffc580"},
    "red": {"normal": "#de4343", "darken": "#de2323"},
    "orange": {"normal": "#e38d24", "darken": "#bf6b04"},
    "yellow": {"normal": "#dec433", "darken": "#c2a710"},
    "green": {"normal": "#41b037", "darken": "#0e9602"},
    "blue": {"normal": "#4367ab", "darken": "#073ea6"},
    "purple": {"normal": "#b240b8", "darken": "#83008a"}
}