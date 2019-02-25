import React, { Component } from 'react';
import * as THREE from 'three';
import * as OrbitControls from 'three-orbitcontrols';
import * as _ from 'lodash';
let DEGS_TO_RADS = Math.PI / 180;
let DIGIT_0 = 48;
let DIGIT_9 = 57; 
let COMMA = 44; 
let SPACE = 32 
let PERIOD = 46; 
let MINUS = 45; 

export default class ThreeJSChart extends Component {
    constructor(props) {
        super(props);
        this.start = this.start.bind(this)
        this.stop = this.stop.bind(this)
        this.animate = this.animate.bind(this)
    }

    shouldComponentUpdate(nextProps) {
		return !_.isEqual(this.props, nextProps);
	}

    componentDidUpdate(){
        if (this.scene) {
            while(this.scene.children.length > 0){ 
                this.scene.remove(this.scene.children[0]); 
            }
            this.mount.removeChild(this.renderer.domElement)
            this.animate();
        }
        const width = this.props.width;
        const height = 500;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(
            50 * 17 / this.props.country.zoom, width/height,3,1000
        )
        camera.position.set( 0, 0, 100 );
        const renderer = new THREE.WebGLRenderer({antialias: true})
        renderer.setClearColor('#fff')
        renderer.setSize(width, height)
        // const geometry = new THREE.BoxGeometry( 1, 1, 1 );
        // const material = new THREE.MeshBasicMaterial( {color: 0x00ff00} );
        
        //
        const group = new THREE.Group();
        scene.add( group );
        //
        const directionalLight = new THREE.DirectionalLight( 0x67c2ff);
        // directionalLight.position.set( 0.75, 0.75, 1.0 ).normalize();
        scene.add( directionalLight );
        const ambientLight = new THREE.AmbientLight( 0x67c2ff, 0.2 );
        scene.add( ambientLight );
        //
        //   const helper = new THREE.GridHelper( 160, 50 );
        //   helper.rotation.x = Math.PI / 2;
        //   group.add( helper );

        const obj = this.initSVGObject(this.props.country.code);
        this.addGeoObject( group, obj );
        const controls = new OrbitControls( camera, renderer.domElement );
        controls.enableDamping = true
        controls.dampingFactor = 0.25
        controls.enableZoom = true
        controls.enabled = false;
        const colors = [0x86CAED,0x72bcED,0x60b8ED,0x48b3ec,0x36acec,0x24a7ec,0x12a3ec,0x009cec];
        let x = 0;
        let y = 0;
        let z = 100;
        let index = 0;
        const timer = setInterval(() => {
            if (x === -24) {
                clearInterval(timer);
            } else {
                x -= 3;
                y = 10;
                z -= 3;
                group.children[0].material.emissive.setHex(colors[index]);
                camera.position.set(x,y,z);
                controls.update();
            }
            index ++;
        }, 100);

        this.scene = scene
        this.camera = camera
        this.renderer = renderer
        this.mount.appendChild(this.renderer.domElement)
        this.start()
    }

    componentWillUnmount(){
        this.stop()
        this.mount.removeChild(this.renderer.domElement)
    }

