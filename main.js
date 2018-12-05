'use strict';

class Input {
	constructor(inputDOM, type, onChange) {
		this.element = inputDOM;
		this.type = type;
		this.onChange = onChange;
		const changeAutoSave = evt => {
			startAutoSave();
			this.onChange();
		};
		inputDOM.addEventListener('input', changeAutoSave);
		inputDOM.addEventListener('change', changeAutoSave);
	}

	get value() {
		return this[this.type];
	}

	get placeholder() {
		return this.element.placeholder;
	}

	isEmpty() {
		return !this.value;
	}
}
Input.Text = class extends Input {
	constructor(inputDOM) {
		super(inputDOM, 'text', () => {
			this.text = inputDOM.value;
		});
		this.onChange();
	}

	reducedObject() {
		return {
			type: this.type,
			text: this.text
		}
	};

	markdown() {
		return this.isEmpty() ? `\`${this.placeholder}\`` : this.value;
	}
};
Input.Selection = class extends Input {
	constructor(inputDOM) {
		super(inputDOM, 'selection', () => {
			this.selection = inputDOM.options[inputDOM.options.selectedIndex].value;
		});
		this.choices = new Map();
		for (const option of inputDOM.options) {
			this.choices.set(option.value, option.textContent);
		}
		this.onChange();
	}

	reducedObject() {
		const choices = {};
		this.choices.forEach((value, key) => (choices[key] = value));
		return {
			type: this.type,
			choices: choices,
			selection: this.selection
		}
	}

	markdown() {
		const choices = [];
		this.choices.forEach((value, key) => {
			const selected = (key === this.selection);
			choices.push(`  - [${selected ? 'x' : ' '}] ${value}`);
		});
		return choices.join('\n');
	}
};

class Form {
	static initInputElement(inputDOM) {
		switch (inputDOM.nodeName.toLowerCase()) {
			case 'select':
				return new Input.Selection(inputDOM);
			default:
				return new Input.Text(inputDOM);
		}
		return input;
	}

	constructor(formDOM) {
		this.structure = {};
		this.element = formDOM;
		this.values = new Map();

		for (const sectionDOM of formDOM.querySelectorAll('fieldset')) {
			const legend = sectionDOM.querySelector('legend').textContent;
			// const descriptions = sectionDOM.querySelectorAll('p')
			const inputs = {};
			for (const labelDOM of sectionDOM.querySelectorAll('label')) {
				const name = labelDOM.textContent;
				const input = Form.initInputElement(labelDOM.control);
				this.values.set([legend, name], input);
				inputs[name] = input;
			}
			this.structure[legend] = inputs;
			// {
			// description: '',
			// inputs: inputs
			// };
		}
	}

	reset() {
		this.element.reset();
		this.values.forEach(input => input.onChange());
		startAutoSave();
	}

	// returns an object ready to transform to JSON
	asJSONObject() {
		const obj = {};
		for (const legend in this.structure) {
			obj[legend] = {};
			const section = this.structure[legend];
			for (const name in section) {
				const input = section[name];
				obj[legend][name] = input.reducedObject();
			}
		}
		return obj;
	}

	fromJSONSObject(jsonObject) {
		for (const legend in jsonObject) {
			const section = jsonObject[legend];
			for (const name in section) {
				const newInput = section[name];
				const newValue = newInput[newInput.type];
				const oldInput = this.structure[legend][name];
				oldInput.element.value = newValue;
				oldInput[oldInput.type] = newValue;
			}
		}
	}

	asJSONString(space = '  ') {
		return JSON.stringify(this.asJSONObject(), null, space);
	}

	asMarkdown() {
		const jsonObject = this.structure;
		let md = [];
		for (const legend in jsonObject) {
			const section = jsonObject[legend];
			md.push(`# ${legend}`);
			for (const name in section) {
				md.push(`## ${name}`);
				md.push(`${section[name].markdown()}`);
			}
		}
		return md.join('\n\n');
	}

	asHTML() {
		const MDConverter = new showdown.Converter();
		MDConverter.setOption('tasklists', true);
		return MDConverter.makeHtml(this.asMarkdown());
	}

	getFormattedOutput(mimeFormat) {
		switch (mimeFormat) {
			case 'application/json':
				return this.asJSONString();
			case 'text/markdown':
				return this.asMarkdown();
			case 'text/html':
				return this.asHTML();
		}
		return this.toString();
	}
}

