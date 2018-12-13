'use strict';

class Input {
    constructor(labelDOM, type, onChange) {
        this.element = labelDOM.control;
        this.type = type;
        this.disableCheckbox = null;
        this.onChange = onChange;
        this.label = labelDOM;
        this.autoSave = evt => {
            startAutoSave();
            this.onChange();
        };
        if (this.element) {
            this.initLabel();
            this.element.addEventListener('input', this.autoSave);
            this.element.addEventListener('change', this.autoSave);

            if (this.element.dataset.helpText) {
                this.createHelp();
            }
        }
    }

    initLabel() {
        if (this.element.required) {
            this.label.classList.add('required');
        }
        this.disableCheckbox = document.createElement('input');
        this.disableCheckbox.type = 'checkbox';
        this.disableCheckbox.classList.add('disable');
        this.disableCheckbox.addEventListener('change', () => {
            this.element.disabled = !this.disableCheckbox.checked;
            this.autoSave();
        });
        this.disableCheckbox.checked = !this.element.disabled;
        this.label.prepend(this.disableCheckbox);
    }

    createHelp() {
        const helpOpener = document.createElement('input');
        helpOpener.type = 'checkbox';
        helpOpener.classList.add('help');
        this.label.parentElement.insertBefore(helpOpener, this.label.nextSibling);
        const helpText = document.createElement('p');
        helpText.classList.add('help');
        helpText.textContent = this.element.dataset.helpText;
        this.label.parentElement.insertBefore(helpText, helpOpener.nextSibling);
    }

    get value() {
        return this[this.type];
    }

    get placeholder() {
        return this.element.placeholder;
    }

    get enabled() {
        return !this.element.disabled;
    }

    setValue(newValue) {
        this.element.value = newValue;
        this[this.type] = newValue;
        if (newValue) {
            this.setEnabled(true);
        }
    }

    setEnabled(enabled) {
        this.element.disabled = !enabled;
        this.disableCheckbox.checked = !this.element.disabled;
    }