  transformSVGPath = ( pathStr )  => {
    let path = new THREE.ShapePath();
    let idx = 1, len = pathStr.length, activeCmd,
        x = 0, y = 0, nx = 0, ny = 0, firstX = null, firstY = null,
        x1 = 0, x2 = 0, y1 = 0, y2 = 0,
        rx = 0, ry = 0, xar = 0, laf = 0, sf = 0, cx, cy;
    const eatNum = () => {
        let sidx, c, isFloat = false, s;
        // eat delims
        while ( idx < len ) {
            c = pathStr.charCodeAt( idx );
            if ( c !== COMMA && c !== SPACE ) break;
            idx ++;
        }
        if ( c === MINUS ) {
            sidx = idx ++;
        } else {
            sidx = idx;
        }
        // eat number
        while ( idx < len ) {
            c = pathStr.charCodeAt( idx );
            if ( DIGIT_0 <= c && c <= DIGIT_9 ) {
                idx ++;
                continue;
            } else if ( c === PERIOD ) {
                idx ++;
                isFloat = true;
                continue;
            }
            s = pathStr.substring( sidx, idx );
            return isFloat ? parseFloat( s ) : parseInt( s );
        }
        s = pathStr.substring( sidx );
        return isFloat ? parseFloat( s ) : parseInt( s );
    }
    const nextIsNum = () => {
        let c;
        // do permanently eat any delims...
        while ( idx < len ) {
            c = pathStr.charCodeAt( idx );
            if ( c !== COMMA && c !== SPACE ) break;
            idx ++;
        }
        c = pathStr.charCodeAt( idx );
        return ( c === MINUS || ( DIGIT_0 <= c && c <= DIGIT_9 ) );
    }
    let canRepeat;
    activeCmd = pathStr[ 0 ];
    while ( idx <= len ) {
        canRepeat = true;
        switch ( activeCmd ) {
            // moveto commands, become lineto's if repeated
            case 'M':
                x = eatNum();
                y = eatNum();
                path.moveTo( x, y );
                activeCmd = 'L';
                firstX = x;
                firstY = y;
                break;
            case 'm':
                x += eatNum();
                y += eatNum();
                path.moveTo( x, y );
                activeCmd = 'l';
                firstX = x;
                firstY = y;
                break;
            case 'Z':
            case 'z':
                canRepeat = false;
                if ( x !== firstX || y !== firstY ) path.lineTo( firstX, firstY );
                break;
            // - lines!
            case 'L':
            case 'H':
            case 'V':
                nx = ( activeCmd === 'V' ) ? x : eatNum();
                ny = ( activeCmd === 'H' ) ? y : eatNum();
                path.lineTo( nx, ny );
                x = nx;
                y = ny;
                break;
            case 'l':
            case 'h':
            case 'v':
                nx = ( activeCmd === 'v' ) ? x : ( x + eatNum() );
                ny = ( activeCmd === 'h' ) ? y : ( y + eatNum() );
                path.lineTo( nx, ny );
                x = nx;
                y = ny;
                break;
            // - cubic bezier
            case 'C':
                x1 = eatNum(); y1 = eatNum();
                break;
            case 'S':
                if ( activeCmd === 'S' ) {
                    x1 = 2 * x - x2;
                    y1 = 2 * y - y2;
                }
                x1 = 2 * x - x2;
                y1 = 2 * y - y2;
                x2 = eatNum();
                y2 = eatNum();
                nx = eatNum();
                ny = eatNum();
                path.bezierCurveTo( x1, y1, x2, y2, nx, ny );
                x = nx; y = ny;
                break;
            case 'c':
                x1 = x + eatNum();
                y1 = y + eatNum();
                break;
            case 's':
                if ( activeCmd === 's' ) {
                    x1 = 2 * x - x2;
                    y1 = 2 * y - y2;
                }
                x2 = x + eatNum();
                y2 = y + eatNum();
                nx = x + eatNum();
                ny = y + eatNum();
                path.bezierCurveTo( x1, y1, x2, y2, nx, ny );
                x = nx; y = ny;
                break;
            // - quadratic bezier
            case 'Q':
                x1 = eatNum(); y1 = eatNum();
                break;
            case 'T':
                if ( activeCmd === 'T' ) {
                    x1 = 2 * x - x1;
                    y1 = 2 * y - y1;
                }
                nx = eatNum();
                ny = eatNum();
                path.quadraticCurveTo( x1, y1, nx, ny );
                x = nx;
                y = ny;
                break;
            case 'q':
                x1 = x + eatNum();
                y1 = y + eatNum();
                break;
            case 't':
                if ( activeCmd === 't' ) {
                    x1 = 2 * x - x1;
                    y1 = 2 * y - y1;
                }
                nx = x + eatNum();
                ny = y + eatNum();
                path.quadraticCurveTo( x1, y1, nx, ny );
                x = nx; y = ny;
                break;
            // - elliptical arc
            case 'A':
                rx = eatNum();
                ry = eatNum();
                xar = eatNum() * DEGS_TO_RADS;
                laf = eatNum();
                sf = eatNum();
                nx = eatNum();
                ny = eatNum();
                if ( rx !== ry ) console.warn( 'Forcing elliptical arc to be a circular one:', rx, ry );
                // SVG implementation notes does all the math for us! woo!
                // http://www.w3.org/TR/SVG/implnote.html#ArcImplementationNotes
                // step1, using x1 as x1'
                x1 = Math.cos( xar ) * ( x - nx ) / 2 + Math.sin( xar ) * ( y - ny ) / 2;
                y1 = - Math.sin( xar ) * ( x - nx ) / 2 + Math.cos( xar ) * ( y - ny ) / 2;
                // step 2, using x2 as cx'
                var norm = Math.sqrt( ( rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1 ) /
                     ( rx * rx * y1 * y1 + ry * ry * x1 * x1 ) );
                if ( laf === sf ) norm = - norm;
                x2 = norm * rx * y1 / ry;
                y2 = norm * - ry * x1 / rx;
                // step 3
                cx = Math.cos( xar ) * x2 - Math.sin( xar ) * y2 + ( x + nx ) / 2;
                cy = Math.sin( xar ) * x2 + Math.cos( xar ) * y2 + ( y + ny ) / 2;
                var u = new THREE.Vector2( 1, 0 );
                var v = new THREE.Vector2( ( x1 - x2 ) / rx, ( y1 - y2 ) / ry );
                var startAng = Math.acos( u.dot( v ) / u.length() / v.length() );
                if ( ( ( u.x * v.y ) - ( u.y * v.x ) ) < 0 ) startAng = - startAng;
                // we can reuse 'v' from start angle as our 'u' for delta angle
                u.x = ( - x1 - x2 ) / rx;
                u.y = ( - y1 - y2 ) / ry;
                var deltaAng = Math.acos( v.dot( u ) / v.length() / u.length() );
                // This normalization ends up making our curves fail to triangulate...
                if ( ( ( v.x * u.y ) - ( v.y * u.x ) ) < 0 ) deltaAng = - deltaAng;
                if ( ! sf && deltaAng > 0 ) deltaAng -= Math.PI * 2;
                if ( sf && deltaAng < 0 ) deltaAng += Math.PI * 2;
                path.absarc( cx, cy, rx, startAng, startAng + deltaAng, sf );
                x = nx;
                y = ny;
                break;
            default:
                throw new Error( 'Wrong path command: ' + activeCmd );
        }
        // just reissue the command
        if ( canRepeat && nextIsNum() ) continue;
        activeCmd = pathStr[ idx ++ ];
    }
    return path;
  };

