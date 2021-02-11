(function (){
  let canvas = document.getElementById('engraver');
  let _commands = null;  // list of commands
  let _cmd = null;       // current action
  let _mode = 'ABS';     // current mode ABS or REL
  let _pos = null;       // current pos
  let _dest = null;      // current destination
  let _laser = false;     // if laser is on
  let _lines = [];

  let height = canvas.height;
  let width = canvas.width;

  let _speed = 5;

  const H = 1530;
  const W = 3050;

  // convert x from mm to canvas x
  function convertX(mm) {
    let x = (mm / 3050.0) * width;
    return x;
  }

  // convert y from mm to canvas y
  function convertY(mm) {
    let y = ((H - mm) / 1530.0) * height;
    return y;
  }

  // draw canvas
  function draw() {
    if (canvas.getContext) {
      let ctx = canvas.getContext("2d");

      // clear canvas
      ctx.fillStyle = 'rgb(150,150,150)';
      ctx.fillRect(0, 0, width, height);

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
        console.info(_cmd);
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
          console.error('Unknown command', _cmd);
          // TODO error
        }
      }
    }
    draw();
    if(running) {
      requestAnimationFrame(engrave);
    } else {
      highlightCmd(null);
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

  // starts engraving using editor content as commands
  function start() {
    let editor = document.getElementById("editor")
    let nodes = Array.from(editor.children);
    reinit();
    _commands = nodes.values();
    engrave();
  }

  window.engraverStart = start;
  start();
})();