    isEmpty() {
        return !this.value;
    }
}
Input.Text = class extends Input {
    constructor(labelDOM) {
        super(labelDOM, 'text', () => {
            this.text = this.element.value;
        });
        this.text = null;
        if (this.element.minLength > 0) {
            console.log('Add character counter to', this.element);
        }
        this.onChange();
    }

    reducedObject() {
        return {
            type: this.type,
            text: this.text
        }
    };

    markdown() {
        let md = `*${this.placeholder}*`;
        if (!this.isEmpty()) {
            md += `\n\n> ${this.value}`;
        }
        return md;
    }
};
Input.Selection = class extends Input {
    constructor(labelDOM) {
        super(labelDOM, 'selection', () => {
            this.selection = this.element.options[this.element.options.selectedIndex].value;
        });
        this.selection = null;
        this.choices = new Map();
        for (const option of this.element.options) {
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
Input.List = class extends Input {
    constructor(labelDOM) {
        super(labelDOM, 'list', () => { });
        this.createBtn = document.getElementById(labelDOM.dataset.elementsAdd);
        this.createBtn.addEventListener('click', () => this.addElement());
        this.elementList = document.getElementById(labelDOM.dataset.elementsList);
        this.onChange();
    }

    setValue(newValue) {

    }

    get elements() {
        return [...this.elementList.children]
        .filter((child) => child && child.querySelector('p'))
        .map((child) => {
            const p = child.querySelector('p');
            return p.textContent;
        });
    }

    addElement() {
        const li = document.createElement('li');
        const typeInput = document.createElement('input');
        typeInput.type='text';
        typeInput.setAttribute('list', 'remark-type-suggestions');
        typeInput.placeholder='Remark Type or Category';
        li.appendChild(typeInput);
        const textarea = document.createElement('textarea');
        textarea.rows = 2;
        textarea.placeholder = 'Position (Page, Paragraph); Describe the remark and suggest alternatives';
        textarea.minLength = 20;
        textarea.addEventListener('input', this.autoSave);
        textarea.addEventListener('change', this.autoSave);
        li.appendChild(textarea);
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.innerHTML = '<i class="far fa-trash-alt"></i> Remove';
        removeBtn.addEventListener('click', () => li.remove());
        li.appendChild(removeBtn);
        this.elementList.appendChild(li);
    }

    reducedObject() {
        return {
            type: this.type,
            elements: this.elements
        }
    }

    markdown() {
        const list = [];
        this.elements.forEach((value, key) => {
            list.push(`  - ${value}`);
        });
        return list.join('\n');
    }
};

function initInputElement(labelDOM) {
    if (labelDOM.dataset.listInput) {
        return new Input.List(labelDOM);
    }

    switch (labelDOM.control.nodeName.toLowerCase()) {
        case 'select':
            return new Input.Selection(labelDOM);
        default:
            return new Input.Text(labelDOM);
    }
}

class Form {
    constructor(formDOM) {
        this.structure = {};
        this.element = formDOM;
        this.values = new Map();
        this.title = 'New Review';

        for (const sectionDOM of formDOM.querySelectorAll('fieldset')) {
            const legend = sectionDOM.querySelector('legend').textContent;
            // const descriptions = sectionDOM.querySelectorAll('p')
            const inputs = {};
            for (const labelDOM of sectionDOM.querySelectorAll('label')) {
                const name = labelDOM.textContent;
                const input = initInputElement(labelDOM);
                this.values.set([legend, name], input);
                inputs[name] = input;
                if (name === 'Title') {
                    this.title = input;
                }
            }
            this.structure[legend] = inputs;
            // {
            // description: '',
            // inputs: inputs
            // };
        }
    }

    calculatedScore() {
        // todo
        return 0;
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
                if (input.enabled) {
                    obj[legend][name] = input.reducedObject();
                }
            }
        }
        return obj;
    }

    fromJSONObject(jsonObject) {
        for (const legend in this.structure) {
            const section = this.structure[legend];
            for (const name in section) {
                if (!(legend in jsonObject) || !(name in jsonObject[legend])) {
                    section[name].setEnabled(false);
                    continue;
                }
                const newReducedInput = jsonObject[legend][name];
                const newValue = newReducedInput[newReducedInput.type];
                const oldInput = section[name];
                oldInput.setValue(newValue);
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
                if (section[name].enabled) {
                    md.push(`## ${name}`);
                    md.push(`${section[name].markdown()}`);
                }
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

const autoSaveSupported = (typeof (Storage) !== 'undefined');
const autoSaveName = 'latestForm';
const autoSaveStatusDOM = document.getElementById('autosave-status');
const autoSaveTimeoutDelay = 1000;
const autoSaveClassesWork = ['fas', 'fa-sync', 'fa-spin'].join(' ');
const autoSaveClassesDone = ['far', 'fa-check-circle'].join(' ');
let autoSaveTimeout = null;

function startAutoSave() {
    if (!autoSaveSupported)
        return;
    autoSaveStatusDOM.className = autoSaveClassesWork;
    if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
    }
    autoSaveTimeout = setTimeout(() => save(FORM), autoSaveTimeoutDelay);
}

function save(form) {
    if (!autoSaveSupported)
        return;
    autoSaveStatusDOM.className = autoSaveClassesWork;
    const payload = window.btoa(form.asJSONString(null));
    localStorage.setItem(autoSaveName, payload);
    autoSaveStatusDOM.className = autoSaveClassesDone;
}
window.onbeforeunload = () => save(FORM);

function load(form) {
    if (!autoSaveSupported)
        return;
    autoSaveStatusDOM.className = autoSaveClassesWork;
    const payload = localStorage.getItem(autoSaveName);
    if (payload) {
        const data = JSON.parse(window.atob(payload));
        if (data) {
            form.fromJSONObject(data);
        }
    }
    autoSaveStatusDOM.className = autoSaveClassesDone;
}

const FORM = new Form(document.getElementById('review'));
load(FORM);

const outputFormatDOM = document.getElementById('output-format');

function mimeType() {
    return outputFormatDOM.value;
};

function outputFormat() {
    return outputFormatDOM.options[outputFormatDOM.selectedIndex].title;
}
outputFormatDOM.addEventListener('change', () => {
    // disable emailing for text/html format
    const isHtml = (mimeType() === 'text/html');
    const emailBtn = document.getElementById('email-action');
    emailBtn.disabled = isHtml;
    if (isHtml) {
        emailBtn.title = emailBtn.dataset.htmlDisabledTitle;
    } else {
        if (emailBtn.title) {
            emailBtn.dataset.htmlDisabledTitle = emailBtn.title;
        }
        emailBtn.title = '';
    }
});

function getFormattedHTMLTemplate() {
    const formattedOutput = FORM.getFormattedOutput(mimeType());
    const title = `${outputFormat()} Preview`;
    switch (mimeType()) {
        case 'application/json':
            return htmlTemplate('JSON Preview', htmlTemplateJSONViewer(formattedOutput));
        case 'text/markdown':
            return htmlTemplate('Markdown Preview', htmlTemplateMarkdownViewer(formattedOutput));
        case 'text/html':
            return htmlTemplate('HTML Preview', formattedOutput);
    }
    return formattedOutput;
}

function downloadFile(filename, mimeType, content) {
    const a = document.createElement('a');
    a.download = filename;
    a.rel = 'noopener';
    a.href = URL.createObjectURL(new Blob([content], { type: `${mimeType};charset=utf-8` }));
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    setTimeout(() => a.click(), 0);
}

function htmlTemplate(title, bodyContent) {
    return `<!DOCTYPE html><html><head><meta charset='utf-8' /><title>${title}</title><style>body{margin:0} textarea{border:none;width:100%;height:100vh}</style></head><body>${bodyContent}</body></html>`;
}

function htmlTemplateMarkdownViewer(markdown) {
    return `<textarea readonly>${markdown}</textarea>`;
}

function htmlTemplateJSONViewer(json) {
    return `<textarea readonly>${json}</textarea>`;
}

function openPreviewWindow(html) {
    const preview = window.open('', 'Preview', 'width=600,height=800,menubar=no,status=no,toolbar=no,resizable=yes,scrollbars=yes');
    preview.document.write(html);
    return preview;
}

const Outputter = {
    open: () => {
        openPreviewWindow(getFormattedHTMLTemplate());
    },
    print: () => {
        const preview = openPreviewWindow(getFormattedHTMLTemplate());
        preview.blur();
        preview.print();
        while (!preview.closed) {
            preview.close();
        }
    },
    mail: () => {
        const email = prompt('Send to email-address:', '');
        if (email == null) return;
        const subject = `Review Form (${outputFormat()})`;
        const emailBody = FORM.getFormattedOutput(mimeType());
        const mailTo = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
        window.location.href = mailTo;
    },
    clipboard: () => {
        if (!navigator.clipboard) {
            return alert('Your browser does not support the clipboard API. Fallback not implemented.');
        }
        navigator.clipboard.writeText(FORM.getFormattedOutput(mimeType()))
            .then(() => {
                alert(`Copied ${outputFormat()} to clipboard!`);
            }, () => {
                alert('Copying to clipboard failed. The reasons are unknown...');
            });
    },
    download: () => {
        let formattedOutput = FORM.getFormattedOutput(mimeType());
        let filename = `${FORM.title.value} - Review`;
        switch (mimeType()) {
            case 'application/json':
                filename += '.json';
                break;
            case 'text/markdown':
                filename += '.md';
                break;
            case 'text/html':
                formattedOutput = htmlTemplate(filename, formattedOutput);
                filename += '.html';
                break;
        }
        downloadFile(filename, mimeType(), formattedOutput);
    }
};

function clearForm() {
    if (confirm("Are you sure? This will erase all written content from your review!")) {
        FORM.reset();
    }
}