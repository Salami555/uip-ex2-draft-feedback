const previewField = document.getElementById("markdown-preview");

var autoUpdate = false;

function toggleAutoUpdate() {
	const autoUpdateDOM = document.getElementById("auto-update");
	autoUpdate = autoUpdateDOM.checked;
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

			console.log(labelDOM, labelDOM.control);
			const value = labelDOM.control.value;

			return `## ${labelDOM.textContent}\n\n${value}\n`;
		})].join('\n');
	}).join("\n\n");
}

// fix for details-label-structure
for (const summary of document.getElementsByTagName("summary")) {
	const label = summary.querySelector("label");
	if (label) {
		label.addEventListener('click', (evt => {
			// prevent details event handling
			evt.preventDefault();
			// but do focus the label
			label.control.focus();
		}).bind(label));
	}
}