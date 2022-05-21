    // is this function initialized when the 
    // google maps api is called from the src link?
    function initMap() 
    {
      	// creates, and assignes the map object to the map div 
      	var map = new google.maps.Map(document.getElementById('map'), 
      	{
      	  	mapTypeControl: false,
      	  	center:	{
      	  	  	lat: 47.6588, lng: -117.426 // spokane coordinates
      	  	}, 
      	  	zoom: 3,
      	  	streetViewControl: false,
      	  	zoomControl: false,
      	  	panControl: false,
      	  	scaleControl: true,
      	});
      	// pass the map object to the directions handler constructor
      	new DirectionsHandler(map);
    }

    // Directions handler constructor. methods declared under 
    // the DirectionsHandler prototype will inherit the properties
    // defined below 
    function DirectionsHandler(map) 
    {
      	this.map = map;
      	this.originPlaceId = null;
      	this.destinationPlaceId = null;
		// variables used for storing the place id indicies 
      	// of the airports selected from the list  
      	this.originAirportId = null;
		this.destinationAirportId = null;
		  
		// up to three waypoints are stored in this array, 
      	// are accessed from the route method and 
      	// the placeChangedListener method
      	this.waypointPlaceId = [];
      	// variable containing the height of the page, and is 
      	// dynamically changed as elements are revealed and hidden 
      	// this variable is accessed from both the inputlistener,
      	// and the add result method
      	this.bodyHeight = 600;

      	// instaniate regular expression object to define 
      	// the url character pattern
      	this.hostnameRegexp = new RegExp('^https?://.+?/');

      	// instaniate the infowindow object and pass the 
      	// div element info-content id as a parameter
		this.infoWindow = new google.maps.InfoWindow({content: document.getElementById('info-content')});
	
      	// instaniate the places service object 
      	//and pass the map object as a parameter 
      	this.places = new google.maps.places.PlacesService(this.map);

      	this.originAirportMarkers = [];
		this.destinationAirportMarkers = [];
		this.tempSearchMarkers = [];  

      	// origin and destination inputs are defined now, 
      	// the waypoint input are defined in the this.createWaypointInputListener();   
      	this.originInput = document.getElementById('origin-input');
      	this.destinationInput = document.getElementById('destination-input');
      	this.waypointInput = null;
		
      	// instantiate the directionsservice and directionsrenderer objects
      	// objects are responsible for handling map routes, and obtaining route data  
      	this.directionsService = new google.maps.DirectionsService;
      	this.directionsDisplay = new google.maps.DirectionsRenderer;

      	// pass the map to the setmap method used by the directionsdisplay object
      	this.directionsDisplay.setMap(this.map);
		
      	// for testing purposes, helps to validate the 
      	// mathematics used in the calculation method
      	// the right-panel div in the map-form page must 
      	// be uncommented for this method to work 

      	// this.directionsDisplay.setPanel(
      	//  document.getElementById('right-panel')
      	// );

     	// the autocomplete object will return results in 
     	// United States and Canadian cities 

      	this.countryRestrict = {
			'country': [
				'us', 'ca'
			]
		};

      	// instaniate the origin and destination autocomplete objects
      	var originAutocomplete = new google.maps.places.Autocomplete(
			/** @type {!HTMLInputElement} */ (this.originInput), {
			types: ['(cities)'],
			componentRestrictions: this.countryRestrict
		});

      	var destinationAutocomplete = new google.maps.places.Autocomplete(
			/** @type {!HTMLInputElement} */ (this.destinationInput), {
			types: ['(cities)'], 
			componentRestrictions: this.countryRestrict
		});
      	this.waypointAutocomplete = null;

      	// this listerner is responsible for handling click events on the 'add stop' button. when clicked
      	// the listener will create an input field where additional stops can be added to the form, and used 
      	// in the route calculations 
      	this.createWaypointInputListener();
      	this.createRouteOnButtonClickListner();
      	// when the origin and destination form inputs accept input text, the setup place 
      	// changed listener is called; passing: the autocomplete object, the mode, and null.

      	// note, null is used as a parameter when the waypoint 
      	// autocomplete object in the createWaypointInputListener, 
      	// is instaniated 
      	this.setupPlaceChangedListener(originAutocomplete, 'ORIG', 0);
		this.setupPlaceChangedListener(destinationAutocomplete, 'DEST', 1);
    }
    
    DirectionsHandler.prototype.setupPlaceChangedListener = function(autocomplete, mode, i) 
    {
      	var that = this;

      	that.setupPopulateMarkerListListener();
      	//that.removeMarkerResultsListener();
      	autocomplete.bindTo('bounds', that.map);
      	autocomplete.addListener('place_changed', function() 
      	{
			var place = autocomplete.getPlace();
      		// that.originAirportMarkers != "" && that.destinationAirportMarkers != ""
			
      		// if the div element containing the id 
      		// attribute: 'route-data', contains elements,
      		// then execute the clearResults and clearMarkers functions
			if (document.getElementById('route-data').hasChildNodes()) 
			{
      		  	// removes the nearby airport results from the list
				clearResults(mode);
      		  	// removes the markers from the map
      		  	that.clearMarkers(mode);
      		} 
			
      		// based on the input mode, set the placeid of 
      		// the autocomplete result to the corresponding 
      		// placeId variable
      		switch (mode) 
      		{
      		  	case 'ORIG': 
					that.originPlaceId = place.place_id;
				break;
      		  	case 'WAYP': 
					that.waypointPlaceId[i] = place.place_id; 
      		  	break;
      		  	case 'DEST': 
					that.destinationPlaceId = place.place_id;
      		  	break;
			}
			
			if (mode != 'WAYP') { // if (place.geometry)
				that.map.panTo(place.geometry.location);
				that.tempSearchMarkers[i] = that.constructMarker({
					map: that.map,
					place: {
						  placeId: place.place_id,
						  location: place.geometry.location 
					}
				});
				that.dropMarker(that.tempSearchMarkers);
				that.map.setZoom(10);
      		 	that.nearbyAirportSearch(place, mode);
			}
      	});
    }
    
    DirectionsHandler.prototype.clearMarkers = function(mode) 
    {
		var that = this;
		var markers = [];
      	switch (mode) {
      	  	case 'ORIG': markers = that.originAirportMarkers; break;
			case 'DEST': markers = that.destinationAirportMarkers; break;
			case 'TEMP': markers = that.tempSearchMarkers; break;
		}

      	for (var i = 0; i < markers.length; i++) {
      	  	if (markers[i]) {
      	  	  markers[i].setMap(null);
      	  	}
      	}
      	markers = [];
    }

    function clearResults(mode) 
    {
     	var results;
     	switch (mode) 
     	{
     	  	case 'ORIG': results = document.getElementById('origin-results'); break;
     	  	case 'DEST': results = document.getElementById('destination-results'); break;
     	}

		while (results.childNodes[0]) 
		{
     	  	results.removeChild(results.childNodes[0]);
     	}
	}
	
	DirectionsHandler.prototype.constructMarker = function(options) {
		return new google.maps.Marker({options});
	}

    DirectionsHandler.prototype.nearbyAirportSearch = function(place, mode) 
    {
		var that = this;
		var markers = [];
		var i;

    	that.places.nearbySearch({
			location: place.geometry.location,
			radius: 50000,
			keyword: 'International Airport',
			types: ['airport']
	  	}, function(results, status) {
    	  	if (status === google.maps.places.PlacesServiceStatus.OK) 
    	  	{
    	  	  	for (i = 0; i < results.length; i++) 
    	  	  	{
					markers[i] = that.constructMarker({
						position: results[i].geometry.location,
						animation: google.maps.Animation.DROP,
						icon: that.createAirportMarkers(i)
					});
    	  	  	  	
    	  	  	  	switch (mode) 
    	  	  	  	{
    	  	  	  	  	case 'ORIG': that.originAirportMarkers[i] = markers[i]; break;
    	  	  	  	  	case 'DEST': that.destinationAirportMarkers[i] = markers[i]; break;
					}
							  
					markers[i].placeResult = results[i];
    	  	  	  	that.setupMarkerClickListener(markers[i]);
    	  	  	  	setTimeout(that.dropMarker(markers[i]), i * 100);
    	  	  	  	that.addResult(results[i], i, mode);
    	  	  	}
			} else {
    	  	  	window.alert("Nearby search failed due to " + status);
    	  	}
    	});
	}
			
    DirectionsHandler.prototype.dropMarker = function(marker) 
    {
      	var that = this;
      	return function() 
      	{
      	  	marker.setMap(that.map);
      	};
    }

    DirectionsHandler.prototype.createAirportMarkers = function(i) 
    {
		var MARKER_PATH = 'https://developers.google.com/maps/documentation/javascript/images/marker_green';
		var markerLetter = String.fromCharCode('A'.charCodeAt(0) + (i % 26));
      	return MARKER_PATH + markerLetter + '.png';
    }

    DirectionsHandler.prototype.addResult = function(result, i, mode) 
    {
		var that = this;
		var results, style;
    	var markers = [];
    	var tr = document.createElement('tr');
    	var radioTd = document.createElement('td');
    	var iconTd = document.createElement('td');
    	var nameTd = document.createElement('td');
    	var icon = document.createElement('img');
    	var radio = document.createElement('input');
    	var name = document.createTextNode(result.name);

    	switch (mode) 
    	{
    	  	case 'ORIG': 
    	  	  	results = document.getElementById('origin-results'); 
    	  	  	markers[i] = that.originAirportMarkers[i];
    	  	  	radio.name = 'origin-radio-button';
    	  	  	that.createOriginAirportRadioListener(radio);
    	  	break;
    	  	case 'DEST': 
    	  	  	results = document.getElementById('destination-results'); 
    	  	  	markers[i] = that.destinationAirportMarkers[i];
    	  	  	radio.name = 'destination-radio-button';
    	  	  	that.createDestinationAirportRadioListener(radio);
    	  	break;
    	}
    	
    	tr.style.backgroundColor = (i % 2 === 0 ? '#F0F0F0' : '#FFFFFF');

    	tr.onclick = function() 
    	{
    	 	google.maps.event.trigger(markers[i], 'click');
    	 	that.map.setZoom(9);
    	 	that.map.panTo(markers[i].position);
		};

    	// construct radio attributes
    	radio.id = i;
    	radio.type = 'radio';
    	radio.style = 'margin: 0px 5px 0px 10px;';
    	radio.value = result.name;

    	// construct icon attributes
    	icon.src = that.createAirportMarkers(i);
    	icon.setAttribute('class', 'placeIcon');
    	icon.setAttribute('className', 'placeIcon');

    	// append inner elements to table definitions
    	radioTd.appendChild(radio);
    	iconTd.appendChild(icon);
    	nameTd.appendChild(name);

    	// append table definitions to table rows
    	tr.appendChild(radioTd);
    	tr.appendChild(iconTd);
    	tr.appendChild(nameTd);

    	// append table rows to results table
    	results.appendChild(tr);
    	// creates a style using the default body height 
    	// defined in the directionshandler constructor
    	style = 'min-height:' + that.bodyHeight + 'px';
    	document.body.setAttribute('style', style);

    	// create listener on each radio button
    	that.enableRouteButtonListener(radio);
    }

    DirectionsHandler.prototype.route = function(o, d) 
    {
		var that = this;
		var buttonId = document.getElementById('submit-order');
      	// create the options object that will be used for determining the route 
		// since the waypoints are being optimized by the "optimizeWaypoints" property, 
		// the route will be calculated based on the most efficient order  

		// the o and d passed to the route method contain the indicies of the airports 
		// selected from the list, which correspond to the position in the array containing the
      	// selected airports  
      	var options = {
      	  	origin: {
      	  	  	'placeId': that.originAirportMarkers[o].placeResult.place_id,
      	  	},
      	  	waypoints: [
      	  	  	{
      	  	  	  	location: {
      	  	  	  	  	'placeId': that.originPlaceId
      	  	  	  	},
      	  	  	  	stopover: true
      	  	  	}, {
      	  	  	  	location: {
      	  	  	  	  	'placeId': that.destinationPlaceId
      	  	  	  	},
      	  	  	  	stopover: true
      	  	  	}
      	  	],
      	  	destination: {
      	  	  	'placeId': that.destinationAirportMarkers[d].placeResult.place_id
      	  	},
      	  	travelMode: 'DRIVING',
      	  	unitSystem: google.maps.UnitSystem.IMPERIAL,
      	  	optimizeWaypoints: true,
      	};

      	// if the waypoint placeId is set then loop through 
      	// the array and inject each value into the options object
      	if (that.waypointPlaceId.length != "") 
      	{
      	  	var i, j;
      	  	for (i = 0; i < that.waypointPlaceId.length; i++) 
      	  	{
      	  	  	j = options.waypoints.length;
      	  	  	options.waypoints[j] = { // inserts input field waypoints in the specified index
      	  	  	  	location: {
      	  	  	  	  	'placeId': that.waypointPlaceId[i]
      	  	  	  	},
      	  	  	  	stopover: true
      	  	  	};
      	  	}
		}

      	// pass the options object to the directionsService route method 
		// the function specified as a parameter is a callback from the route method
		// the route method produces the response and status variables 
		// (can be named accordingly) for interacting with the route data
      	this.directionsService.route(options, function(response, status) 
      	{
      	  	if (status === 'OK') 
      	  	{
				that.clearMarkers('TEMP');
      	  	  	that.directionsDisplay.setDirections(response);
				that.calculateAndDisplayResults(response);
				document.getElementById('submit-order').removeAttribute('disabled');
      	  	} else {
      	  	  	window.alert('Directions request failed due to ' + status);
      	  	}
      	});
    }

    DirectionsHandler.prototype.calculateAndDisplayResults = function(response) 
    {
    	// create table elements for calculation results 
    	var routeTr = document.createElement('tr');
    	var distanceTd = document.createElement('td');
    	var durationTd = document.createElement('td');
    	var driverCostTd = document.createElement('td');
    	// create input fields for form processing
    	var distanceInput = document.createElement('input');
    	var durationInput = document.createElement('input');
    	var driverCostInput = document.createElement('input');
    	// get the id of the parent element that route data will be appended to  
    	var routeTbody = document.getElementById('route-data');
    	// define the vars that will contain calculation results
    	var driverCost = distance = duration = 0;
    	// define the vars used as text nodes in the table
    	var driverCostNode, distanceNode, durationNode;
    	var editOrderForm = document.getElementById('order-form');

    	if (document.getElementById('route-table').rows.length === 1) 
    	{
    	  document.getElementById('route-table').deleteRow(0);
    	}

    	// assign attributes to input elements
    	distanceInput.setAttribute('name', 'distance');
    	durationInput.setAttribute('name', 'duration');
    	driverCostInput.setAttribute('name', 'driver-cost');
    	
    	distanceInput.setAttribute('type', 'hidden');
    	durationInput.setAttribute('type', 'hidden');
    	driverCostInput.setAttribute('type', 'hidden');
    	        
    	// remove the style attribute responsible for hiding the table prior to calculations
    	document.getElementById('route-data-table').removeAttribute('style');

    	// loop through the route legs and add both the distance and 
    	// duration values to their corresponding variables

    	for (var i = 0; i < response.routes[0].legs.length; i++) 
    	{
			if (i == 0 || i === response.routes[0].legs.length - 1) 
			{
    	  	  	// calculate the driver cost of the distance between the airport
    	  	  	// and the pickup location based on 25/hour rate
    	  	  	driverCost = driverCost + Math.round(((response.routes[0].legs[i].duration.value / 60) * 25) / 60);
    	  	  	// increment the counter if i == 0
				if (i == 0) 
				{
    	  	  	  	i++;
    	  	  	}
    	  	}
    	  	distance += response.routes[0].legs[i].distance.value;
    	  	duration += response.routes[0].legs[i].duration.value;
		}
		

    	// cleanse the distance and duration values
    	duration = secondsToTime(duration);
    	distance = (distance / 1000 / 1.609344).toFixed(2);
    	
    	// calculate the driver cost
    	driverCost = (driverCost + (distance * 0.92)).toFixed(2);

		
    	// create text nodes from the driver cost, duration, and distance 
    	//variables, then format the values as strings containing appropriate text
    	driverCostNode = document.createTextNode("$" + driverCost);
    	durationNode = document.createTextNode("About " + duration);
    	distanceNode = document.createTextNode(distance + " Miles");

		console.log(driverCostNode);
		console.log(durationNode);
		console.log(distanceNode);
    	distanceInput.value = distance;
    	durationInput.value = duration;
    	driverCostInput.value = driverCost;

		// prevent injection attempts
    	distanceInput.readOnly = true;
    	durationInput.readOnly = true;
    	driverCostInput.readOnly = true;

    	distanceInput.required = true;
    	durationInput.required = true;
    	driverCostInput.required = true;
    	
    	// append the text nodes to the input and table definition element variables
    	distanceTd.appendChild(distanceNode);
    	durationTd.appendChild(durationNode);
    	driverCostTd.appendChild(driverCostNode);

    	editOrderForm.appendChild(distanceInput);
    	editOrderForm.appendChild(durationInput);
    	editOrderForm.appendChild(driverCostInput);

    	// build the table by appending 
    	// distanceTd.appendChild(distanceInput);
    	// durationTd.appendChild(durationInput);
    	// driverCostTd.appendChild(driverCostInput);

    	routeTr.appendChild(distanceTd);
    	routeTr.appendChild(durationTd);
    	routeTr.appendChild(driverCostTd);

    	routeTbody.appendChild(routeTr);
    }
      
    DirectionsHandler.prototype.buildIWContent = function(place) 
    {
      	document.getElementById('iw-icon').innerHTML = '<img class="airplaneIcon" ' + 'src="' + place.icon + '"/>';
      	document.getElementById('iw-url').innerHTML = '<b><a href="' + place.url + '">' + place.name + '</a></b>';
      	document.getElementById('iw-address').textContent = place.vicinity;
		
      	if (place.formatted_phone_number) 
      	{
      	  	document.getElementById('iw-phone-row').style.display = '';
      	  	document.getElementById('iw-phone').textContent = place.formatted_phone_number;
		} 
		else 
		{
      	  	document.getElementById('iw-phone-row').style.display = 'none';
      	}

      	if (place.rating) 
      	{
      	  	var ratingHtml = '';
			for (var i = 0; i < 5; i++) 
			{
				if (place.rating < (i + 0.5)) 
				{
      	  	  		ratingHtml += '&#10025;';
				} 
				else 
				{
      	  	  		ratingHtml += '&#10029;';
      	  		}
      	  	 	document.getElementById('iw-rating-row').style.display = '';
      	  	 	document.getElementById('iw-rating').innerHTML = ratingHtml;
      	  	}
		} 
		else 
		{
      	 	document.getElementById('iw-rating-row').style.display = 'none';
      	}
	  
      	if (place.website) 
      	{
      	  	document.getElementById('iw-website-row').style.display = '';
      	  	document.getElementById('iw-website').innerHTML = '<b><a href="' + place.website + '">' + place.website + '</a></b>';
      	} else {
      	  	document.getElementById('iw-website-row').style.display = 'none';
      	}
    }
			
    function secondsToTime(duration) 
    {
		var hours   = Math.floor(duration / 3600);
		var minutes = Math.floor((duration - (hours * 3600)) / 60);
		var seconds = duration - (hours * 3600) - (minutes * 60);
		var time = "";
		
		if (hours != 0) 
		{
			time = hours + ":";
		}
		if (minutes != 0 || time !== "") 
		{
			minutes = (minutes < 10 && time !== "") ? "0" + minutes : String(minutes);
			time += minutes + ":";
		}
		if (time === "") 
		{
			time = seconds + "s";
		}
		else 
		{
			time += (seconds < 10) ? "0" + seconds : String(seconds);
		}
		return time;
    }

    // ######################################## Event Listners ########################################
      
    DirectionsHandler.prototype.setupMarkerClickListener = function(marker) 
    {
		var that = this;
      	marker.addListener('click', function() 
      	{
      	  	that.places.getDetails({
				placeId: marker.placeResult.place_id
			}, function(place) {
				that.infoWindow.open(that.map, marker);
				that.buildIWContent(place);
			});
		});
	}

    DirectionsHandler.prototype.setupPopulateMarkerListListener = function() 
    {
		var that = this; 
    	var onMarkerPopulate = function() 
    	{
    		// remove the style attribute responsible for hiding the 
    		// hidden tabs parent div for the origin and destination airport results 
    		// this style attribute is added in the route click listener to 
    		// facilitate a cleanly user interface after calculations are made
			document.getElementById('hidden-tabs').removeAttribute('style');
    	}
    	// attach the event listner to the origin and destination input elements
		that.originInput.addEventListener('change', onMarkerPopulate);
		that.destinationInput.addEventListener('change', onMarkerPopulate);
    }
    
    DirectionsHandler.prototype.enableRouteButtonListener = function(radio) 
    {
      	var that = this;
      	radio.addEventListener('click', function() 
      	{
      	  	if (that.originAirportId != null && that.destinationAirportId != null) 
      	  	{
      	  	  	// remove the disabled attribute from the route button. 
      	  	  	// this occurs when both origin and destination airportId 
      	  	  	// variables contain the index used for routing 
      	  	  	document.getElementById('create-route').removeAttribute('disabled');
      	  	}
      	});
    }

    DirectionsHandler.prototype.createOriginAirportRadioListener = function(radio) 
    {
      	// this method runs in a loop, and attaches an event listner to each 
      	// radio button in each list item result created in the loop 
      	var that = this;
      	// attach an event listner to the origin results radio buttons
      	radio.addEventListener('click', function() 
      	{
      	  	that.originAirportId = radio.id;
      	});
    }

    DirectionsHandler.prototype.createDestinationAirportRadioListener = function(radio) 
    {
      	// this method runs in a loop, and attaches an event listner to each 
      	// radio button in each list item result created in the loop 
      	var that = this;
      	// attach an event listner to the origin results radio buttons
      	radio.addEventListener('click', function() 
      	{
      	  	that.destinationAirportId = radio.id;
      	});
    }

    DirectionsHandler.prototype.createRouteOnButtonClickListner = function() 
    {
      	// note: the airportId's passed to the route method, 
      	// do not refer to the actual placeId used for gMaps API coordinates.
      	// rather, they refer to the indicies in the array with
      	// which the gmaps API placeId's are referenced. 
      	// the for loop below can demonstrate the use of the index 
      	// stored in either of the that.originAirportId[i]/that.destinationAirportId[i]
      	// the placeId results are accessible from the *.placeResult.place_id property    

      	//for (var i = 0; i < that.originAirportMarkers.length; i++) {
      	//  console.log(that.originAirportMarkers[i]);
      	//}
		
      	// we want to hide the airport results when the user clicks the 'get quote' button
      	// dont worry, the airport results will reappear when the user searches for a new 
      	// origin or destination
		var that = this;
		var style;
      	document.getElementById('create-route').addEventListener('click', function() 
      	{
      	  	if (that.originPlaceId != null && that.destinationPlaceId != null && that.originAirportId != null && that.destinationAirportId != null) 
      	  	{  
      	  	  	document.getElementById('hidden-tabs').setAttribute('style', 'display:none;');
      	  	  	that.bodyHeight -= 225;
      	  	  	style = 'min-height:' + that.bodyHeight + 'px';
      	  	  	document.body.setAttribute('style', style);

      	  	  	that.route(that.originAirportId, that.destinationAirportId);
      	  	}
      	});
    }

    DirectionsHandler.prototype.createWaypointInputListener = function() 
    {
    	var that = this;
    	// this listener is responsible for creating a new input field each time the 'add stop' 
    	// button is clicked. Each added waypoint will be included in the route calculations

    	// define counter that will serve as the array index for the waypoint array
    	var count = 0;

    	// get the id of the add waypoint button
    	var wpButton = document.getElementById('add-waypoint');
		var deleteWPButton = document.getElementById('delete-waypoint');
		
		// create row and column divs
		var rowDiv = document.createElement('div');
		var colDiv = document.createElement('div');

    	// get the id of the group that the waypoint inputs will reside
    	var wpGroup = document.getElementById('waypoint-group');

    	var createWaypointInputs = function() 
    	{
    	  	if (wpGroup.hasAttribute('style')) 
    	  	{
    	  	  	wpGroup.removeAttribute('style');
			}
			  
			if (count > 1)
			{
				deleteWPButton.removeAttribute('style');
			}

    	  	var style = 'min-height:' + (that.bodyHeight += 50) + 'px';
    	  	document.body.setAttribute('style', style);

    	  	if (count === 2) 
    	  	{
    	  	 	wpButton.removeEventListener('click', createWaypointInputs);
    	  	}

			
    	  	// set attributes on row and column divs
    	  	rowDiv.setAttribute('class', 'form-group row');
    	  	colDiv.setAttribute('class', 'col-sm-12');
    	  	colDiv.setAttribute('id', 'waypoint-col-' + count);
			
			// if we decide to add a delete waypoint input button, then the below attribute will be useful 
			//that.waypointInput.setAttribute(required);

    	  	// create the input field and set its attributes
    	  	that.waypointInput = document.createElement('input');
    	  	that.waypointInput.setAttribute('name', 'waypoint-' + count);
    	  	that.waypointInput.setAttribute('id', 'waypoint-id-' + count);
    	  	that.waypointInput.setAttribute('type', 'text');
    	  	that.waypointInput.setAttribute('pattern', '^[a-zA-Z0-9,. ]*$');
    	  	that.waypointInput.setAttribute('maxlength', '30');
			that.waypointInput.setAttribute('class', 'form-control mb-2');

			if (count < 3) {
			}

			// instinate the autocomplete object
    	  	that.waypointAutocomplete = new google.maps.places.Autocomplete(
				that.waypointInput, 
				that.countryRestrict,				
				{placeIdOnly: true}
			);

    	  	// pass the autocomplete object instance, the mode, and the index count to the placeChangedListener
    	  	that.setupPlaceChangedListener(that.waypointAutocomplete, 'WAYP', count);

    	  	// increment the counter by 1
    	  	count += 1;

    	  	// append the row div to the input group div, 
    	  	// the column div to the row div, 
    	  	// and the input element to the col div   
    	  	wpGroup.appendChild(rowDiv);
    	  	rowDiv.appendChild(colDiv);
    	  	colDiv.appendChild(that.waypointInput);
		}

		//var deleteWaypointInputs = function() 
		//{
		//	wpGroup.removeChild(wpGroup[count]);
		//	count -= 1;
		//	if (count === 0) {
		//		deleteWPButton.setAttribute('style', 'display:none;');
		//	}
		//	that.setupPlaceChangedListener(that.waypointAutocomplete, 'WAYP', count);
		//}
		
    	wpButton.addEventListener('click', createWaypointInputs);       
    	//deleteWPButton.addEventListener('click', deleteWaypointInputs);       
    }