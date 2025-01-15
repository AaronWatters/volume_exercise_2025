
var info = $("#info");

//var DATA_FILE = "./helices.json";
var json_data = null;

function load_config(data_file) {
    debugger;
     $.getJSON(data_file, setup).fail(on_load_failure);
};

var on_load_failure = function() {
    alert("Could not load local JSON data.\n" +
            "You may need to run a web server to avoid cross origin restrictions.")
};

var renderer, scene, camera, orbitControls, clock, material;
let pointLight, ambientLight;

const settings = {
    color: "0xd4af37",
    metalness: 0.8,
    roughness: 0.0,
    ambientIntensity: 1.0,
    aoMapIntensity: 1.0,
    envMapIntensity: 1.0,
    displacementScale: 2.436143, // from original model
    normalScale: 1.0
};

var addSlider = function(path, attribute) {
    var div = $(path);
    $("<div>" + attribute + "</div>").appendTo(div);
    var slider = $("<div/>").appendTo(div);
    var update = function () {
        var value = + slider.slider("option", "value");
        settings[attribute] = value;
        reset_settings();
    };
    slider.slider({
        min: 0.0,
        max: 1.0,
        step: 0.01,
        value: settings[attribute],
        slide: update,
        change: update,
    });
};

var reset_settings = function () {
    material.metalness = settings.metalness;
    material.roughness = settings.roughness;
    ambientLight.intensity = settings.ambientIntensity;
};

var setup = function(data) {
    json_data = data;
    info.html("json data read.");
    
    //set_up_controls();
    addSlider("#roughnessSlider", "roughness");
    addSlider("#metalnessSlider", "metalness");
    addSlider("#ambientSlider", "ambientIntensity");

    var colorInput = $("#colorInput");
    var colorChange = function() {
        var colorString = colorInput.val();
        var color = parseInt(colorString);
        if ((!isNaN(color)) && (color >=0 ) && (color <= 0xffffff)) {
            info.html("changing color: " + color);
            material.color = new THREE.Color(color);
        } else {
            info.html("bad color int: " + colorString);
        }
    };
    colorInput.val(settings.color);
    //colorInput.change(colorChange);
    $("#colorUpdate").click(colorChange);

    var center = data.center;
    var radius = data.radius;
    //var pointSize = radius * 0.008;
    radius_multiple = 2.0;
    var container = $("#dot_cloud");
    container.empty();
    var canvas = document.createElement( 'canvas' );
    var context = canvas.getContext( 'webgl2', { alpha: false } ); 
    renderer = new THREE.WebGLRenderer( { canvas: canvas, context: context } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( container.width(), container.height() );
    renderer.setClearColor( 0xffffff);
    renderer.outputEncoding = THREE.sRGBEncoding;
    container[0].appendChild( renderer.domElement );
    camera = new THREE.PerspectiveCamera( 45, container.width()/container.height(), 0.1, 10000 );
    var cx = center[0];
    var cy = center[1];
    var cz = center[2];
    camera.position.x = cx;
    camera.position.y = cy;
    camera.position.z = cz + radius * radius_multiple;
    //camera.lookAt(cx, cy, cz);
    camera.lookAt(new THREE.Vector3(cx, cy, cz));
    scene = new THREE.Scene();

    /*
    // bounding sphere for debugging
    var g = new THREE.SphereGeometry(radius, 12, 12);
    var m = new THREE.MeshNormalMaterial();
    m.wireframe = true;
    var c = new THREE.Mesh(g, m);
    c.position.set(cx, cy, cz);
    scene.add(c);
    */

    // env map
    // view-source:https://threejs.org/examples/webgl_materials_displacementmap.html

    const path = "./textures/cube/pisa/";
    const format = '.png';
    const urls = [
        path + 'px' + format, path + 'nx' + format,
        path + 'py' + format, path + 'ny' + format,
        path + 'pz' + format, path + 'nz' + format
    ];

    const reflectionCube = new THREE.CubeTextureLoader().load( urls );
    reflectionCube.encoding = THREE.sRGBEncoding;

    const geometry = new THREE.BufferGeometry();
    const positions = data.vertices;
    const normals = data.normals;
    geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ));
    geometry.setAttribute( 'normal', new THREE.Float32BufferAttribute( normals, 3 ));
    //geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 );
    geometry.computeBoundingSphere();
    //const material = new THREE.MeshNormalMaterial();
    material = new THREE.MeshStandardMaterial( {

        color: parseInt(settings.color),
        //color: 0x887744,
        roughness: settings.roughness,
        metalness: settings.metalness,

        //normalMap: normalMap,
        //normalScale: new THREE.Vector2( 1, - 1 ), // why does the normal map require negation in this case?

        //aoMap: aoMap,
        //aoMapIntensity: 1,

        //displacementMap: displacementMap,
        //displacementScale: settings.displacementScale,
        //displacementBias: - 0.428408, // from original model

        envMap: reflectionCube,
        envMapIntensity: settings.envMapIntensity,

        side: THREE.DoubleSide

    } );
    const mesh = new THREE.Mesh( geometry, material );
    scene.add( mesh );

    // view-source:https://threejs.org/examples/webgl_materials_displacementmap.html

    ambientLight = new THREE.AmbientLight( 0xffffff, settings.ambientIntensity );
    scene.add( ambientLight );

    pointLight = new THREE.PointLight( 0xff0000, 0.5 );
    pointLight.position.z = 2500;
    scene.add( pointLight );

    const pointLight2 = new THREE.PointLight( 0xff6666, 1 );
    camera.add( pointLight2 );

    const pointLight3 = new THREE.PointLight( 0x0000ff, 0.5 );
    pointLight3.position.x = - 1000;
    pointLight3.position.z = 1000;
    scene.add( pointLight3 );

    renderer.render(scene, camera);
    orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
    orbitControls.center.set( cx, cy, cz );
    orbitControls.update();
    renderer.render(scene, camera);
    // orbitControls.userZoom = false;
    clock = new THREE.Clock();
    animate();

    info.html("running animation and interactive controls.");
};

