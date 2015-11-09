// Config

var lsize = 256;	// longer size of scaled image(it will be source image)
var psize = 1;		// size of Particle
var bgcolor = 0xFFFFFF;	// clearColor

// Global
var projector, camera, scene, particleSystem, renderer, controls;
var width, height;
var targetList = [];
var mouse = { x: 0, y: 0 };
var outline;

// cache
var labcache = new Array;
for(var i=0; i<=0xFFFFFF; i++)
	labcache.push(-1);

var imagelist = ["img/full-spectrum.png"];
var image = new Image();
image.src = imagelist[0];
var imgdata;

ColorSpace = {
	rgbData : null,
	hslData : null,
	labData : null,
	xyzData : null
};

ColorSpace.Config = {
	gui : true,
	colorSpace : 'rgb',
}

var gui;
var viewChanger = {
	distance: 200,
	top: function(){
		changeCamera([0,  this.distance, 0], [0,0,-1]);
	},
	bottom: function(){
		changeCamera([0, -this.distance, 0], [0,0,-1]);
	},
	left: function(){
		changeCamera([-this.distance, 0, 0], [0,1,0]);
	},
	right: function(){
		changeCamera([ this.distance, 0, 0], [0,1,0]);
	},
	front: function(){
		changeCamera([0, 0,  this.distance], [0,1,0]);
	},
	back: function(){
		changeCamera([0, 0, -this.distance], [0,1,0]);
	}
};
var scriptConfig = {
	lab: function(){
		ColorSpace.Config.colorSpace='lab';
		makeColorSpace();
	},
	xyz: function(){
		ColorSpace.Config.colorSpace='xyz';
		makeColorSpace();
	},
	rgb: function(){
		ColorSpace.Config.colorSpace='rgb';
		makeColorSpace();
	},
	hsl: function(){
		ColorSpace.Config.colorSpace='hsl';
		makeColorSpace();
	}
};

