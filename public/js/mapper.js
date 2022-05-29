function makemap(data) {
    document.getElementById("maploading").innerHTML = "";
    document.getElementById("svg-map-bg").innerHTML += data;
    initializeMap();
}