var pointsGeometry;

var get_point_arrays = function() {
    var positions = [];
    var colors = [];
    //var sizes = [];
    var halos = json_data.halos;
    for (var halo in halos) {
        var halo_detail = halos[halo];
        //var size = 1
        var color = halo_detail.color || [1, 1, 1];
        var points = halo_detail.points;
        var show_halo = !(halo_detail.hidden);
        for (point in points) {
            var point_position = points[point];
            //sizes.push(size);
            for (var i=0; i<3; i++) {
                if (show_halo) {
                    positions.push(point_position[i]);
                    colors.push(color[i]);
                } else {
                    positions.push(-5000);  // degenerate value
                    colors.push(0);
                }
            }
        }
    }
    var unlabelled = json_data.unlabelled;
    var unlabelled_color = [0.4, 0.4, 0.1]
    var show_unlabelled = !(json_data.hide_unlabelled);
    for (var point in unlabelled) {
        var point_position = unlabelled[point];
        for (var i=0; i<3; i++) {
            if (show_unlabelled) {
                positions.push(point_position[i]);
                colors.push(unlabelled_color[i]);
            } else {
                positions.push(-5000);  // degenerate value
                colors.push(0);
            }
        }
    }

    positions = new Float32Array( positions);
    colors = new Float32Array( colors);
    //sizes = new Float32Array( sizes);
    return {
        positions: new THREE.BufferAttribute( positions, 3 ),
        colors: new THREE.BufferAttribute( colors, 3 ),
        //sizes: new THREE.BufferAttribute( sizes, 1 ),
    };
};

var animate = function() {
    //that.surfaces.check_update_link();
    var delta = clock.getDelta();
    var elapsed = clock.elapsed
    orbitControls.update(delta);
    renderer.render( scene, camera );
    var elapsed = clock.elapsedTime;
    pointLight.position.x = 2500 * Math.cos( elapsed );
    pointLight.position.z = 2500 * Math.sin( elapsed );
    //normals.sync_camera(that.camera);
    //velocities.sync_camera(that.camera);
    requestAnimationFrame( animate );
};

var set_up_controls = function() {
    // do nothing for now.
}

info.html("main.js loaded.")

