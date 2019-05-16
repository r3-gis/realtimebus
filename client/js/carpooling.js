var carpoolingLayer = {
  isCached : true,
  retrieveStations : function(hubs,usertype){
    var hubreq='';
    $.each(hubs,function(index,value){
      if (value.active){
        if (hubreq != '')
        hubreq += "\\,";
        hubreq += '\''+index+'\'';
      }
    });
    var  params = {
      request:'GetFeature',
      typeName:'edi:Carpooling',
      outputFormat:'text/javascript',
      format_options: 'callback: jsonCarpooling'
    };
    if (hubreq!='')
    params['viewparams']='hubs:'+hubreq+';';
    if (usertype!='')
    params['viewparams']+='usertypes:'+usertype;
    $.ajax({
      url : SASABus.config.geoserverEndPoint+'wfs?'+$.param(params),
      dataType : 'jsonp',
      crossDomain: true,
      jsonpCallback : 'jsonCarpooling',
      success : function(data) {
        var features = new OpenLayers.Format.GeoJSON().read(data);
        carpoolingLayer.layer.removeAllFeatures();
        carpoolingLayer.layer.addFeatures(features);
      },
      error : function() {
        console.log('problems with data transfer');
      }
    });
  },
  get: function(){
    if (this.isCached && this.layer != undefined)
    return this.layer;
    var styleMap = new OpenLayers.StyleMap(new OpenLayers.Style({
      externalGraphic: '${externalGraphic}',
      graphicWidth: 35,
      graphicYOffset:-35.75,
    },{
      context: {
        externalGraphic:function(feature){
          var pin= 'images/9_Carpooling/hub_marker.svg';
          if (!feature.cluster){
            if (feature.attributes.stationtype == 'CarpoolingHub')
            pin= 'images/9_Carpooling/hub_marker.svg';
            else
            pin= feature.attributes.type==='A'?'images/9_Carpooling/driver_marker.svg':'images/9_Carpooling/passenger_marker.svg';

          }else{
            var vectors = new OpenLayers.Layer.Vector("vector", {isBaseLayer: false});
            vectors.addFeatures(feature.cluster);
            var dataExtent = vectors.getDataExtent();
            SASABus.map.setCenter(feature.geometry.bounds.centerLonLat);
            SASABus.map.zoomToExtent(dataExtent);
          }
          return pin;
        }
      }
    }));
    var positionsLayer = new OpenLayers.Layer.Vector("carpoolingLayer", {
      styleMap: styleMap,
      strategies: [new OpenLayers.Strategy.Cluster({distance: 25,threshold: 2})],
    });
    positionsLayer.events.on({
      "beforefeatureselected":function(e){
        if (!e.feature.cluster){
	  redrawAllBlueFeatures(e.feature);
          var station = e.feature.attributes.stationcode;
          if (e.feature.attributes.stationtype=='CarpoolingHub')
          integreen.retrieveData(station,"carpooling/rest/",displayHubsData);
          if (e.feature.attributes.stationtype=='CarpoolingUser'){
            resetAllIcons(e.feature);
            integreen.retrieveData(station,"carpooling/rest/user/",displayUserData);
          }
        }else{
          displayClusterFeatures(e.feature.cluster);
        }
      }
    });
    this.layer = positionsLayer;
    return positionsLayer;
    function redrawAllBlueFeatures(feature){	
	var features = feature.layer.features;
	$.each(features,function(index,value){	
          var pin = 'images/9_Carpooling/hub_marker.svg';
          if (!value.cluster){
            if (value.attributes.stationtype == 'CarpoolingHub')
              pin= 'images/9_Carpooling/hub_marker.svg';
            else
              pin= value.attributes.type==='A'?'images/9_Carpooling/driver_marker.svg':'images/9_Carpooling/passenger_marker.svg';
            value.style={
            	externalGraphic:pin,
                graphicWidth: 35,
                graphicYOffset:-35.75
            };
            positionsLayer.drawFeature(value);
          }
	});
    }
    function resetAllIcons(feature){
	var features = feature.layer.features;
	$.each(features,function(index,value){
		if (value.id != feature.id && value.data.stationcode != feature.data.parent){
			var pin ="";
            		if (value.attributes.stationtype == 'CarpoolingHub')
		          pin= 'images/9_Carpooling/hub_off_marker.svg';
		        else
              		  pin= value.attributes.type==='A'?'images/9_Carpooling/driver_off_marker.svg':'images/9_Carpooling/passenger_off_marker.svg';
			value.style={
				externalGraphic:pin,
				graphicWidth: 35,
			        graphicYOffset:-35.75
			};
			positionsLayer.drawFeature(value);
		}
	});
    }

    function displayClusterFeatures(features){
      $('.modal').hide();
      $('.station .title').html("Choose one");
      var html ="<ul>"
      html+= '</ul>';
      $('.station .content').html(html);
      features.forEach(function(feature,index){
        var featureHtml;
        featureHtml ='<li style="text-align:center;padding:10px;background-color:#3192c5;margin-bottom:10px">';
        if (feature.attributes.stationtype=='CarpoolingHub')
        featureHtml+='<a href="javascript:void(0)" class="clusterhub'+feature.attributes.stationcode+'">HUB '+feature.attributes.name+'</a>'
        if (feature.attributes.stationtype=='CarpoolingUser')
        featureHtml+='<a href="javascript:void(0)" class="clusteruser'+feature.attributes.stationcode+'">USER '+feature.attributes.name+'</a>'
        featureHtml+='</li>';
        $('.station .content ul').append(featureHtml);
        $('.station .content ul .clusterhub'+feature.attributes.stationcode).click(function(){
          integreen.retrieveData(feature.attributes.stationcode,"carpooling/rest/",displayHubsData);
        });
        $('.station .content ul .clusteruser'+feature.attributes.stationcode).click(function(){
          resetAllIcons(feature);
          integreen.retrieveData(feature.attributes.stationcode,"carpooling/rest/user/",displayUserData);
        });
      });
      $('.station').show();
    }
    function displayHubsData(details,state){
      $('.station .title').html(details.name);
      $('.modal').hide();
      var html = "";
      html += '<div class="carpooling-info"><div><img style="width:50px;height:50px" src="images/9_Carpooling/location.svg"/><p>'+(details.address)+'<br/>'+details.city+'</p></div></div>';
      html +='<div><a href="javascript:void(0)" class="backtomap ibutton" ><div>About this Hub</div></a></div>';
      html +='<div><a href="javascript:void(0)" class="backtomap ibutton" ><div>'+jsT[lang].backtomap+'</div></a><hr/></div>';
      $('.station .content').html(html);
      $('.station .backtomap.ibutton').click(function(){
        $('.modal').hide();
      });
      $('.station').show();
    }
    function displayUserData(details,state){
      var htmlTitle = '<div> <img src="images/9_Carpooling/';
      var personType,personImg;
      if (details.type=='A'||details.type=='E'){
      	personImg = 'driver.svg';
        personType = 'Driver';

      }
      if (details.type=='P'||details.type=='E'){
        personImg = 'passenger.svg';
        personType.length==0 ? personType = 'Passenger' : personType += ' / Passenger';
      }
      htmlTitle+=personImg;
      htmlTitle+='"/><p><strong>'+details.name+'</strong><br/>'+personType+'</p></div>';	     
      $('.station .title').html(htmlTitle);
      $('.modal').hide();
      var html = "";
      html += '<div class="carpooling-info">';
      html += '<div><img src="images/9_Carpooling/location.svg"/><p><strong>'+jsT[lang].startAddressLabel+"</strong><br/>"+details.tripFrom.address+" "+ details.tripFrom.city+'</p></div>';
      html += '<div><img src="images/Flag.svg"/><p><strong>'+jsT[lang].destinationHubLabel+"</strong><br/>"+details.hub+' '+details.hub+'</p></div>';
      if (details.pendular)	
      	html += '<div><img src="images/9_Carpooling/pendular.svg"/><strong>'+jsT[lang].pendularLabel+'</strong></div>';
      html += '<div><img src="images/9_Carpooling/times.svg"/><div class="subflex"><strong>'+jsT[lang].arrivalTimeLabel+'</strong><strong>'+jsT[lang].departureTimeLabel+'</strong></div><div class="subflex"><div>'+details.arrival+'</div><div>'+details.departure+'</div></div></div>';
      html +='</div>';
      html +='<div><a href="javascript:void(0)" class="backtomap ibutton" ><div>Contact person</div></a></div>';
      html +='<div><a href="javascript:void(0)" class="backtomap ibutton" ><div>'+jsT[lang].backtomap+'</div></a><hr/></div>';
      $('.station .content').html(html);
      $('.station .backtomap.ibutton').click(function(){
        $('.modal').hide();
      });
      $('.station').show();
    }
  },
  populate: function(){
    var self = this;
    if (self.hubs == undefined)
    self.getTypes(self.retrieveStations);
  },
  getTypes : function(callback){
    integreen.getStationDetails('carpooling/rest/user/',{},displayBrands);
    function displayBrands(data){
      var usertype =  "'E'\\,'A'\\,'P'";
      var hubs = {
        nothingSelected : function(){
          var selected = true;
          for (i in hubs){
            if (hubs[i].active === true)
            selected = false;
          }
          return selected;
        }
      };
      $.each(data,function(index,value){
        hubs[value.id] = {
          active:true,
          name:value.name
        };
      });
      $('.carpoolingtypes').empty();
      $.each(hubs,function(index,value){
        if (typeof value == 'function')
        return true;
        var brandClass= index.replace(/[^a-zA-Z0-9]/g,'_');
        $('.carpooling .carpoolingtypes').append('<li class="clearfix carpoolinghub"><p>'+value.name+'</p><a brand='+index+' href="javascript:void(0)" class="toggler">'
        +'<svg width="55" height="30">'
        +       '<g>'
        +               '<rect x="5" y="5" rx="12" ry="12" width="42" style="stroke:#3192c5" height="24"/>'
        +               '<circle cx="34" cy="17" r="9" fill="#3192c5" />'
        +       '</g>'
        +       'Sorry, your browser does not support inline SVG.'
        + '</svg>'
        + '</a></li>'
      );
    });
    $('.carpooling .carpoolingtypes').append('<hr/>');
    $('.carpooling .carpoolingtypes').append('<li class="clearfix driver"><p>Autista</p><a href="javascript:void(0)" class="toggler">'
    +'<svg width="55" height="30">'
    +       '<g>'
    +               '<rect x="5" y="5" rx="12" ry="12" width="42" style="stroke:#3192c5" height="24"/>'
    +               '<circle cx="34" cy="17" r="9" fill="#3192c5" />'
    +       '</g>'
    +       'Sorry, your browser does not support inline SVG.'
    + '</svg>'
    + '</a></li>'
  ).append('<li class="clearfix passenger"><p>Passeggero</p><a href="javascript:void(0)" class="toggler">'
  +'<svg width="55" height="30">'
  +       '<g>'
  +               '<rect x="5" y="5" rx="12" ry="12" width="42" style="stroke:#3192c5" height="24"/>'
  +               '<circle cx="34" cy="17" r="9" fill="#3192c5" />'
  +       '</g>'
  +       'Sorry, your browser does not support inline SVG.'
  + '</svg>'
  + '</a></li>'
);
var statusText = hubs.nothingSelected() ? jsT[lang]['selectAll'] : jsT[lang]['deselectAll'] ;
$('.carpooling .main-config').append('<a href="javascript:void(0)" class="deselect-all" >'+statusText+'</a>');
$('.carpooling .main-config').append('<hr/>');
integreen.retrieveData("innovie","carpooling/rest/user/",displayAllData);
function displayAllData(stationData,currentState){
  $('.carpooling .main-config').append(stationData.name);
  $('.carpooling .main-config').append("<ul>");
  $.each(currentState,function(index,newestData){
    $('.carpooling .main-config').append("<li>"+index+' '+newestData.value+"</li>");
  });
  $('.carpooling .main-config').append("</ul>");
}
$('.carpoolinghub a').click(function(e){
  var brand = $(this).attr("brand");
  hubs[brand].active = !hubs[brand].active;
  $(this).toggleClass("disabled");
  var statusText = hubs.nothingSelected() ? jsT[lang]['selectAll'] : jsT[lang]['deselectAll'] ;
  $('.carpooling .deselect-all').text(statusText);
  carpoolingLayer.retrieveStations(hubs,usertype);
});
$('.driver a, .passenger a').click(function(e){
  $(this).toggleClass("disabled");
  var driverStatus = !$('.driver a').hasClass("disabled");
  var passengerStatus = !$('.passenger a').hasClass("disabled");
  if (driverStatus==true && passengerStatus==true) usertype = "'E'\\,'A'\\,'P'";
  else if (driverStatus == true) usertype = "'A'\\,'E'";
  else if (passengerStatus == true) usertype ="'P'\\,'E'";
  else usertype ='';
  carpoolingLayer.retrieveStations(hubs,usertype);
});
$('.carpooling .deselect-all').click(function(){
  var nothingSelected = hubs.nothingSelected();
  if (!nothingSelected){
    $('.carpooling .toggler').addClass('disabled');
    usertype = '';
  }
  else{
    $('.carpooling .toggler').removeClass('disabled');
    usertype = "'E'\\,'A'\\,'P'";
  }

  $.each(hubs,function(index,value){
    if (typeof value != 'function')
    hubs[index].active = nothingSelected;
  });
  var statusText = hubs.nothingSelected() ? jsT[lang]['selectAll'] : jsT[lang]['deselectAll'] ;
  $('.carpooling .deselect-all').text(statusText);
  carpoolingLayer.retrieveStations(hubs,usertype);
});
if (callback != undefined)
callback(hubs,usertype);
}
}
}
