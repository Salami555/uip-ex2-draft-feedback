const previewField = document.getElementById("markdown-preview");

var autoUpdate = false;

function toggleAutoUpdate() {
	const autoUpdateDOM = document.getElementById("auto-update");
	autoUpdate = autoUpdateDOM.checked;
}

function updatePreview() {
	const formDOM = document.getElementById("review");
	const sections = [...formDOM.querySelectorAll("fieldset")];
	previewField.value = sections.map(section => {
		let title = section.querySelector("legend").textContent;
		title = `# ${title}\n`;

		const inputs = [...section.querySelectorAll("li")];
		console.log(inputs);
		return [title, ...inputs.map(inputSection => {
			let label = inputSection.querySelector("label").textContent;
			label = `## ${label}\n`;

			const value = inputSection.querySelector(":not(label)").value;
			
			return `${label}\n${value}\n`;
		})].join('\n');
	}).join("\n\n");
}