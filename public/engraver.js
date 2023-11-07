import GCodeParser from './gcode.js';

(function (){
  const VERSION = 'v1.4.0';

  const engravers = {
    DENER_FL_3015: {
      height: 1530,         // mm
      width: 3050,          // mm
      focus: [0.1, 0.1],    // unknown
      wavelength: 0,        // unknown
      laserPower: 4000,     // 4000W
      speed: 2400,          // max speed 170 m/dk
      img: 'img/fl3015s.jpg'
    },
    SCULPTFUN_S30PROMAX: {
      height: 935,          // mm
      width: 905,           // mm
      focus: [0.08, 0.1],   // 0.08×0.1mm
      wavelength: 455,      // nm
      laserPower: 20,       // 20W,
      speed: 1200,          // max speed 1200 mm/min
      img: 'img/sculptfun_s30pro.webp'
    }
  }
  const engraver = engravers.DENER_FL_3015;

  const SIM_R = Math.round(engraver.height / 500); // simulated area ratio
  const SIM_H = engraver.height / SIM_R;
  const SIM_W = engraver.width / SIM_R;

  const DEFAULT_COMMANDS = [
    '%',
    'G21 (mm)',
    'G90 (absolu)',
    '',
    'G0 X150.0 Y150.0',
    'M3',
    'G1 X450 Y150 F200',
    'G1 X450.0 Y650.0',
    'M5',
    '',
    'M2',
    '%'
  ];

  const _canvas = document.getElementById('engraver');
  const _editor = document.getElementById('editor');
  let _parser = new GCodeParser();
  let _cmd = null;       // current action
  let _mode = 'ABS';     // current mode ABS or REL
  let _pos = [            // current pos
    Math.floor(Math.random() * engraver.width * 100),
    Math.floor(Math.random() * engraver.height * 100)
  ];
  let _dest = null;      // current destination
  let _laser = false;    // if laser is on
  let _hipre = false;    // if high precision is on
  let _lines = [];
  let _first = false;    // if first point, force draw (fix for small distances)

  let _height = _canvas.height;
  let _width = _canvas.width;

  let _speed = engraver.speed;   // TODO mm/min ?

  // This object contains predefined exercise (may be use with nsix/pix)
  let _exercises = {};
  let _exercise = null;   // current exercise if any
  let _checkImage = null; // image use to check exercise completion

  let _coordinateSystems = new Array(10);
  let _coordT   = [ 0, 0 ];
  let _coordRot = [ [1, 0], [0, 1] ];

  // display current version
  document.getElementById('version').textContent = VERSION;

  // convert x from mm/100 to canvas x
  function convertX(mm) {
    let total = engraver.width * 100;
    let x = (mm / total) * _width;
    return x;
  }

  // convert y from mm/100 to canvas y
  function convertY(mm) {
    let total = engraver.height * 100;
    let y = ((total - mm) / total) * _height;
    return y;
  }

  // render canvas
  function render() {
    if (_canvas.getContext) {
      let ctx = _canvas.getContext("2d");

      // clear canvas
      ctx.fillStyle = 'rgb(150,150,150)';
      ctx.fillRect(0, 0, _width, _height);

      // draw engraved lines
      _lines.forEach(l => {
        if(l.length > 1) {
          ctx.beginPath();
          for (let idx in l) {
            let pos = l[idx];
            if (idx === 0) {
              ctx.moveTo(convertX(pos[0]), convertY(pos[1]));
            } else {
              ctx.lineTo(convertX(pos[0]), convertY(pos[1]));
            }
          }
          ctx.stroke();
        }
      });

      // draw laser spot
      if(_pos) {
        ctx.save();
        ctx.shadowBlur = 12;
        if(_laser) {
          ctx.shadowColor = 'rgb(0, 128, 255)';
          ctx.fillStyle = 'rgb(0, 128, 255)';
        } else {
          ctx.fillStyle = 'rgb(55, 55, 55)';
        }
        ctx.beginPath();
        ctx.arc(convertX(_pos[0]), convertY(_pos[1]), 4, 0, 360);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // update laser spot location
      if(_dest) {
        let dx = _dest[0] - _pos[0];
        let dy = _dest[1] - _pos[1];
        let length = Math.sqrt(dx*dx + dy*dy);
        if(length < _speed) {
          _pos[0] = _dest[0];
          _pos[1] = _dest[1];
          if(_first) {
            let line = _lines[_lines.length-1];
            line[line.length-1] = [_pos[0], _pos[1]];
          }
          _dest = null;
          _cmd = null;
        } else {
          let steps = length / _speed;
          _pos[0] += dx / steps;
          _pos[1] += dy / steps;
          if(_laser) {
            let line = _lines[_lines.length-1];
            line[line.length-1] = [_pos[0], _pos[1]];
          }
        }
        _first = false;
      }
    }
  }

  // highlight command
  function highlightCmd(idx) {
    const displayContent = document.getElementById('highlighting-content');
    let highlighted = Array.from(document.querySelectorAll('.current'));
    highlighted.forEach(e => {
      e.classList.remove('current');
    })
    if(idx >= 0 && idx < displayContent.childElementCount) {
      displayContent.children[idx].classList.add('current');
    }
  }

  // display error msg
  function error(msg) {
    let elt = document.getElementById('error');
    elt.innerText = msg;
    elt.style.display = 'inline-block';
  }

  function simulateLine(start, end, img) {
    let deltax = (end[0] - start[0]) / (SIM_R * 100);
    let deltay = (end[1] - start[1]) / (SIM_R * 100);
    let x = start[0] / (SIM_R * 100);
    let y = start[1] / (SIM_R * 100);
    if (Math.abs(deltax) > 0) {
      let dy = deltay / Math.abs(deltax);
      for(let i = 0; i < Math.abs(deltax); i++) {
        img.data[((y * (SIM_W * 4)) + (x * 4))] = 200; // Red
        img.data[((y * (SIM_W * 4)) + (x * 4)) + 3] = 255; // Alpha
        x += deltax > 0 ? 1 : -1;
        y += dy;
      }
    } else if (Math.abs(deltay) > 0) { // vertical line
      for(let i = 0; i < Math.abs(deltay); i++) {
        let dx = deltax / Math.abs(deltay);
        img.data[((y * (SIM_W * 4)) + (x * 4))] = 200; // Red
        img.data[((y * (SIM_W * 4)) + (x * 4)) + 3] = 255; // Alpha
        x += dx;
        y += deltay > 0 ? 1 : -1;
      }
    }
  }

  /// Switch to another coordinates system
  function useCoordinates(idx) {
    const cs = _coordinateSystems[idx];
    if (cs) {
      if (typeof(cs['x']) === 'number') { _coordT[0] = cs['x'] * 100; }
      if (typeof(cs['y']) === 'number') { _coordT[1] = cs['y'] * 100; }
      if (typeof(cs['r']) === 'number') {
        let a = cs['r'] * Math.PI / 180;
        _coordRot = [ [Math.cos(a), -Math.sin(a)], [Math.sin(a), Math.cos(a)] ];
      }
    }
  }

  function handleCommand() {
    if(_cmd.cmd === null) {
      if (_cmd.err) {
        return _cmd.err;
      }
      return 'Commande invalide';
    } else if(_cmd.cmd.variable === 'G') {
      switch(_cmd.cmd.value) {
        case 0:  // Rapid positionning
          _speed = engraver.speed;
        case 1:       // Linear interpolation using a feed rate;
          // FIXME handle invalid syntax
          let x = _pos[0];
          let y = _pos[1];
          if('X' in _cmd.args) {
            let v = Math.round(_cmd.args['X'] * 100);
            if(_mode === 'REL') {
              x += v;
            } else {
              x = v;
            }
          }
          if('Y' in _cmd.args) {
            let v = Math.round(_cmd.args['Y'] * 100);
            if(_mode === 'REL') {
              y += v;
            } else {
              y = v;
            }
          }
          if('F' in _cmd.args) {
            _speed = Math.round(_cmd.args['F']);
          }
          x = x + _coordT[0];
          y = y + _coordT[1];
          let x2 = x * _coordRot[0][0] + y * _coordRot[0][1];
          let y2 = x * _coordRot[1][0] + y * _coordRot[1][1];
          if(x2 < 0 || x2 > engraver.width*100) {
            error('Coordonnée en x invalide : \n' + x2/100);
          } else if(y < 0 || y > engraver.height*100) {
            error('Coordonnée en y invalide : \n' + y2/100);
          } else {
            _dest = [x2, y2];
            if(_laser) {
              _first = true;
              _lines[_lines.length - 1].push([_pos[0], _pos[1]]);
              if(_checkImage) { simulateLine(_pos, _dest, _checkImage); }
            }
          }
          break;
        case 4:       // P temporisation en secondes
          if (!_cmd.args['P']) {
            error('Valeur de temporisation P manquante pour commande G4');
          } else {
            console.info('G04: Temporisation');
            setTimeout(() => {
              _cmd = null;
            }, _cmd.args['P'] * 1000);
          }
          break;
        case 10:
          if (_cmd.args['L'] === 2) { // systemes de coordonnees;
            if (!_cmd.args['P']) {
              error('Index P manquant pour commande G10 L2');
            } else {
              _coordinateSystems[_cmd.args['P']] = {
                'x': _cmd.args['X'],
                'y': _cmd.args['Y'],
                'r': _cmd.args['R']
              };
              _cmd = null;
            }
          } else {
            error('Commande G10 L' + _cmd.args['L'] + ' non prise en compte.');
          }
          break;
        case 20:      // Imperial units;
          error('Unités impériales non prises en compte.');
          break;
        case 21:      // Metric units;
          console.info('G21: Unités métriques');
          _cmd = null;
          break;
        case 54:
          console.info('G54: système de coordonnées no 1.');
          useCoordinates(1);
          _cmd = null;
          break;
        case 55:
          console.info('G55: système de coordonnées no 2.');
          useCoordinates(2);
          _cmd = null;
          break;
        case 56:
          console.info('G56: système de coordonnées no 3.');
          useCoordinates(3);
          _cmd = null;
          break;
        case 57:
          console.info('G57: système de coordonnées no 4.');
          useCoordinates(4);
          _cmd = null;
          break;
        case 58:
          console.info('G58: système de coordonnées no 5.');
          useCoordinates(5);
          _cmd = null;
          break;
        case 59:
          console.info('G59: système de coordonnées no 6.');
          useCoordinates(6);
          _cmd = null;
          break;
        case 90:      // Absolute programming;
          _mode = 'ABS';
          console.info('G90: Mode absolu');
          _cmd = null;
          break;
        case 91:      // Incremental programming;
          _mode = 'REL';
          console.info('G91: Mode relatif');
          _cmd = null;
          break;
        case 17:      // Select X-Y plane Rotation en Z;
          console.info('G17: Plan X-Y');
          break;
        case 18:      // Select Z-X plane;
        case 19:      // Select Z-Y plane;
          error('Plan suivant Z non utilisable avec ce graveur laser.');
          break;
        case 2:       // Circular interpolation clockwise;
        case 3:       // Circular interpolation, counterclockwise;
        case 5 :      // Spline cubique
        // case 5.1:     // B-Spline quadratique
        // case 5.2:     // NURBS, ajout point de contrôle
        // case 5.3:     // NURBS, exécute
        case 7:       // Mode diamètre (sur les tours)
        case 8:       // Mode rayon (sur les tours)
        case 20:      // Unites machine
        case 27:      // Reference return check;
        case 28:      // Automatic return through reference point;
        case 29:      // Move to a location through reference point;
        case 31:      // Skip function;
        case 32:      // Thread cutting operation on a Lathe;
        case 33:      // Thread cutting operation on a Mill;
        case 40:      // Cancel cutter compensation;
        case 41:      // Cutter compensation left;
        case 42:      // Cutter compensation right;
        case 43:      // Tool length compensation;
        case 44:      // Tool length compensation;
        case 50:      // Set coordinate system (Mill) and maximum RPM (Lathe);
        case 52:      // Local coordinate system setting;
        case 53:      // Machine coordinate system setting;
        case 68:
        case 69:
        case 70:      // Finish cycle (Lathe);
        case 71:      // Rough turning cycle (Lathe);
        case 72:      // Rough facing cycle (Lathe);
        case 73:      // Pattern Repeating Cycle;
        case 74:      // Left hand tapping Mill;
        case 74:      // Face grooving cycle;
        case 75:      // OD groove pecking cycle (Lathe);
        case 76:      // Boring cycle;
        case 76:      // Screw cutting cycle (Lathe);
        case 80:      // Cancel cycles;
        case 81:      // Drill cycle;
        case 82:      // Drill cycle with dwell;
        case 83:      // Peck drilling cycle;
        case 84:      // Tapping cycle;
        case 85:      // Bore in, bore out;
        case 86:      // Bore in, rapid out;
        case 87:      // Back boring cycle;
        case 92:      // Reposition origin point;
        case 92:      // Screw thread cutting cycle (Lathe);
        case 94:      // Per minute feed;
        case 95:      // Per revolution feed;
        case 96:      // Constant surface speed (Lathe);
        case 97:      // Constant surface speed cancel;
        case 98:      // Feed per minute (Lathe);
        case 99:      // Feed per revolution (Lathe)
        default:
          console.warn('Unhandled', _cmd.cmd.full);
          _cmd = null;
      }
    } else if(_cmd.cmd.variable === 'M') {
      switch(_cmd.cmd.value) {
        case 3:       //  Spindle ON (CW Rotation)
          _laser = true;
          _lines.push([[_pos[0], _pos[1]]]);
          console.info('M03: Laser ON');
          break;
        case 5:       //  Spindle Stop
          _laser = false;
          console.info('M03: Laser OFF');
          break;
        case 2:       //  End of Program
        case 30:
          _parser.stop();
          break;
        case 0:       //  Program Stop (non-optional)
        case 1:       //  Optional Stop: Operator Selected to Enable
        case 4:       //  Spindle ON (CCW Rotation)
        case 6:       //  Tool Change
        case 6:       // Appel d’outil avec Tn n=numéro d’outil
        case 7:       //  Mist Coolant ON
        case 8:       //  Flood Coolant ON
        case 9:       //  Coolant OFF
        case 19:      // Orientation de la broche
        case 48:      //
        case 49:      // Contrôle des correcteurs de vitesse
        case 50:      // Contrôle du correcteur de vitesse travail
        case 51:      // Contrôle du correcteur de vitesse de broche
        case 52:      // Correcteur dynamique de vitesse d’avance
        case 53:      // Contrôle de la coupure de vitesse
        case 60:       // Pause pour déchargement pièce
        case 61:      // Correction du numéro de l’outil courant
        case 62:      //
        case 65:      // Contrôle de sortie numérique
        case 66:      // Contrôle d’entrée numérique et analogique
        case 67:      // Contrôle sortie analogique synchronisée
        case 68:      // Contrôle sortie analogique directe
        case 70:      // Enregistre l'état modal
        case 71:      // Invalide l'état modal enregistré
        case 72:      // Restaure l'état modal
        case 73:      // Enregistrement/auto-restauration de l'état modal
        default:
          console.warn('Unhandled', _cmd.cmd.full);
          _cmd = null;
      }
      _cmd = null;
    } else {
      console.error('Unhandled command', JSON.stringify(_cmd, '', ' '));
    }
  }

  // parse commands and display engraving
  async function engrave() {
    let running = true;
    if(_cmd == null) {
      _cmd = _parser.next();
      if(!_cmd) {
        running = false;
      } else {
        highlightCmd(_cmd.idx);
        let err = handleCommand(_cmd);
        if(err) {
          return error(err);
        }
      }
    }
    render();
    if (running) {
      requestAnimationFrame(engrave);
    } else {
      highlightCmd(-1);
      showStart();
      // Check exercise result on completion
      if (_exercise) {
        const hex = await getHexHash('SHA-256');
        if(!_laser && hex === _exercise.hex) {
          document.getElementById('overlay').style.display = 'block';
          if(parent) {
            parent.window.postMessage({
              'answer': hex,
              'from': 'nsix'
            }, '*');
          }
        }
      }
    }
  }

  async function getHexHash(algorithm) {
    if(algorithm === 'SHA-1') {
      return window.sha1(_checkImage.data);
    } else if(algorithm === 'SHA-256') {
      return window.sha256(_checkImage.data);
    }
    console.error('Unavailable algorithm', algorithm);
    return '';
    // Crypto isn't available when not in secure context (eg. iframe).
    // const hash = await crypto.subtle.digest(algorithm, _checkImage.data);
    // const hashArray = Array.from(new Uint8Array(hash));
    // return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // reinit engraver in initial state
  function reinit() {
    _lines = [];
    _cmd = null;
    _laser = false;
    _mode = "ABS";
    _checkImage = null;
    if (_exercise) {
      let ctx = _canvas.getContext('2d');
      _checkImage = ctx.createImageData(SIM_W, SIM_H);
    }
  }

  function showStop() {
    const codeDisplay = document.getElementById('highlighting');
    let elt = document.getElementById('run');
    elt.style.display = 'none';
    elt = document.getElementById('running');
    elt.style.display = 'inline-block';
    codeDisplay.style.display = 'block';
  }
  function showStart() {
    const codeDisplay = document.getElementById('highlighting');
    let elt = document.getElementById('running');
    elt.style.display = 'none';
    elt = document.getElementById('run');
    elt.style.display = 'inline-block';
    elt = document.getElementById('error');
    elt.style.display = 'none';
    codeDisplay.style.display = 'none';
  }

  // Resize canvas to fit parent size
  function resizeCanvas() {
    let parentWidth = _canvas.parentElement.offsetWidth;
    let parentHeight = _canvas.parentElement.offsetHeight;
    let ratio = engraver.height / engraver.width;
    let margin = 16;
    let targetWidth = parentWidth - margin;
    let targetHeight = Math.round(targetWidth * ratio);
    if(targetHeight > parentHeight) {
      targetHeight = parentHeight - margin;
      targetWidth = Math.round(targetHeight / ratio);
    }
    _canvas.width = targetWidth;
    _canvas.height = targetHeight;
    _width = _canvas.width;
    _height = _canvas.height;
  }

  // starts engraving using editor content as commands
  function start() {
    reinit();
    const displayContent = document.getElementById('highlighting-content');
    let list = _editor.value.split('\n');
    displayContent.innerHTML = list.map(cmd => { return `<div>${cmd}</div>`; }).join('\n');
    loadCommands(list);
    showStop();
    resizeCanvas();

    _parser.init(list.values());
    engrave();
  }

  // Emergency stop engraving
  function stop() {
    _parser.stop();
    _laser = false;
    _dest = null;
    highlightCmd(-1);
    showStart();
  }

  function loadCommands(commands) {
    let content = commands.join('\n');
    _editor.value = content;
  }

  // define exercices
  _exercises['basic_square'] = {
    commands : [
      '%',
      'G21 (mm)',
      'G90 (absolu)',
      'G00 X200.0 Y200.0',
      'M03',
      'G01 X600 Y200 F400',
      'M05',
      'M02',
      '%'
    ],
    hex: 'dcebc65b022ce6df67fe3ef827b6ac671c36b3b3fd45e13b910d3d9fc6fa8758'
  };

  // if in iframe
  if ( window.location !== window.parent.location ) {
    let elt = document.getElementById('title-header');
    elt.style.display = 'none';
  }

  loadCommands(DEFAULT_COMMANDS);
  // load program from URL if provided
  // query parameter must replace line breaks with pipes (%7C)
  let purl = new URL(window.location.href);
  if(purl && purl.searchParams) {
    let p = purl.searchParams.get("program");
    if(p && p.length) {
      let commands = p.split('|');
      if(commands && commands.length) {
        loadCommands(commands);
      } else {
        console.warn('Invalid program URL parameter', p);
      }
    }
    let challenge = purl.searchParams.get("challenge");
    if(challenge !== null) {
      if (_exercises[challenge]) {
        _exercise = _exercises[challenge];
        loadCommands(_exercise.commands);
      } else {
        console.error(`Unknown exercise "${challenge}"`);
      }
    }
    let autostart = purl.searchParams.get("autostart");
    if(autostart !== null) {
      start();
    }
  }

  // Page view counter
  if (window.location.href.search('frama') > 0) {
    fetch('https://hitcounter.ileauxsciences.fr/hit/', {
      method: 'POST' });
  }
  document.addEventListener('keydown', (event) => {
    if(event.ctrlKey && event.key == "Enter") {
      start();
    }
  });

  window.engraverStart = start;
  window.engraverStop = stop;
})();