function makeColorSpace(){
	img=image;

	if(particleSystem){
		scene.remove(particleSystem);			
	}		

	targetList = [];

	var canvas = document.getElementById('source');
	var context = canvas.getContext('2d');

	var w = img.width;
	var h = img.height;
	if(w>=h){
		h = lsize*h/w;
		w = lsize;
	}else{
		w = lsize*w/h;
		h = lsize;
	}
	canvas.width = w;
	canvas.height = h;
	context.drawImage(img, 0, 0, w, h);

	var imgdata = context.getImageData(0, 0, w, h).data;
	
	var particles = new THREE.Geometry();
	var len = imgdata.length / 4;

	//calcurate particle coordinates from RGB color
	var toParticle;
	switch(ColorSpace.Config.colorSpace){
		case 'rgb':
			toParticle=function(r, g, b, rgb){
				return new THREE.Vector3(r*0.3921568-50.1960784, g*0.3921568-50.1960784, b*0.3921568-50.1960784);
				//original: return new THREE.Vector3(r-128, g-128, b-128);
				//マジックナンバーはlabのパーティクルの密度にあわせるため
				//I hope there will be compareble density of Particles in each color space.
			};
			break;
		case 'xyz':
			toParticle=function(r, g, b, rgb){
				var xyz = RGBtoXYZ(r,g,b);
				return new THREE.Vector3(xyz[0]*100-50, xyz[1]*100-50, xyz[2]*100-50);
			};
			break;
		case 'hsl':
			// toParticle=function(r, g, b, rgb){
			// 	//from http://d.hatena.ne.jp/yoya/20120828/
			// 	var hsl = new THREE.Color(r/255.0,g/255.0,b/255.0).getHSL();
				
			// 	var rad = hsl.h * 6.2831853; // optimized. 6.2831853 = 2 * 3.1415926
			// 	var xyz = [hsl.l, hsl.s * Math.cos(rad), hsl.s * Math.sin(rad)];
			// 	return new THREE.Vector3(xyz[0]*120-60, xyz[1]*60, xyz[2]*60);
			// };
			toParticle=function(h,s,l){
				//from http://d.hatena.ne.jp/yoya/20120828/
				var rad = h * 6.2831853; // optimized. 6.2831853 = 2 * 3.1415926
				var xyz = [l, s * Math.cos(rad), s * Math.sin(rad)];
				return new THREE.Vector3(xyz[0]*120-60, xyz[1]*60, xyz[2]*60);
			};				
			break;
		default:
		case 'lab':
			toParticle=function(r, g, b, rgb){
				var lab;
				if(labcache[rgb]==-1)
					lab = RGBtoLAB(r,g,b);
				else
					lab = labcache[rgb];

				return new THREE.Vector3(lab[0]-50, lab[1], lab[2]);
			};
	}

		
	switch(ColorSpace.Config.colorSpace){
    	case "rgb":
    		if(ColorSpace.rgbData != null && ColorSpace.rgbData.length > 0){
				targetList =  ColorSpace.rgbData;
    		}
    		break;
    	case "xyz":
    		if(ColorSpace.xyzData != null && ColorSpace.xyzData.length > 0){
				targetList =  ColorSpace.xyzData;
    		}
    		break;
    	case "hsl":
    		if(ColorSpace.hslData != null && ColorSpace.hslData.length > 0){
				targetList =  ColorSpace.hslData;
    		}
    		break;
    	case "lab":
    		if(ColorSpace.labData != null && ColorSpace.rgbData.length > 0){
				targetList =  ColorSpace.labData;
    		}
    		break;
	}

	if(targetList.length > 0){
		var visuialize_mode = "brick";
		switch(visuialize_mode){
			case "brick":				
	    		var length = targetList.length;
	    		particleSystem = new THREE.Object3D();

	    		for(var i=0; i < length; i++){		            
			        particleSystem.add(targetList[i]);
	    		}
				break;
			case "circle":
				break;
		}
	}
	else{
		if(ColorSpace.Config.colorSpace == "hsl"){
	    //generate rgb data dynamically
		var h_step = 0.08;
		var step = 0.08;
		for(var h=0.0; h<= 1.0; h=h+h_step){
			for(var s=0.0; s<= 1.0; s=s+step){
				for(var v=0.0; v<= 1.0; v=v+step){
					var particle = toParticle(h,s,v);
					color = new THREE.Color().setHSL(h,s,v);

					particles.vertices.push( particle );
					particles.colors.push( new THREE.Color( color ) );
				}
			}
		}

		}else{
			//generate rgb data dynamically
			var step = 32;
			for(var r=0; r<256; r=r+step){
				for(var g=0; g<256; g=g+step){
					for(var b=0; b<256; b=b+step){
						var rgb = (r<<16) | (g<<8) | b;

						var particle = toParticle(r, g, b, rgb);
						particles.vertices.push( particle );
						particles.colors.push( new THREE.Color( rgb ) );
					}
				}
			}
		
		}

		var visuialize_mode = "brick";
		switch(visuialize_mode){
			case "brick":				
	    		var length = particles.vertices.length;
	    		particleSystem = new THREE.Object3D();

	    		for(var i=0; i < length; i++){		            
					var geom = new THREE.BoxGeometry(2, 2, 2);

					for ( var j = 0; j < geom.faces.length; j++ )
					{
						var face = geom.faces[j];
						face.color.copy( particles.colors[i] );
					}
					
					var cubeMaterial = new THREE.MeshBasicMaterial({ 
												color: particles.colors[i], 
												vertexColors: THREE.FaceColors,
								                transparent : false });

					object = new THREE.Mesh( geom, cubeMaterial ); 
			        object.position.copy(particles.vertices[i]);
			        particleSystem.add(object);
			        targetList.push(object);
	    		}
				break;
			case "circle":
				break;
		}		

		switch(ColorSpace.Config.colorSpace){
	    	case "rgb":
	    		ColorSpace.rgbData = targetList;	    		
	    		break;
	    	case "xyz":
				ColorSpace.xyzData = targetList;	    		
	    		break;
	    	case "hsl":
				ColorSpace.hslData = targetList;	    		
	    		break;
	    	case "lab":
				ColorSpace.labData = targetList;	    		
	    		break;
		}		
	}

	scene.add( particleSystem );

	if(renderer)
		render();
}

function checkBrowser(){
	/* File APIが利用できるか */
	var fileapi = null;
	try{
		var fileapi = window.File && window.FileReader && window.FileList && window.Blob;
	}catch(e){}
	if(!fileapi){
		alert("ブラウザがFile APIに対応していないためファイル読み込み機能は使えません。\nYour browser don't support File API. you can't load a local file.");
		return false;
	}

	/* WebGLが利用できるか */
	var maincanvas = document.getElementsByTagName("canvas")[0];
	var gl=null;
	try{
		var gl = window.WebGLRenderingContext || maincanvas.getContext('webgl') || maincanvas.getContext('experimental-webgl');
	}catch(e){}
	if(!gl){
		alert("WebGLを利用できないため3D表示ができません。新しいChromeやFireFoxでご覧ください。\nOn your browser WebGL is disable. it is recommend to use new Chrome or FireFox and enable WebGL.");
		return false;
	}

	return true;
}

