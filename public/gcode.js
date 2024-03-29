
let debug = function() {};
// debug = console.debug;

const RE_COMMENT = /\((.*)\)/;
const RE_COMMENT2 = /;.*/;
const RE_CMD = /([GM])(\d\d?\d?)/;
const RE_LINE = /N\d\d?/;
const RE_ARGS = /([FIJLPRXYZ])(-?\d+(\.?\d+)?)/;
const RE_INVALID_ARG = /\d+([FIJLPRXYZ])/;

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
			if(line.length > 0) {
				// Whole line instructions: start, stop
				if (line === '%') {
					if(this.state === 'IDLE') {
						debug('Start');
						this.state = 'RUNNING';
					} else if(this.state === 'RUNNING') {
						debug('Stop');
						this.state = 'IDLE';
					}
				} else {
					let res = null;
					let tokens = line.split(/\s+/);
					let instruction = {
						idx: lineIdx,
						line: lineIdx,
						cmd: null,
						args: {}
					};

					for (let t of tokens) {
						if (t.length === 0) { continue; }
						if ((res = RE_CMD.exec(t)) !== null) {
							debug('  cmd', res)
							// if another command is already defined on same line
							if(instruction.cmd) {
								// console.info('Multiple commands');
								this.instructions.push(instruction);
								instruction = {
									idx: lineIdx,
									line: lineIdx,
									cmd: null,
									args: {}
								};
							}
							instruction.cmd = {
								'full': res[0],
								'variable': res[1],
								'value': parseInt(res[2])
							};
						} else if ((res = RE_INVALID_ARG.exec(t)) !== null) {
							debug('    err_arg', res);
							this.error('Argument error', line);
							this.instructions.push({
								idx: lineIdx,
								line: lineIdx,
								cmd: null,
								err: `Invalid argument: ${line}\nMissing space before ${res[1]} ?`
							});
						} else if ((res = RE_ARGS.exec(t)) !== null) {
							debug('    args', res);
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
						this.instructions.push({
									idx: lineIdx,
									line: lineIdx,
									cmd: null,
									err: `Unknown instruction: ${line}`
						});
					}
				}
			}
			lineIdx++;
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
