
class GenerateInstance {
    constructor () {

    }

    generate () {
        const dir = `${path.dirname(__dirname)}/template`
        const opts = getOptions(`${dir}/${options.type}`);
        let answers = {};
        answers = await ctx.cmd.inquirer.prompt(opts.prompts);
        let files = this.render(`${dir}/${options.type}/${options.fileName}`, answers);
        this.writeFileSync(path.resolve('.'), files);
    }

    render (templateDir, options) {
        let fileTree = {}
        const file = fs.readFileSync(`${templateDir}`, "utf-8");
        const content = ejs.render(file, options)
        if (Buffer.isBuffer(content) || /[^\s]/.test(content)) {
            fileTree = content
        }
        return fileTree
    }

    writeFileSync (dir, files) {
        const filePath = dir + '/vivid.json';
        fs.writeFileSync(filePath, files);
    }
}