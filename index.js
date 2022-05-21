document.getElementById('coords').innerHTML="helloworld";

let coords = {
    lat: null,
    lon: null
}

const options = {
    enableHighAccuracy: true
}

navigator.geolocation.getCurrentPosition(
    function(position) {
        coords.lat = position.coords.latitude;
        coords.lon = position.coords.longitude;

        document.getElementById('coords').innerHTML = JSON.stringify(coords);

    },
    function(error) {
        alert(error.message);
        console.log(error);
    },
    options
)