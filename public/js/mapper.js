function makemap(data) {
    document.getElementById("maploading").innerHTML = "";
    document.getElementById("svg-map-bg").innerHTML += data;
    for(let i=0; i<document.getElementsByClassName("map-region").length; i++) {
        document.getElementsByClassName("map-region")[i].setAttribute("data-color", "default");
    }
    initializeMap();
}