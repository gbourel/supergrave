(function (){
  const VERSION = 'v0.5.2';
  const H_mm = 1530;
  const W_mm = 3050;
  const SIM_R = 5;
  const SIM_H = H_mm / SIM_R;
  const SIM_W = W_mm / SIM_R;
  const DEFAULT_COMMANDS = [
    'INIT',
    'MOVE 150 150',
    'LASER ON',
    'MOVE 650 150',
    'MOVE 650 750',
    'LASER OFF',
    'MODE REL',
    'MOVE 750 150'
  ];

  const _canvas = document.getElementById('engraver');
  const _editor = document.getElementById('editor');
  let _commands = null;  // commands iterator
  let _cmd = null;       // current action
  let _cmdIdx = null;    // current action index
  let _mode = 'ABS';     // current mode ABS or REL
  let _pos = null;       // current pos
  let _dest = null;      // current destination
  let _laser = false;    // if laser is on
  let _hipre = false;    // if high precision is on
  let _lines = [];
  let _first = false;    // if first point, force draw (fix for small distances)

  let _height = _canvas.height;
  let _width = _canvas.width;

  let _speed = 500;

  // This object contains predefined exercise (may be use with nsix/pix)
  let _exercises = {};
  let _exercise = null;   // current exercise if any
  let _checkImage = null; // image use to check exercise completion

  // display current version
  document.getElementById('version').textContent = VERSION;

  // convert x from mm/100 to canvas x
  function convertX(mm) {
    let total = W_mm * 100;
    let x = (mm / total) * _width;
    return x;
  }

  // convert y from mm/100 to canvas y
  function convertY(mm) {
    let total = H_mm * 100;
    let y = ((total - mm) / total) * _height;
    return y;
  }

  // draw canvas
  function draw() {
    if (_canvas.getContext) {
      let ctx = _canvas.getContext("2d");

      // clear canvas
      ctx.fillStyle = 'rgb(150,150,150)';
      ctx.fillRect(0, 0, _width, _height);

      // draw engraved lines
      _lines.forEach(l => {
        ctx.beginPath();
        ctx.moveTo(convertX(l[0][0]), convertY(l[0][1]));
        ctx.lineTo(convertX(l[1][0]), convertY(l[1][1]));
        ctx.closePath();
        ctx.stroke();
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
            _lines[_lines.length-1][1] = [_pos[0], _pos[1]];
          }
          _dest = null;
          _cmd = null;
        } else {
          let steps = length / _speed;
          _pos[0] += dx / steps;
          _pos[1] += dy / steps;
          if(_laser) {
            _lines[_lines.length-1][1] = [_pos[0], _pos[1]];
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

  // parse commands and display engraving
  async function engrave() {
    let running = true;
    if(_cmd == null && _commands) {
      let val = _commands.next().value;
      _cmdIdx += 1;
      if(!val) {
        running = false;
      } else {
        _cmd = val.trim();
        let res = null;
        console.info('COMMAND:', _cmd);
        if (_cmd === 'INIT') {
          _pos = [0, 0];
          _laser = false;
          _hipre = false;
          _cmd = null;
          highlightCmd(_cmdIdx);
        } else if (res = _cmd.match(/MOVE\s+(\d+)\s+(\d+)/)) {
          let x = parseInt(res[1]);
          let y = parseInt(res[2]);
          if(!_hipre) {
            x *= 100;
            y *= 100;
          }
          if(_mode === 'REL') {
            x += _pos[0];
            y += _pos[1];
          }
          if(x < 0 || x > W_mm*100) {
            let val = _hipre ? x : Math.round(x/100);
            error('Coordonnée en x invalide : \n' + val);
          } else if(y < 0 || y > H_mm*100) {
            let val = _hipre ? y : Math.round(y/100);
            error('Coordonnée en y invalide : \n' + val);
          } else {
            _dest = [x, y];
            if(_laser) {
              _first = true;
              _lines.push([ [_pos[0], _pos[1]], [_pos[0], _pos[1]] ]);
              if(_checkImage) { simulateLine(_pos, _dest, _checkImage); }
            }
            highlightCmd(_cmdIdx);
          }
        } else if (res = _cmd.match(/LASER\s+(ON|OFF)/)) {
          _laser = res[1] === 'ON';
          _cmd = null;
          highlightCmd(_cmdIdx);
        } else if (res = _cmd.match(/MODE\s+(ABS|REL)/)) {
          _mode = res[1];
          _cmd = null;
          highlightCmd(_cmdIdx);
        } else if (res = _cmd.match(/HIPRE\s+(ON|OFF)/)) {
          _hipre = res[1] === 'ON';
          _cmd = null;
        } else {
          if(_cmd === '') {
            _cmd = null;
            highlightCmd(-1);
          } else {
            console.error('Unknown command', _cmd);
            error('Erreur commande : \n' + _cmd);
          }
        }
      }
    }
    draw();
    if(running) {
      requestAnimationFrame(engrave);
    } else {
      highlightCmd(-1);
      showStart();
      // Check exercise result on completion
      if (_exercise) {
        const hex = await getHexHash('SHA-1');
        if(!_laser && hex === _exercise.hex) {
          console.info('Ok !');
          document.getElementById('overlay').style.display = 'block';
          if(parent) {
            const answer = await getHexHash('SHA-256');
            parent.window.postMessage({
              'answer': answer,
              'from': 'pix'
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
    _commands = null;
    _lines = [];
    _cmd = null;
    _cmdIdx = -1;
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
    let ratio = H_mm / W_mm;
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
    _commands = list.values();
    loadCommands(list);
    showStop();
    resizeCanvas();
    engrave();
  }

  // Emergency stop engraving
  function stop() {
    _laser = false;
    _commands = null;
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
      'INIT',
      'MOVE 200 200',
      'LASER ON',
      'MOVE 600 200',
      'LASER OFF'
    ],
    hex: '80bfa427dff9cb3f10cc1c260c9ad904aef4367d'
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

  window.engraverStart = start;
  window.engraverStop = stop;
})();