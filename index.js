function initializeMap() {
    var mapelements = document.getElementsByClassName("map-region");
    for(let i=0; i<mapelements.length; i++) {
        mapelements[i].setAttribute("fill", "#ffe2bf");
        mapelements[i].style.cursor = "pointer";
        mapelements[i].addEventListener("mouseover", function(d) {
            let countryCode = mapelements[i].getAttribute("data-code");
            console.log(countryCode);
            mapelements[i].setAttribute("fill", "#ffc580");
            let area = d.currentTarget;
            area.style.stroke = "#ffffff";
            area.style.strokeWidth = "5px";
            area.style.strokeLinejoin = "round";
        });
        mapelements[i].addEventListener("mouseleave", function(d) {
            mapelements[i].setAttribute("fill", "#ffe2bf");
            let area = d.currentTarget;
            area.style.stroke = "none";
        });
    }
}