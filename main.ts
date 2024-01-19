import {
	App,
	Editor,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
} from "obsidian";

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: "default",
};

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		// const ribbonIconEl =
		this.addRibbonIcon(
			"number-list-glyph",
			"生成目录",
			(evt: MouseEvent) => {
				// Called when the user clicks the icon.
				if (this.app.workspace.activeEditor?.editor == null) {
					return new Notice("请选择一个文件，并进入编辑状态");
				}
				const editor = this.app.workspace.activeEditor.editor;
				new SampleModal(this.app).setEditor(editor).open();
			}
		);
		// Perform additional things with the ribbon
		// ribbonIconEl.addClass("my-plugin-ribbon-class");

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		// const statusBarItemEl = this.addStatusBarItem();
		// statusBarItemEl.setText("Status Bar Text");

		// This adds a simple command that can be triggered anywhere
		// this.addCommand({
		// 	id: "open-sample-modal-simple",
		// 	name: "Open sample modal (simple)",
		// 	callback: () => {
		// 		new SampleModal(this.app).open();
		// 	},
		// });
		// This adds an editor command that can perform some operation on the current editor instance
		// this.addCommand({
		// 	id: "sample-editor-command",
		// 	name: "Sample editor command",
		// 	editorCallback: async (editor: Editor, view: MarkdownView) => {
		// 		new SampleModal(this.app).setEditor(editor).open();
		// 	},
		// });
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		// this.addCommand({
		// 	id: "open-sample-modal-complex",
		// 	name: "Open sample modal (complex)",
		// 	checkCallback: (checking: boolean) => {
		// 		// Conditions to check
		// 		const markdownView =
		// 			this.app.workspace.getActiveViewOfType(MarkdownView);
		// 		if (markdownView) {
		// 			// If checking is true, we're simply "checking" if the command can be run.
		// 			// If checking is false, then we want to actually perform the operation.
		// 			if (!checking) {
		// 				new SampleModal(this.app).open();
		// 			}

		// 			// This command will only show up in Command Palette when the check function returns true
		// 			return true;
		// 		}
		// 	},
		// });

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		// this.registerDomEvent(document, "click", (evt: MouseEvent) => {
		// 	console.log("click", evt);
		// });

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		// this.registerInterval(
		// 	window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000)
		// );
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
// 声明一个 JSON 数组，值有 name 与path
interface MDFile {
	path: string;
	basename: string;
	instance: TFile;
}
interface MDDir {
	subdir: MDDir[];
	subfile: MDFile[];
	name: string;
}

class SampleModal extends Modal {
	editor: Editor;
	onConfirmClickAction: (e: MouseEvent) => void;
	constructor(app: App) {
		super(app);
	}

	writeTocByName(toc: MDDir, level = 1): void {
		if (level === 1) this.editor.getDoc().setValue("");
		this.editor.replaceSelection("#".repeat(level) + " " + toc.name);
		this.editor.replaceSelection("\n\n");

		if (toc.subdir.length > 0) {
			toc.subdir.sort((a, b) => {
				return a.name.localeCompare(b.name);
			});
			for (let i = 0; i < toc.subdir.length; i++) {
				this.writeTocByName(toc.subdir[i], level + 1);
			}
		}
		if (toc.subfile.length > 0)
			for (let i = 0; i < toc.subfile.length; i++)
				this.editor.replaceSelection(
					`- ${this.app.fileManager.generateMarkdownLink(
						toc.subfile[i].instance,
						"/"
					)}\n`
				);
	}
	listPathFile(cusDir: string): void {
		const files: TFile[] = this.app.vault.getFiles();
		const availableFiles = files.filter((file) => {
			return file.path.indexOf(`${cusDir}/`) === 0;
		});

		const baseLevel = cusDir.split("/");
		const toc: MDDir = {
			subdir: [],
			subfile: [],
			name: baseLevel[baseLevel.length - 1],
		};

		for (const file of availableFiles) {
			const filepath = file.path;
			const fileLevel = filepath.split("/");
			let tmp: MDDir = toc;
			for (let i = baseLevel.length; i < fileLevel.length; i++) {
				// 如果读取到最后一级，那写入文件列表里,不需要判断
				if (i + 1 === fileLevel.length) {
					tmp.subfile.push({
						basename: file.basename,
						path: filepath,
						instance: file,
					});
					break;
				}
				let checkDir = tmp.subdir.find(
					(dir) => dir.name === fileLevel[i]
				);
				// 不是最后一级，则是目录，检查目录是否存在，不存在需要创建，写入目录列表
				if (!checkDir) {
					checkDir = {
						name: fileLevel[i],
						subdir: [],
						subfile: [],
					};
					tmp.subdir.push(checkDir);
				}
				tmp = checkDir;
			}
		}
		this.writeTocByName(toc);
	}
	setEditor(editor: Editor | null): this {
		if (editor != null) this.editor = editor;
		return this;
	}
	onOpen() {
		const { contentEl } = this;
		const headerEl = contentEl.createEl("div", {
			text: "请输入引用的文件路径",
		});
		headerEl.addClass("modal-title");
		const inputEl = contentEl.createEl("input", "请输入引用的文件路径");
		contentEl.createDiv("--------------------------");

		const confirmButton = contentEl.createEl("button", { text: "确认" });
		const cancelButton = contentEl.createEl("button", { text: "取消" });
		inputEl.addEventListener("keyup", (event: KeyboardEvent) => {
			if (event.key === "Enter" && !event.isComposing) {
				confirmButton.trigger("click");
				return true;
			}
		});
		cancelButton.addEventListener("click", () => {
			this.close();
		});
		confirmButton.addEventListener("click", () => {
			this.listPathFile(inputEl.value);
			this.close();
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Setting #1")
			.setDesc("It's a secret")
			.addText((text) =>
				text
					.setPlaceholder("Enter your secret")
					.setValue(this.plugin.settings.mySetting)
					.onChange(async (value) => {
						this.plugin.settings.mySetting = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
