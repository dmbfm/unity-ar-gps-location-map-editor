let mapZoom = 9;
let mapCenter = [-74.50, 40];
let map;
let currentPointLatLng = [0, 0];

let appData = [];

let selectedPointId = -1;
let pointsList;
let nameInputEl;
let lngValueEl;
let latValueEl;
let addMarkerButton;
let removeMarkerButton;
let downloadJsonButton;
let dataIdCounter = 0;
let tempMarker;
let selectetMarker;
let idLabelEl;
let altitudeEl;
let markers = [];

function getElementById(id) {
	const el = document.getElementById(id);

	if (!el) {
		throw new Error("Element not found: " + id);
	}

	return el;
}

function main() {
	console.log("Starting Unity AR+GPS Location Map Editor.");

	// const mapDivContainer = document.createElement('div');
	const mapDivContainer = getElementById('map-containter');
	mapDivContainer.style.height = "500px";
	mapDivContainer.id = "map-containter";

	addMarkerButton = getElementById("add-marker-button");
	latValueEl = getElementById("lat-value");
	lngValueEl = getElementById("lng-value");
	idLabelEl = getElementById("id-value");
	pointsList = getElementById("points-list");
	nameInputEl = getElementById("name-input");
	altitudeEl = getElementById("altitude-input");

	removeMarkerButton = getElementById("remove-marker-button");
	downloadJsonButton = getElementById("download-json-button");
	removeMarkerButton.disabled = true;
	//document.body.appendChild(mapDivContainer);

	if (!window['mapboxgl'])
	{
		console.error('Leaflef was not loaded! Aborting.');
		return;
	}

	mapboxgl.accessToken = 'pk.eyJ1IjoiZG1iZm0iLCJhIjoiY2ozMmQ0aDM1MDAydzJxcG8ydHp5eTF0dSJ9.pIsL_CtN49ntiwm73C1IfA';
	map = new mapboxgl.Map({
		container: 'map-containter', // container id
		style: 'mapbox://styles/mapbox/streets-v11', // stylesheet location
		center: mapCenter, // starting position [lng, lat]
		zoom: mapZoom // starting zoom
	});

	selectetMarker = new mapboxgl.Marker({ color: 'green '})
		.setLngLat([0, 0])
		.addTo(map);
	selectetMarker.getElement().style.zIndex = 1000;
	selectetMarker.getElement().addEventListener('click', e => {
			e.preventDefault();
			e.stopPropagation();
		});

	hideMarker(selectetMarker);

	// TODO: Maybe get user location elsewhere, and center the map via code,
	//       and/or save last user location.
	map.addControl(new mapboxgl.GeolocateControl({
		positionOptions: {
			enableHighAccuracy: true
		},
		trackUserLocation: false
	}));

	map.on('click', e => {
		currentPointLatLng = [e.lngLat.lng, e.lngLat.lat];
		latValueEl.innerText = currentPointLatLng[0];
		lngValueEl.innerText = currentPointLatLng[1];

		selectedPointId >= 0 && selectPoint(-1);
		addTempMarkerAt(currentPointLatLng);
	});


	addMarkerButton.addEventListener('click', () => {
		let marker = new mapboxgl.Marker()
			.setLngLat(currentPointLatLng)
			.addTo(map);

		let id = dataIdCounter;
		marker.getElement().addEventListener('click', e => {
			e.preventDefault();
			e.stopPropagation();

			selectPoint(id);
		});

		markers.push({
			marker,
			id
		});

		appData.push({
			location: [currentPointLatLng[0], currentPointLatLng[1]],
			altitude: altitudeEl.value,
			name: nameInputEl.value,
			id
		});
		dataIdCounter++;


		renderPointsList();

		selectPoint(id);
		removeTempMarker();

		console.log(appData);
	});

	nameInputEl.addEventListener('input', e => {
		if (selectedPointId < 0) {
			return;
		}

		const data = getDataEntryById(selectedPointId);
		data.name = e.target.value;

		renderPointsList();
	});

	altitudeEl.addEventListener('input', e => {
		if (selectedPointId < 0) {
			return;
		}

		const data = getDataEntryById(selectedPointId);
		data.altitude = e.target.value;
	})

	removeMarkerButton.addEventListener('click', () => {
		if (selectedPointId < 0) {
			return;
		}

		let index = getIndexOfDataEntryById(selectedPointId);
		appData.splice(index, 1);

		let marker = markers[index];
		marker.marker.remove();
		markers.splice(index, 1);

		renderPointsList();
		selectPoint(-1);
	})

	downloadJsonButton.addEventListener('click', () => {
		console.log(JSON.stringify(appData));
	});

}

function renderPointsList() {
	pointsList.innerHTML = "";

	for (let i = 0; i < appData.length; i++) {
		const data = appData[i];
		const li = document.createElement('li');
		li._app_index = data.id;
		li.addEventListener('click', e => selectPoint(e.target._app_index));
		li.innerText = "{" + data.name + "," + " (" + data.location[0] + ", " + data.location[1] + ")}";
		pointsList.appendChild(li);
	}
}

function selectPoint(id) {
	if (id < 0) {
		selectedPointId = -1;
		nameInputEl.value = "";
		altitudeEl.value = 0;
		addMarkerButton.disabled = false;
		removeMarkerButton.disabled = true;
		hideMarker(selectetMarker);
	} else {
		let data = getDataEntryById(id);

		nameInputEl.value = data.name;
		altitudeEl.value = data.altitude;
		idLabelEl.innerText = data.id;
		latValueEl.innerText = data.location[0];
		lngValueEl.innerText = data.location[1];

		addMarkerButton.disabled = true;
		removeMarkerButton.disabled = false;
		selectedPointId = id;

		selectetMarker.setLngLat(data.location);
		unhideMarker(selectetMarker);
		window['selectetMarker'] = selectetMarker;
	}
}

function addTempMarkerAt(loc) {
	removeTempMarker();

	tempMarker = new  mapboxgl.Marker({ color: 'red' })
			.setLngLat(loc)
			.addTo(map);
}

function removeTempMarker() {
	if (tempMarker) {
			tempMarker.remove();
			tempMarker = null;
	}
}

function getDataEntryById(id) {
	return getArrayEntryById(appData, id);
}

function getMarkerById(id) {
	return getArrayEntryById(markers, id);
}

function hideMarker(marker) {
	selectetMarker.getElement().style.visibility = "hidden";
}

function unhideMarker(marker) {
	selectetMarker.getElement().style.visibility = "visible";
}

function getArrayEntryById(arr, id) {
		let data;
	for (let i = 0; i < arr.length; i++) {
		let item = arr[i];

		if (item.id == id) {
			data = item;
			break;
		}
	}

	if (!data) {
		console.error("[selectPoint]: Invalid id = " + id);
		return;
	}

	return data;
}

function getIndexOfDataEntryById(id) {
	let index = -1;
	for (let i = 0; i < appData.length; i++) {
		let item = appData[i];

		if (item.id == id) {
			index = i;
			break;
		}
	}

	if (index < 0) {
		console.error("[selectPoint]: Invalid id = " + id);
		return;
	}

	return index;
}

main();