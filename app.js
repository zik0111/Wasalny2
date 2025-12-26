const arrivalSound = new Audio('./alert.mp3');
arrivalSound.preload = 'auto';
arrivalSound.volume = 1.0;
let audioUnlocked = false;

if ('vibrate' in navigator) {
    navigator.vibrate([300, 150, 300]);
}

let map, destinationMarker, currentLocationMarker, trackingCircle;
let watchId = null;
let destination = null;
let notificationRadius = 500;
let hasNotified = false;

function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: 30.0444, lng: 31.2357 },
        zoom: 13
    });

    map.addListener('click', (e) => {
        setDestination(e.latLng.lat(), e.latLng.lng());
    });

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            updateCurrentLocation(pos.coords.latitude, pos.coords.longitude);
            map.setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        });
    }
}

function setDestination(lat, lng) {
    destination = { lat, lng };

    document.getElementById('destLat').value = lat.toFixed(6);
    document.getElementById('destLng').value = lng.toFixed(6);

    if (destinationMarker) destinationMarker.setMap(null);
    if (trackingCircle) trackingCircle.setMap(null);

    destinationMarker = new google.maps.Marker({
        position: { lat, lng },
        map: map
    });

    trackingCircle = new google.maps.Circle({
        strokeColor: "#1097b9",
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: "#1097b9",
        fillOpacity: 0.2,
        map: map,
        center: { lat, lng },
        radius: notificationRadius
    });

    hasNotified = false;
}

function updateCurrentLocation(lat, lng) {
    if (!currentLocationMarker) {
        currentLocationMarker = new google.maps.Marker({
            position: { lat, lng },
            map: map,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: '#000',
                fillOpacity: 1,
                strokeWeight: 2
            }
        });
    } else {
        currentLocationMarker.setPosition({ lat, lng });
    }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) ** 2 +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) ** 2;

    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function startTracking() {
    if (!destination) {
        alert('Select a destination first');
        return;
    }

    if (!audioUnlocked) {
        arrivalSound.play()
            .then(() => {
                arrivalSound.pause();
                arrivalSound.currentTime = 0;
                audioUnlocked = true;
                console.log('Audio unlocked');
            })
            .catch(err => console.warn('Audio unlock failed:', err));
    }

    watchId = navigator.geolocation.watchPosition(
        pos => {
            const { latitude, longitude } = pos.coords;
            updateCurrentLocation(latitude, longitude);

            const distance = calculateDistance(
                latitude, longitude,
                destination.lat,
                destination.lng
            );

            updateStatus(distance);
        },
        err => console.error(err),
        { enableHighAccuracy: true }
    );
}

function stopTracking() {
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }

    arrivalSound.pause();
    arrivalSound.currentTime = 0;
    document.getElementById('statusCard').style.display = 'none';
    hasNotified = false;
}

function updateStatus(distance) {
    const card = document.getElementById('statusCard');
    card.style.display = 'block';

    document.getElementById('distanceValue').textContent =
        distance < 1000
            ? `${Math.round(distance)}m`
            : `${(distance / 1000).toFixed(2)}km`;

    if (distance <= notificationRadius) {
        card.classList.add('active');
        document.getElementById('statusValue').textContent = 'Arrived!';

        if (!hasNotified) {
            hasNotified = true;
            arrivalSound.currentTime = 0;
            arrivalSound.play().catch(err => console.error('Sound failed:', err));

            if (navigator.vibrate) {
                navigator.vibrate([300, 150, 300]);
            }

            showNotification('وصلت المكان');
        }
    } else {
        card.classList.remove('active');
        document.getElementById('statusValue').textContent = 'En Route';
    }
}

function showNotification(msg) {
    const badge = document.getElementById('notificationBadge');
    badge.textContent = msg;
    badge.classList.add('show');
    setTimeout(() => badge.class
