
let debug = function() {};
// debug = console.debug;

const RE_COMMENT = /\((.*)\)/;
const RE_COMMENT2 = /;.*/;
const RE_CMD = /([GM])(\d\d?)/;
const RE_LINE = /N\d\d?/;
const RE_ARGS = /([XYZF])(-?\d+(\.?\d+)?)/;

export default class GCodeParser {
	constructor() {
		this.state = 'IDLE';
		this.instructions = [];
		this.currentIdx = 0;
		this.error = console.error
	}

	/**
	 * Init from list of G-Code lines.
	 */
	init(lines) {
		this.state = 'IDLE';
		this.instructions = [];
		this.currentIdx = 0;

		let lineIdx = 0;

		for (let line of lines) {
			line = line.trim();
			line = line.replace(RE_COMMENT, '');		// remove comments
			line = line.replace(RE_COMMENT2, '');		// remove comments
			if(line.length === 0) { continue; }

			lineIdx++;

			// Whole line instructions: start, stop
			if (line === '%') {
				if(this.state === 'IDLE') {
					debug('Start');
					this.state = 'RUNNING';
					lineIdx = 0;
				} else if(this.state === 'RUNNING') {
					debug('Stop');
					this.state = 'IDLE';
					lineIdx = 0;
				}
			} else {
				let res = null;
				let tokens = line.split(/\s+/);
				let instruction = {
					line: lineIdx,
					cmd: null,
					args: {}
				};

				for (let t of tokens) {
					if (t.length === 0) { continue; }
					if ((res = RE_CMD.exec(t)) !== null) {
						debug('  cmd', res)
						instruction.cmd = {
							'full': res[0],
							'variable': res[1],
							'value': parseInt(res[2])
						};
					} else if ((res = RE_ARGS.exec(t)) !== null) {
						debug('    args', res)
						instruction.args[res[1]] = parseFloat(res[2]);
					} else if (RE_LINE.exec(t)) {
						if(instruction.line) {
							this.error('Multiple line number ' + t);
						}
						instruction.line = t;
					} else {
						this.error('Unknown token ' + t);
					}
				}
				if (instruction.cmd !== null) {
					this.instructions.push(instruction);
					debug('=> instruction', JSON.stringify(instruction));
				} else {
					console.warn('Unknown instruction', line);
				}
			}
		}
	}

	next() {
		let val = null;
		if (this.instructions.length > this.currentIdx) {
			val = this.instructions[this.currentIdx];
			this.currentIdx++;
		}
		return val;
	}

	stop() {
		this.instructions = [];
		this.currentIdx = 0;
	}
}
