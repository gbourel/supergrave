(function (){
  const VERSION = 'v0.4.2';
  const H_mm = 1530;
  const W_mm = 3050;
  const SIM_R = 5;
  const SIM_H = H_mm / SIM_R;
  const SIM_W = W_mm / SIM_R;

  let canvas = document.getElementById('engraver');
  let _commands = null;  // list of commands
  let _cmd = null;       // current action
  let _mode = 'ABS';     // current mode ABS or REL
  let _pos = null;       // current pos
  let _dest = null;      // current destination
  let _laser = false;    // if laser is on
  let _hipre = false;    // if high precision is on
  let _lines = [];
  let _first = false;    // if first point, force draw (fix for small distances)

  let _height = canvas.height;
  let _width = canvas.width;

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
    if (canvas.getContext) {
      let ctx = canvas.getContext("2d");

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
  function highlightCmd(elt) {
    let highlighted = Array.from(document.querySelectorAll('.current'));
    highlighted.forEach(e => {
      e.classList.remove('current');
    })
    if(elt) {
      elt.classList.add('current');
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
      let e = _commands.next().value;
      if(!e) {
        running = false;
      } else {
        _cmd = e.innerText.trim();
        let res = null;
        console.info('COMMAND:', _cmd);
        if (_cmd === 'INIT') {
          _pos = [0, 0];
          _laser = false;
          _hipre = false;
          _cmd = null;
          highlightCmd(e);
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
            highlightCmd(e);
          }
        } else if (res = _cmd.match(/LASER\s+(ON|OFF)/)) {
          _laser = res[1] === 'ON';
          _cmd = null;
          highlightCmd(e);
        } else if (res = _cmd.match(/MODE\s+(ABS|REL)/)) {
          _mode = res[1];
          _cmd = null;
          highlightCmd(e);
        } else if (res = _cmd.match(/HIPRE\s+(ON|OFF)/)) {
          _hipre = res[1] === 'ON';
          _cmd = null;
        } else {
          if(_cmd === '') {
            _cmd = null;
            highlightCmd(null);
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
      highlightCmd(null);
      showStart();
      // Check exercise result on completion
      if (_exercise) {
        const hex = await getHexHash('SHA-1');
        if(!_laser && hex === _exercise.hex) {
          console.info('Ok !');
          const answer = await getHexHash('SHA-256');
          window.postMessage({
            'answer': answer,
            'from': 'pix'
          }, '*');
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
    _laser = false;
    _mode = "ABS";
    _checkImage = null;
    if (_exercise) {
      let ctx = canvas.getContext('2d');
      _checkImage = ctx.createImageData(SIM_W, SIM_H);
    }
  }

  function showStop() {
    let elt = document.getElementById('run');
    elt.style.display = 'none';
    elt = document.getElementById('running');
    elt.style.display = 'inline-block';
  }
  function showStart() {
    let elt = document.getElementById('running');
    elt.style.display = 'none';
    elt = document.getElementById('run');
    elt.style.display = 'inline-block';
    elt = document.getElementById('error');
    elt.style.display = 'none';
  }

  // recursively append children to nodes array
  function appendChildren(nodes, elt){
    for(const child of elt.childNodes) {
      // replace text nodes with span (useful for highlighting)
      if(child.nodeType === Node.TEXT_NODE) {
        // if text isn't empty
        if(child.textContent && child.textContent.trim() !== '') {
          let span = document.createElement('span');
          span.innerText = child.textContent;
          elt.replaceChild(span, child);
          nodes.push(span);
        }
      } else if(child.nodeType === Node.ELEMENT_NODE) {
        if(child.children && child.children.length > 0
           && !(child.children.length === 1
                && child.children[0].nodeName === 'BR')) {
          appendChildren(nodes, child);
        } else {
          // skips BR tags
          if(child.nodeName !== 'BR' && child.innerText){
            let commands = child.innerText.split('\n');
            // if multiple commands, split them
            if(commands && commands.length > 1) {
              elt.removeChild(child);
              commands.forEach(c => {
                let div = document.createElement('div');
                div.innerText = c;
                elt.appendChild(div);
              });
            } else {
              nodes.push(child);
            }
          }
        }
      } else {
        console.warn('Unknown node type', child);
      }
    }
  }

  // Resize canvas to fit parent size
  function resizeCanvas() {
    let parentWidth = canvas.parentElement.offsetWidth;
    let parentHeight = canvas.parentElement.offsetHeight;
    let ratio = H_mm / W_mm;
    let margin = 16;
    let targetWidth = parentWidth - margin;
    let targetHeight = Math.round(targetWidth * ratio);
    if(targetHeight > parentHeight) {
      targetHeight = parentHeight - margin;
      targetWidth = Math.round(targetHeight / ratio);
    }
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    _width = canvas.width;
    _height = canvas.height;
  }

  // starts engraving using editor content as commands
  function start() {
    reinit();
    let editor = document.getElementById("editor")
    let nodes = [];
    appendChildren(nodes, editor);
    _commands = nodes.values();
    showStop();
    resizeCanvas();
    engrave();
  }

  // Emergency stop engraving
  function stop() {
    _laser = false;
    _commands = null;
    _dest = null;
    highlightCmd(null);
    showStart();
  }

  function loadCommands(commands) {
    editor.innerHTML = '';
    commands.forEach(cmd => {
      let div = document.createElement('div');
      div.innerText = cmd;
      editor.appendChild(div);
    });
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

  // load program from URL if provided
  // query parameter must replace line breaks with pipes (%7C)
  let purl = new URL(window.location.href);
  if(purl && purl.searchParams) {
    let p = purl.searchParams.get("program");
    if(p && p.length) {
      let editor = document.getElementById('editor');
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