function render() {
	renderer.render( scene, camera );
}

function changeCamera(p, up){
	camera.lookAt(new THREE.Vector3(0, 0, 0));
	camera.position.set(p[0], p[1], p[2]);
	camera.up.set(up[0],up[1],up[2]);
	camera.rotation.set(0,0,0);
}

window.onload = function(){

	var infoElem = document.getElementById('infobar');

	if(!checkBrowser())
		return;

	init();
	animate();

	function init() {

		var container = document.getElementById('canvas');
		container.id = 'view';
		container.width  = window.innerWidth;
		container.height = window.innerHeight;
		document.body.appendChild(container);

		// camera
		camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 1000 );
		camera.position.set(100,0,180);

		scene = new THREE.Scene();
		scene.add( camera );

		makeColorSpace();

		// Trackball controls
		controls = new THREE.TrackballControls(camera);

		controls.rotateSpeed = 1.0;
		controls.zoomSpeed = 1.2;
		controls.panSpeed = 0.8;
		controls.noZoom = false;
		controls.noPan = true;
		controls.staticMoving = true;
		controls.dynamicDampingFactor = 0.3;
		controls.keys = [ 65, 83, 68 ];

		controls.addEventListener( 'change', render );

		// renderer
		renderer = new THREE.WebGLRenderer(  { antialias: false } );
		renderer.setClearColor( bgcolor, 1 );
		renderer.setSize( window.innerWidth, window.innerHeight );
		

		container.appendChild( renderer.domElement );
		window.addEventListener( 'resize', onWindowResize, false );

		projector = new THREE.Projector();
		renderer.domElement.addEventListener( 'mousedown', onDocumentMouseDown, false );

		// fileselector
		var fileselector = document.getElementById('fileselector');
		fileselector.addEventListener("change", function(evt){
			evt.preventDefault();
			loadLocalFiles(this.files);
		}, false);
		window.addEventListener("dragover", function(evt){
			evt.preventDefault();
		}, false);
		window.addEventListener("drop", function(evt){
			evt.preventDefault();
			loadLocalFiles(evt.dataTransfer.files);
		}, false);


		if(ColorSpace.Config.gui){
			// GUI
			gui = new dat.GUI();
			var fview = gui.addFolder('View');
			fview.add(viewChanger, 'top');
			fview.add(viewChanger, 'bottom');
			fview.add(viewChanger, 'front');
			fview.add(viewChanger, 'back');
			fview.add(viewChanger, 'left');
			fview.add(viewChanger, 'right');
			var fgeneral = gui.addFolder('ColorSpace');
			fgeneral.add(scriptConfig, 'lab');
			fgeneral.add(scriptConfig, 'xyz');
			fgeneral.add(scriptConfig, 'rgb');
			fgeneral.add(scriptConfig, 'hsl');
			fgeneral.open();			
		}
	}

	function updateOutline(x, y){
		mouse.x = ( x / window.innerWidth ) * 2 - 1;
		mouse.y = - ( y / window.innerHeight ) * 2 + 1; 
		var vector = new THREE.Vector3( mouse.x, mouse.y, 1 );
		projector.unprojectVector( vector, camera );
		var ray = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() );

		// create an array containing all objects in the scene with which the ray intersects
		var intersects = ray.intersectObjects( targetList );
		// if there is one (or more) intersections
		if ( intersects.length > 0 )
		{
			var sel_color = intersects[0].face.color.getHexString();
			infoElem.innerHTML = '<p style="border-left:14px solid #' + sel_color + '">'+sel_color+'</p>';

			if(outline)
				particleSystem.remove(outline);

			var geom = new THREE.BoxGeometry(2, 2, 2);
			var cubeMaterial = new THREE.MeshBasicMaterial({ 
										color: "#aaaa00",
										side: THREE.BackSide });

			outline = new THREE.Mesh( geom, cubeMaterial ); 
	        outline.position.copy(intersects[0].object.position);
	        outline.scale.multiplyScalar(1.4);

	        particleSystem.add(outline);				
	        render();
		}
	}

	function onDocumentMouseDown(evt){
		var evt = evt || window.event;
		evt.preventDefault();
		
		if(evt.altKey)
			return;
		
		updateOutline(evt.clientX, evt.clientY)
	};

	function onWindowResize() {

		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();

		renderer.setSize( window.innerWidth, window.innerHeight );

		controls.handleResize();

		render();

	}


	function animate() {
		requestAnimationFrame( animate );
		controls.update();
	}
}