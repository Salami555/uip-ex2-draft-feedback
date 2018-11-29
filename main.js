const previewField = document.getElementById("markdown-preview");

var autoUpdate = false;

function toggleAutoUpdate() {
	const autoUpdateDOM = document.getElementById("auto-update");
	autoUpdate = autoUpdateDOM.checked;
}

function textValueForInputElement(inputDOM) {
	switch (inputDOM.nodeName.toLowerCase()) {
		case "select":
			const selection = inputDOM.options[inputDOM.selectedIndex];
			return selection.textContent;
		default:
			return inputDOM.value;
	}
}

function form2markdown(formID) {
	const formDOM = document.getElementById(formID);
	const sections = [...formDOM.querySelectorAll("fieldset")];
	return sections.map(section => {
		let title = section.querySelector("legend").textContent;
		title = `# ${title}\n`;

		const inputs = [...section.querySelectorAll("li")];
		return [title, ...inputs.map(inputSection => {
			const labelDOM = inputSection.querySelector("label");

			const value = textValueForInputElement(labelDOM.control);

			return `## ${labelDOM.textContent}\n\n${value}\n`;
		})].join('\n');
	}).join("\n\n");
}

function openPreviewWindow(markdown) {
	const MDConverter = new showdown.Converter();
	const preview = window.open("", "Preview", "menubar=no,status=no,toolbar=no,resizable=yes,scrollbars=yes");
	const html = MDConverter.makeHtml(markdown);
	preview.document.write(html);
	return preview;
}

function printPreview(markdown) {
	const preview = openPreviewWindow(markdown);
	preview.print();
	preview.blur();
	preview.close();
}