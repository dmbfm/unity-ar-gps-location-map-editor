let mapZoom = 9;
let mapCenter = [-74.50, 40];
let map;
let currentPointLatLng = [0, 0];

let appData = [];

let selectedPointId = -1;
let selectedPointdata;
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
let altitudeModeEl;
let removeAllMarkersButton;
let movementSmoothingInputEl;
let maxNumberOfLocationUpdatesEl;
let useMovingAverageInputEl;
let hideObjectUtilItIsPlacedEl;
let markers = [];


// TODO: Drag selected marker and change lat/lng
// TODO: Separate into datasets
// TODO: Add users/backend

function pipeInputToSelectedPointData(el, propName, targetPropName = 'value') {
	el.addEventListener('input', e => {
		if (!selectedPointdata) {
			return;
		}

		if (selectedPointdata[propName] == undefined) {
			throw new Error("[pipeInputToSelectedPointData] Invalid propName: " + propName);
		}

		selectedPointdata[propName] = e.target[targetPropName];
		renderPointsList();
	})
}


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
	altitudeModeEl = getElementById("altitude-mode-input");
	movementSmoothingInputEl = getElementById("movement-smoothing-input");
	maxNumberOfLocationUpdatesEl = getElementById("max-number-location-updates-input");
	useMovingAverageInputEl = getElementById("use-moving-average-input");
	hideObjectUtilItIsPlacedEl = getElementById("hide-object-until-placed-input");

	removeMarkerButton = getElementById("remove-marker-button");
	removeAllMarkersButton = getElementById("clear-all-button");
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

		selectedPointdata && selectPoint(-1);
	
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
			id,
			location: [currentPointLatLng[0], currentPointLatLng[1]],
			altitude: altitudeEl.value,
			altitudeMode: altitudeModeEl.value,
			name: nameInputEl.value,
			movementSmoothing: movementSmoothingInputEl.value,
			maxNumberOfLocationUpdates: maxNumberOfLocationUpdatesEl.value,
			useMovingAverage: useMovingAverageInputEl.checked,
			hideObjectUtilItIsPlaced: hideObjectUtilItIsPlacedEl.checked
		});
		dataIdCounter++;


		renderPointsList();

		selectPoint(id);
		removeTempMarker();

		console.log(appData);
	});

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

	removeAllMarkersButton.addEventListener('click', () => {
		appData = [];

		for (let i = 0; i < markers.length; i++) {
			markers[i].marker.remove();
		}

		markers = [];

		selectPoint(-1);
	});

	pipeInputToSelectedPointData(nameInputEl, 'name');
	pipeInputToSelectedPointData(altitudeEl, 'altitude');
	pipeInputToSelectedPointData(movementSmoothingInputEl, 'movementSmoothing');
	pipeInputToSelectedPointData(altitudeModeEl, 'altitudeMode');
	pipeInputToSelectedPointData(maxNumberOfLocationUpdatesEl, 'maxNumberOfLocationUpdates');
	pipeInputToSelectedPointData(useMovingAverageInputEl, "useMovingAverage", "checked");
	pipeInputToSelectedPointData(hideObjectUtilItIsPlacedEl, "hideObjectUtilItIsPlaced", "checked");

	selectPoint(-1);
}

function renderPointsList() {
	pointsList.innerHTML = "";

	for (let i = 0; i < appData.length; i++) {
		const data = appData[i];
		const li = document.createElement('li');
		li._app_index = data.id;
		li.addEventListener('click', e => selectPoint(e.target._app_index));
		li.innerText = JSON.stringify(data); // "{" + data.name + "," + " (" + data.location[0] + ", " + data.location[1] + ")}";

		if (selectedPointId == data.id) {
			li.style.background = 'red';
		}

		pointsList.appendChild(li);
	}
}

const dataDefault = {
	name: "",
	altitude: 0,
	movementSmoothing: 0.05,
	altitudeMode: "GroundRelative",
	location: [0, 0],
	id: "",
	maxNumberOfLocationUpdates: 0,
	useMovingAverage: false,
	hideObjectUtilItIsPlaced: true
};



function selectPoint(id) {
	if (id < 0) {
		selectedPointId = -1;
		selectedPointdata = null;
		
		altitudeModeEl.value = dataDefault.altitudeMode;
		nameInputEl.value = dataDefault.name;
		altitudeEl.value = dataDefault.altitude;
		movementSmoothingInputEl.value = dataDefault.movementSmoothing;
		idLabelEl.value = dataDefault.id;
		maxNumberOfLocationUpdatesEl.value = dataDefault.maxNumberOfLocationUpdates;
		useMovingAverageInputEl.checked = dataDefault.useMovingAverage;
		hideObjectUtilItIsPlacedEl.checked = dataDefault.hideObjectUtilItIsPlaced;

		addMarkerButton.disabled = false;
		removeMarkerButton.disabled = true;

		hideMarker(selectetMarker);
		renderPointsList();
	} else {
		let data = getDataEntryById(id);

		nameInputEl.value = data.name;
		altitudeEl.value = data.altitude;
		altitudeModeEl.value = data.altitudeMode;
		idLabelEl.innerText = data.id;
		latValueEl.innerText = data.location[0];
		lngValueEl.innerText = data.location[1];
		movementSmoothingInputEl.value = data.movementSmoothing;
		maxNumberOfLocationUpdatesEl.value = data.maxNumberOfLocationUpdates;
		useMovingAverageInputEl.checked = data.useMovingAverage;
		hideObjectUtilItIsPlacedEl.checked = data.hideObjectUtilItIsPlaced;

		addMarkerButton.disabled = true;
		removeMarkerButton.disabled = false;
		selectedPointId = id;
		selectedPointdata = data;

		selectetMarker.setLngLat(data.location);
		unhideMarker(selectetMarker);
		renderPointsList();

		removeTempMarker();

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