  addGeoObject = ( group, svgObject ) => {
    let paths = svgObject.paths;
    let depths = svgObject.depths;
    let colors = svgObject.colors;
    let center = svgObject.center;
    for ( let i = 0; i < paths.length; i ++ ) {
        let path = this.transformSVGPath( paths[ i ] );
        let color = new THREE.Color( colors[ i ] );
        let material = new THREE.MeshLambertMaterial( {
            color: color,
            emissive: color
        } );
        let depth = depths[ i ];
        let simpleShapes = path.toShapes( true );
        for ( let j = 0; j < simpleShapes.length; j ++ ) {
            let simpleShape = simpleShapes[ j ];
            let shape3d = new THREE.ExtrudeBufferGeometry( simpleShape, {
                depth: depth,
                bevelEnabled: false
            } );
            const mesh = new THREE.Mesh( shape3d, material );
            mesh.rotation.x = Math.PI;
            mesh.translateZ( - depth - 1 );
            mesh.translateX( - center.x );
            mesh.translateY( - center.y );
            group.add( mesh );
        }
    }
  };

    initSVGObject = (country) => {
        let obj = {
            vn: {},
            ke: {},
            ar: {},
            co: {},
            in: {},
            sa: {}
        };
        obj.ke.paths = ["M145.16188177058768,283.6774371923935L142.7114149961199,285.0725155480656L141.85689324912605,286.527085007526L140.54997763607656,286.78729832823217L140.0473177849036,289.24830993090484L138.928899616044,290.65704777692827L138.25030881696063,292.9846693658382L136.84286123367656,294.14033894995146L131.8288292182271,290.64520708690003L131.59006578892001,288.6151588004915L118.93560403564278,281.50260586933763L118.34497871051468,281.1185172835594L118.30727922167668,277.41395844243897L119.31259892402248,276.001888023375L121.03420891428955,273.69153898845764L122.30342503850112,271.1441896045032L120.75774599614444,267.13464478876267L120.35561811520618,265.3829160060512L118.6968406063357,262.9490094791642L120.8457114700997,260.8627628238878L123.20821277061222,258.5491378214356L125.03035473111387,259.1366737432716L125.03035473111387,261.10585344894963L126.22417187764951,262.25575960605653L128.64950565955863,262.25575960605653L133.07291234988,265.2290044217571L134.16619752618095,265.26452313628187L134.9830197843369,265.1698056837367L135.76214255365485,265.5723355764164L138.08694436532946,265.8505257594584L139.11739706023386,264.3882767855101L142.30928711518166,262.9253116161518L143.71673469846573,264.1099563737851L146.10436899153692,264.1099563737851L143.05071039566158,268.0752613214253L143.0884098844996,280.7935288644879Z"];
        obj.ke.depths = [this.props.country.height];
        obj.ke.colors = [0x009CEC];
        obj.ke.center = {x: 130, y: 280 };
        
        obj.vn.paths = ["M565.7468041191447,161.29510994073962L558.7535489397022,166.09300552492977L554.399257978917,171.36313631643532L553.2494235693592,175.21552999838485L557.2455693861833,181.0387259859804L562.1465029351191,188.2067076742012L566.8966385287029,191.57843049828907L570.082245335511,195.95068840593223L572.4761628767218,205.94957400803068L571.7787223332193,215.3830919339626L567.4055816280153,218.89913404051276L561.4113629027788,222.3352522376492L557.1324709196696,226.762057135302L550.6104593507016,231.6979935191107L548.7066351643842,228.3070434335628L550.1769152290648,224.7030157860713L546.2938678787544,221.6864626340555L550.8178065393104,219.5400175136314L556.3219319096534,219.15190788540747L554.0222630905375,215.91689833871934L562.8250937342024,211.79519571355536L563.4659850444478,205.35720868353684L562.2596014016328,201.7606133707761L563.2020886225821,196.35483607576555L561.8826065132533,192.50956005226095L557.9241601852669,188.71546311861044L554.6254549119448,183.89534108078567L550.2711639511598,177.37889540298875L543.9941990596386,174.07092079002643L545.5021786131571,172.07848516680684L548.857433119736,170.61893839541904L546.821660722486,165.7518862137655L540.3750481311936,165.70449766596982L538.0188300788208,160.59924030154414L534.9651714829456,156.14287039846494L537.773783401374,154.75109568404025L541.9395769179695,154.77991620256182L547.0478576555137,154.1263881136689L551.4963973383935,151.09174960112483L554.0222630905375,153.23169693236525L558.8100981729592,154.27059610135797L557.9807094185239,157.53218229420025L560.4688756818296,159.826412442054Z"];
        obj.vn.depths = [this.props.country.height];
        obj.vn.colors = [0x009CEC];
        obj.vn.center = { x: 550, y: 190 };

        obj.co.paths = ["M-394.64767402803653,277.6945824513574L-396.89079361389554,276.4538711006446L-399.4732085992961,274.72572008628975L-400.9623384083958,275.5587829687431L-405.3920283468568,274.8320693384634L-406.6738109673476,272.572070488027L-407.6539976771347,272.6607016839522L-412.894226625612,269.6647124038671L-413.5916671691144,268.0423414903998L-411.65014349395915,267.6522264065687L-411.8763404269869,265.02737671859217L-410.6511070397531,263.1291269289299L-408.04984230993335,262.77425504073875L-405.8444222129124,259.48181161954L-403.84634930450017,256.7291219631016L-405.7690232352365,255.47654478725184L-404.78883652544937,252.42789441573407L-405.9575206794263,247.62303236945334L-404.84538575870624,246.24252875992482L-405.6747745131415,241.78473008963516L-407.7859458880676,238.97241048355625L-407.1073550889842,236.40719146008183L-405.42972783569473,236.79171038289724L-404.4495411259076,235.2174440301029L-405.65592476872257,232.10128826096346L-405.0150334584771,231.33047661781342L-402.3195200065625,231.49183382684717L-398.3799234229951,227.79518565219618L-396.2310525592311,227.22928315424042L-396.17450332597406,225.4765606257833L-395.21316636060595,220.97430222865808L-392.2160569979877,218.50183574035378L-388.9173517246657,218.40249538532237L-388.50265734744806,217.29125555126146L-384.3934130641098,217.7340405165021L-380.28416878077155,215.0391827949051L-378.22954663910235,213.843925022933L-375.70368088695864,211.2598617004L-373.85640593389826,211.5865305476774L-372.4803745913125,213.0012199436004L-373.49826078993766,214.80383037244283L-376.8535152965166,215.69977982184452L-378.1918471502643,218.36637004989282L-380.20876980309555,219.89194189892848L-381.7355991010332,221.8757191839062L-382.3764904112786,225.67438961684906L-383.8279207315403,228.77387908207282L-381.1135575352067,229.1329047584301L-380.45381648054234,231.56354395483947L-379.2851323265654,232.7284762088892L-378.8892876937668,234.85949864195578L-379.51132925959314,236.81853483312372L-379.32283181540333,237.91806552060805L-378.02219945049353,238.35594413216603L-376.77811631884066,240.2048680396449L-370.0487575612637,239.6958853517113L-367.0139487098075,240.36557751313595L-363.3193988036868,244.8970288938802L-361.2082274287607,244.33547328101469L-357.43827854496413,244.62072195908078L-354.46001892676486,244.01453344820175L-352.5938942292855,244.92376683574582L-353.53638145023467,247.75659623974195L-354.7050656042116,249.52800897866345L-355.11975998142924,253.29029136755145L-354.0641742939662,256.782415178265L-352.5750444848665,258.3365287225803L-352.4053967850957,259.51732012873777L-355.0443610037533,262.12656257445644L-353.15938656185506,263.2799416220101L-351.7645054748503,265.11606777219936L-350.1622771992367,270.3384190459309L-351.14246390902383,270.98550081184834L-352.1791998520679,267.8916170191712L-353.6306301723295,266.2334894212582L-355.36480665887603,268.03347540727884L-365.5625183895458,267.91821561936973L-365.4871194118698,271.19823386605213L-362.43346081599464,271.73891772377664L-362.6031085157655,273.7419748081869L-363.65869420322855,273.2013442517241L-366.5992543325899,274.0610305398055L-366.61810407700887,277.87182754451146L-364.29958551347386,279.7772464203477L-363.4890465034577,282.7818703771006L-363.60214496997156,285.0512236589884L-365.95836302234443,299.42815425714264L-368.57847749658305,296.63850103944407L-370.14300628335866,296.5141630555153L-366.7689020323607,291.17052877353984L-370.7838975936041,288.72223707824475L-373.91295516715525,289.17457469362915L-375.81677935347255,288.26105774774936L-378.7007902495769,289.65355082697107L-382.60268734430645,288.9971841261912L-385.6751956846006,283.49986538614365L-388.10681271464944,282.1525445703901L-389.78443996793885,279.67975770966154L-393.25279294103177,277.19829746859017Z"];
        obj.co.depths = [this.props.country.height];
        obj.co.colors = [0x009CEC];
        obj.co.center = { x: -380, y: 250 };

        obj.sa.paths = ["M85.58726453439203,433.14613295498117L88.09428054211679,430.2062538154514L90.148902683786,431.83559347635685L91.03484067147818,434.37851937457856L93.39105872385103,434.8134658969074L96.68976399717305,435.9477823570308L99.49837591560156,435.5120402431363L104.17311253150925,432.4602796505162L104.17311253150925,410.8254128387615L105.58684336293308,411.68481378021653L108.6970511920652,417.1981095152066L108.20695783717169,420.75303309856986L109.37564199114863,422.80562508703713L113.12674113052614,422.2100216777085L115.7468556047649,419.59564104271544L118.23502186807063,417.8484592358736L119.51680448856143,415.0641509427476L122.06151998512418,413.72026832966264L124.26694008214515,414.41641084444814L126.77395608986988,416.0467248687727L131.03399832855993,416.33193188777534L134.38925283513896,414.9757873389856L134.9170456788705,413.17168434476855L135.82183341098167,410.40585347713875L138.68699456266702,409.94754555649365L140.25152334944275,407.7866905674392L142.00454958040805,403.97693447966145L146.69813594073491,399.7151384102334L154.10608549739507,395.54364916844486L156.2361066167402,395.61060233768063L158.76197236888393,396.5676919442061L160.5338483442684,395.8880396955158L163.32361051827775,396.4527802350076L165.83062652600248,404.4605526153907L167.1878081241693,408.52571891569676L166.26417064763913,414.96596985217684L166.69771476927576,417.0503885973021L164.05875055061816,415.98773118884884L162.55077099709948,416.4007925860796L162.06067764220595,418.0949650592617L160.62809706636327,420.2878593428626L160.66579655520127,422.3092519388019L163.7948541287524,425.4924915726144L166.86736246904653,424.86457491985834L167.9229481565096,422.2497120103302L171.900244228915,422.2993282481639L170.5807621195862,426.58031328789735L169.9775702981788,431.503351114816L168.620388700012,434.19653889161066L165.0389372604052,437.2162248400001L164.02105106178016,438.09043673009376L161.7967812203402,441.14987833699365L160.3453509000785,444.25578871861507L157.36709128187925,448.6295874694023L151.44827153431862,454.9702097967965L147.75372162819795,458.69936102817826L143.79527530021153,461.5418954959754L138.3288494187064,463.9734258202541L135.67103545562978,464.3034225293218L134.99244465654635,466.05257441636866L131.80683784973837,465.1132997363219L129.20557311991863,466.3197133373965L123.53180004980473,465.10263556676307L120.36504298741559,465.8709958024933L118.19732237923263,465.5400396170885L112.80629547540352,468.03256479216066L108.32005630368556,469.0414357752346L105.09675000803941,471.44253446088896L102.7028324668287,471.59364146973184L100.49741236980759,469.3315723904136L98.72553639442326,469.2133494266877L96.4635670641453,466.3838464647814L96.21852038669853,467.26110258712293L95.52107984319612,465.5613854877829L95.55877933203412,461.8810217158595L93.86230233432568,457.6989746139494L95.53992958761513,456.56387223952913L95.40798137668224,451.82754775846286L91.97732789242734,446.09829777956526L89.35721341818872,440.9556540793318L89.33836367376972,440.94543348549195ZM151.73101770060325,435.41074881683323L149.4501986259064,433.5701230449722L146.99973185143853,434.7831109213385L144.15342044417216,437.1349661498664L141.36365827016266,440.94543348549195L145.30325485373007,445.60365166335316L147.16937955120943,444.99621802393324L148.1307165165776,443.06481645044886L151.05242690151996,442.11170202101897L151.93836488921212,440.1487603881821L153.5405931648257,437.2162248400001Z"];
        obj.sa.depths = [this.props.country.height];
        obj.sa.colors = [0x009CEC];
        obj.sa.center = { x: 130, y: 430 };

        obj.in.paths = ["M407.55974895504,77.8848086560435L413.17697279189673,85.36324639011221L412.6491799481652,90.51061262142113L414.7415015786723,93.72155840232412L414.57185387890155,96.8928863472822L410.80190499510485,96.06229574175163L412.27218505978567,102.87049538820082L417.41816528616795,106.74543032517661L424.6941666318955,110.99481634419715L421.37661161415434,113.73614508440818L419.34083921690427,119.3539212257879L424.4114204656108,121.61505070622397L429.3500535033842,124.52039545902028L436.173660983056,127.8418525558989L443.3554136066886,128.5998029221389L446.3713727137257,131.59314275396898L450.42406776380716,132.14855720911555L456.7198823997474,133.5152960353797L461.0741733605326,133.41635024285856L461.6773651819398,131.09684595557349L460.9987743828566,127.36269339437311L461.3946190156551,124.81120557098089L464.5990755668823,123.56681481268828L465.0326196885187,128.22093752557117L465.1457181550328,129.40665493534735L469.8958537486165,131.63283053690103L473.19455902193835,130.71941261926318L477.6053992159806,131.1067755179669L481.88429119908983,130.9379527877704L482.2612860874693,127.32274755092448L480.1312649681242,125.43249602122691L484.3536077179764,124.69088635052415L489.1037433115601,120.27348972841446L495.1545112700536,116.4651072015476L499.54650171967654,117.9365417092533L503.2787511146352,115.40755730513104L505.7292178891031,119.13140427481795L503.9573419137188,121.63520273204654L509.6122652394135,122.53131747606179L509.9892601277933,124.78112788168923L508.16083491915197,125.86303906345938L508.59437904078845,129.496244086797L504.84327990141077,128.43033760359154L498.07622165499595,132.48554829128364L498.2270196103477,135.82651348172192L495.34300871424335,140.69998131087127L495.07911229237754,143.51429945148084L492.74174398442375,148.2484051155621L488.6513494455046,146.93914118435757L488.4440022568959,152.85619404268715L487.2564683584998,154.78952280457884L487.82196069106925,157.19705480209933L485.2395457056687,158.5367176457816L482.46863327607804,149.5263440412625L481.03605270023553,149.54568993418118L480.1689644569622,153.18356579877317L477.30380330527686,150.2321459473563L478.92488132530934,146.9779676192791L481.26224963326325,146.64787751767687L483.67501691889316,141.77620877911366L480.6590578118557,140.78809781869438L475.81467349617725,140.866414371239L470.8194912251468,140.07305710302157L470.36709735909096,136.04340480496305L467.86008135136643,135.7476268675286L463.71313757918995,133.22831322399887L461.86586262612957,137.18588182664564L465.6358115099263,140.2592335049616L462.37480572544246,142.4113952219955L461.20612157146536,144.50838952220573L464.4294278671115,146.0552844087703L463.5434898794192,149.50699764833865L465.3530653436415,153.78979817272014L466.16360435365783,158.4506641961285L465.42846432131756,160.51340692385645L461.86586262612957,160.44664135473047L455.4004002904186,161.60948645473997L455.70199620112237,165.83717891534025L452.91223402711273,169.1380921252848L445.3723362595196,172.88726876029833L439.5100657452159,179.39727292980882L435.5704691616485,182.87274971775378L430.3679397020092,186.46580662268093L430.3490899575902,188.97437112881175L427.7478252277706,190.32336481765736L423.0165393786059,192.27915652434396L420.5849223485571,192.56484967752837L419.0015438173625,196.70375782324126L420.0948289936635,203.74275684454506L420.3775751599483,208.20720280915953L418.15330531850816,213.3003008564557L418.1344555740892,222.3712886772675L415.42009237775585,222.63252962383606L413.04502458096397,226.6811788910309L414.62840311215854,228.4327413840707L409.8594177741558,229.94046533761622L408.1063915431905,233.53457954118582L405.99522016826444,235.05637593168765L401.0377373860716,230.11090701657335L398.62497010044206,222.67756704693872L396.6080474476107,217.3002932572643L394.7796222389694,214.77667190145468L391.9898600649599,209.62535991628516L390.6892277000501,202.89365499195355L389.78443996793897,199.5188364814814L385.01545462993624,192.06714232301687L382.84773402175324,181.45796867771492L381.2832052349777,174.3900544564664L381.3020549793967,167.64526688431357L380.28416878077155,162.39965844731108L372.66887203550243,165.7518862137655L368.97432212938173,165.08820452306483L362.15071464971,158.2689653494757L364.6577306574347,156.21958596685585L363.11205161507814,153.99176973234665L356.9670349344896,149.15867696832095L360.4542376520015,145.32602699935882L371.99028123641904,145.34548333991086L370.934695548956,140.39638459703255L367.9941354195947,137.45153156926494L367.4097933426062,132.9610123810896L363.9791398583513,130.331823490173L369.74716165056003,124.14917005858356L375.83562909789157,124.60063211668265L381.3020549793967,118.35196694849927L384.5819105082997,112.25451701323078L389.67134150142505,106.15653386879512L389.5959425237492,101.78832812420069L394.04448220662914,98.21507717231233L389.8221394567769,95.14615802179165L388.01256399255465,90.91434218443445L386.14643929507525,85.3954373537295L388.7288542804759,82.65220345831688L396.66459668086776,84.20307069051483L402.5080174507525,83.2558600723213Z"];
        obj.in.depths = [this.props.country.height];
        obj.in.colors = [0x009CEC];
        obj.in.center = { x: 440, y: 140 };

        obj.ar.paths = ["M-350.5958213208733,622.2364343587337L-353.76257838326245,621.989933605941L-359.36095247570034,621.9745328081651L-359.36095247570034,602.198998124303L-357.36287956728825,606.2216500073139L-354.7427650930496,612.8181952819923L-347.9380073577967,618.1901701849757L-340.6054567788123,620.4377069456007L-342.9616748311852,625.0055306545239L-347.9380073577967,625.4561354082579ZM-328.2211746955405,396.4432050117518L-318.58895529744024,405.72912050761397L-314.31006331433116,406.5922113840799L-307.9199999562959,410.84493320650154L-302.52897305246677,413.103141371201L-301.7749832757075,415.66335566533814L-306.9209635020899,424.5458630162358L-301.64303506477466,426.14097420870945L-295.76191480605195,427.04993538245213L-291.6149710338757,426.1010489794757L-286.864835440292,421.59512297634325L-286.01659694143774,416.4499830006754L-283.4153322116181,415.3293090315957L-280.79521773737946,418.6869421088107L-280.9083162038934,423.3620034680363L-285.3191563979354,426.61027902699175L-288.8252088598662,429.0220696834807L-294.74402860742686,434.7932290818451L-301.71843404245055,443.0032792505019L-303.0379161517794,447.87421656589174L-304.432797238784,454.1855229181492L-304.37624800552715,460.36717494844834L-305.5260824150851,461.7644233633433L-305.92192704788374,465.82828033513135L-306.2800721918444,469.12738563827014L-299.6261124119434,474.59240629408225L-300.34240269986475,479.0411961294599L-297.08139691538076,481.86348351458804L-297.3452933372465,485.0561335709642L-302.378175097115,493.51751129981153L-310.14426979773594,497.10483489013734L-320.6435774391094,498.5040019880907L-326.3927494868992,497.8323462180312L-325.2806145661792,501.8536227828219L-326.3550499980613,506.9520870719929L-325.3937130326931,510.4212792459218L-328.5416203506632,512.8583016869001L-333.8949477656544,513.8226286514633L-338.9278295255229,511.28681411326636L-340.9636019227731,513.1050694852769L-340.2284618904327,520.0576834334365L-336.68470993966395,522.1873817155152L-333.81954878797853,519.9622045041074L-332.27386974562194,523.6409322235422L-337.0805545724626,525.8483738113217L-341.28404757789576,530.3089717183295L-342.05688709907406,537.6393943050468L-343.30097023072693,541.5840343407549L-348.23960326850045,541.6091172931503L-352.34884755183873,545.4138263906011L-353.85682710535735,551.0580683835346L-348.710846878975,556.6500977379184L-343.69681486352556,558.2003547994L-345.50639032774797,565.1907494243462L-351.68910649717435,569.637152312537L-355.08206049259127,579.0390722654221L-359.86989557501295,582.2697971730195L-361.999916694358,586.115119798662L-360.32228944106856,594.8093437777253L-356.8350867235567,599.7390975947162L-359.04050682057766,599.3040948162875L-363.88489113625633,597.9587475568721L-376.5519193858128,596.8196559962754L-378.7196399939958,591.8988377207629L-378.60654152748197,585.653344450978L-382.0937442449938,586.1851337794899L-383.94101919805416,583.1997755657254L-384.3934130641098,574.5955991904277L-380.3784175028664,571.0764297741896L-378.7196399939958,566.054806195107L-379.3416815598223,562.0953785243955L-376.5519193858128,555.5074488375567L-374.6480951994956,545.4897657126824L-375.21358753206505,541.1202670841456L-372.91391871294917,539.7195093152411L-373.47941104551865,536.9441304949423L-375.91102807556746,535.4827886924152L-374.17685158902094,532.4275559609582L-376.5519193858128,529.6863807453745L-377.77715277304674,521.4444230020943L-375.66598139812066,520.0099414246142L-376.5519193858128,511.4975964258197L-375.32668599857897,504.4651360390495L-373.91295516715525,498.4242646360964L-370.7838975936041,495.98163423623697L-372.36727612479865,489.4978266185591L-372.38612586921766,483.46279650125257L-368.42767954123127,479.2164464754598L-368.5596277521641,473.83296700186617L-365.5625183895458,467.6252652446765L-365.54366864512684,461.8280193825966L-366.9008502432936,460.68441922598436L-369.3136175289234,449.9979683011179L-366.0903112332773,443.7318774872839L-366.5992543325899,437.88702021117706L-364.71427989069156,432.4501991524936L-361.28362640643667,426.8800328663003L-357.58907650031597,423.222865124611L-359.15360528709164,420.9213666160234L-358.06032011079054,419.042375261753L-358.22996781056145,409.3823756989925L-352.5373449960286,406.553399116799L-350.7277695318062,400.6195043221702L-351.36866084205167,399.19608741591253L-347.0143698812666,394.0816411865504L-340.1530629127568,395.45757477821655L-337.0805545724626,399.5516959512045L-335.02593243079343,394.99866790280225L-329.06941319439477,395.2280884200074Z"];
        obj.ar.depths = [this.props.country.height];
        obj.ar.colors = [0x009CEC];
        obj.ar.center = { x: -340, y: 460 };
        return obj[country];
    };

  start() {
    if (!this.frameId) {
      this.frameId = requestAnimationFrame(this.animate)
    }
  }

  stop() {
    cancelAnimationFrame(this.frameId)
  }

  animate() {
    this.renderScene()
    this.frameId =  window.requestAnimationFrame(this.animate)
  }

  renderScene() {
    this.renderer.render(this.scene, this.camera)
  }

  addElement(element){
    this.scene.add(element)
  }

  render() {
    return (
      <div>
        <div
          id="WebGL-output"
          ref={(mount) => { this.mount = mount }}
        />
      </div>

    )
  }
}