const autoSaveName = 'latestForm';
const autoSaveStatusDOM = document.getElementById('autosave-status');
const autoSaveTimeoutDelay = 1000;
const autoSaveClassesWork = ['fas', 'fa-sync', 'fa-spin'];
const autoSaveClassesDone = ['far', 'fa-check-circle'];
let autoSaveTimeout = null;
function startAutoSave() {
	autoSaveStatusDOM.className = autoSaveClassesWork.join(' ');
	if (autoSaveTimeout) {
		clearTimeout(autoSaveTimeout);
	}
	autoSaveTimeout = setTimeout(() => save(FORM), autoSaveTimeoutDelay);
}
function save(form) {
	const payload = window.btoa(form.asJSONString(null));
	if (typeof (Storage) !== "undefined") {
		// save as localStorage
		localStorage.setItem(autoSaveName, payload);
	}
	// else {
	// save as cookie
	// const expDate = new Date();
	// expDate.setTime(expDate.getTime() + (31 * 24 * 60 * 60 * 1000));
	// document.cookie = `${autoSaveName}=${payload};expires=${expDate.toUTCString()}`;
	// }
	autoSaveStatusDOM.className = autoSaveClassesDone.join(' ');
}
function load(form) {
	autoSaveStatusDOM.className = autoSaveClassesWork.join(' ');
	let data;
	if (typeof (Storage) !== "undefined") {
		// save as localStorage
		const payload = localStorage.getItem(autoSaveName);
		if (payload) {
			data = JSON.parse(window.atob(payload));
		}
	}
	if (data) {
		form.fromJSONSObject(data);
	}
	autoSaveStatusDOM.className = autoSaveClassesDone.join(' ');
}

const FORM = new Form(document.getElementById('review'));
load(FORM);

const outputFormatDOM = document.getElementById('output-format');
function mimeType() {
	return outputFormatDOM.value;
};
outputFormatDOM.addEventListener('change', () => {
	// disable emailing for text/html format
	document.getElementById('email-action').disabled = (mimeType() === 'text/html');
	document.getElementById('clipboard-save-action').disabled = (mimeType() === 'text/html');
});

function getFormattedHTMLTemplate(form, mimeFormat) {
	const formattedOutput = form.getFormattedOutput(mimeFormat);
	switch (mimeFormat) {
		case 'application/json':
			return htmlTemplate('JSON Preview', htmlTemplateJSONViewer(formattedOutput));
		case 'text/markdown':
			return htmlTemplate('Markdown Preview', htmlTemplateMarkdownViewer(formattedOutput));
		case 'text/html':
			return htmlTemplate('HTML Preview', formattedOutput);
	}
	return formattedOutput;
}

function htmlTemplate(title, bodyContent) {
	return `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>${title}</title><style>body{margin:0} textarea{border:none;width:100%;height:100vh}</style></head><body>${bodyContent}</body></html>`;
}
function htmlTemplateMarkdownViewer(markdown) {
	return `<textarea readonly>${markdown}</textarea>`;
}
function htmlTemplateJSONViewer(json) {
	return `<textarea readonly>${json}</textarea>`;
}

function openPreviewWindow(html) {
	const preview = window.open('', 'Preview', 'menubar=no,status=no,toolbar=no,resizable=yes,scrollbars=yes');
	preview.document.write(html);
	return preview;
}

const Outputter = {
	open: () => {
		openPreviewWindow(getFormattedHTMLTemplate(FORM, mimeType()));
	},
	print: () => {
		const preview = openPreviewWindow(getFormattedHTMLTemplate(FORM, mimeType()));
		preview.blur();
		preview.print();
		while (!preview.closed) {
			preview.close();
		}
	},
	mail: () => {
		const email = prompt('Send to email-address:', '');
		if (email == null) return;
		const subject = `Review Form (${mimeType()})`;
		const emailBody = FORM.getFormattedOutput(mimeType());
		const mailTo = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
		// window.location.href = mailTo;
		const mail = document.createElement('a');
		mail.href = mailTo;
		mail.click();
	},
	clipboard: () => {
		console.log(FORM.getFormattedOutput(mimeType()));
	},
	download: () => {
		switch (mimeType()) {

		}
	}
};

// function openPreviewWindow(markdown) {
// 	const preview = window.open('', 'Preview', 'menubar=no,status=no,toolbar=no,resizable=yes,scrollbars=yes');
// 	const html = MDConverter.makeHtml(markdown);
// 	preview.document.write(html);
// 	return preview;
// }

// function printPreview(markdown) {
// 	const preview = openPreviewWindow(markdown);
// 	preview.print();
// 	preview.blur();
// 	preview.close();
// }

// function mailPreview(markdown, email, subject) {
// 	const emailBody = encodeURIComponent(markdown);
// 	const mailTo = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${emailBody}`;
// }