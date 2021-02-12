(function (){
  let canvas = document.getElementById('engraver');
  let _commands = null;  // list of commands
  let _cmd = null;       // current action
  let _mode = 'ABS';     // current mode ABS or REL
  let _pos = null;       // current pos
  let _dest = null;      // current destination
  let _laser = false;     // if laser is on
  let _lines = [];

  let _height = canvas.height;
  let _width = canvas.width;

  let _speed = 5;

  const H = 1530;
  const W = 3050;

  // convert x from mm to canvas x
  function convertX(mm) {
    let x = (mm / 3050.0) * _width;
    return x;
  }

  // convert y from mm to canvas y
  function convertY(mm) {
    let y = ((H - mm) / 1530.0) * _height;
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

  // parse commands and display engraving
  function engrave() {
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
          _cmd = null;
          highlightCmd(e);
        } else if (res = _cmd.match(/MOVE\s+(\d+)\s+(\d+)/)) {
          let x = parseInt(res[1]);
          let y = parseInt(res[2]);
          if(_mode === 'REL') {
            x += _pos[0];
            y += _pos[1];
          }
          _dest = [x, y];
          if(_laser) {
            _lines.push([ [_pos[0], _pos[1]], [_pos[0], _pos[1]] ]);
          }
          highlightCmd(e);
        } else if (res = _cmd.match(/LASER\s+(ON|OFF)/)) {
          _laser = res[1] === 'ON';
          _cmd = null;
          highlightCmd(e);
        } else if (res = _cmd.match(/MODE\s+(ABS|REL)/)) {
          _mode = res[1];
          _cmd = null;
          highlightCmd(e);
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
    }
  }

  // reinit engraver in initial state
  function reinit() {
    _commands = null;
    _lines = [];
    _cmd = null;
    _laser = false;
    _mode = "ABS";
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

  // Resize canvas to fit parent size
  function resizeCanvas() {
    let parentWidth = canvas.parentElement.offsetWidth;
    let parentHeight = canvas.parentElement.offsetHeight;
    let ratio = H / W;
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
    let editor = document.getElementById("editor")
    let nodes = null;
    reinit();
    // flatten editor children nodes
    for (let i = 0; i < editor.children.length; i++) {
      let elt = editor.children[i];
      for (let child of elt.children) {
        editor.appendChild(child);
      }
    }
    nodes = Array.from(editor.children);
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

  window.engraverStart = start;
  window.engraverStop = stop;
  // start();
})();