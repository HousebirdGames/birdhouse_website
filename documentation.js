const fs = require('fs').promises;
const path = require('path');
const ignore = require('ignore');
const marked = require('marked');

async function readGitignore(directoryPath) {
    try {
        const gitignorePath = path.join(directoryPath, '.gitignore');
        const gitignoreContent = await fs.readFile(gitignorePath, 'utf8');
        return ignore().add(gitignoreContent);
    } catch (error) {
        return ignore();
    }
}

async function listFunctionsInJSFile(content) {
    const functionRegex = /\/\*\*([\s\S]*?)\*\/\s*(export\s+(default\s+)?(async\s+)?function\s*(\w*)?\(|window\.(\w+)\s*=\s*(async\s+)?function)/g;
    let match;
    const functionsInfo = [];

    while ((match = functionRegex.exec(content)) !== null) {
        const jsDoc = match[1] || '';
        const isAsync = !!match[4] || !!match[7];
        const isDefault = !!match[3];
        const functionName = match[5] || match[6] || (isDefault ? 'default' : 'anonymous');
        const declarationType = match[5] ? "export " : "window.";

        let descriptionLines = jsDoc.split('\n').map(line => line.replace(/^\s*\* ?/, '')).filter(line => !line.startsWith('@'));
        descriptionLines = descriptionLines.map(line => line.trim() === '' ? '<br>' : line);
        let description = descriptionLines.join(' ').trim().replace(/^(<br>)+|(<br>)+$/g, '');

        const params = [];
        const paramRegex = /\* @param {(\w+)} (\[?.+?\]?) (.+)/g;
        let paramMatch;
        while ((paramMatch = paramRegex.exec(jsDoc)) !== null) {
            params.push({
                type: paramMatch[1],
                name: paramMatch[2],
                description: paramMatch[3].trim(),
            });
        }

        const returnMatch = jsDoc.match(/\* @returns? {([^}]+)} (.+)/);
        const returns = returnMatch ? { type: returnMatch[1], description: returnMatch[2].trim() } : null;

        functionsInfo.push({
            functionName,
            description,
            params,
            returns,
            isDefault,
            isAsync,
            declarationType
        });
    }
    return functionsInfo;
}

async function listExportedVariables(content) {
    const variableRegex = /\/\*\*([\s\S]*?)\*\/\s*export\s+(const|let)\s+([^=]+)=/g;
    let match;
    const variablesInfo = [];

    while ((match = variableRegex.exec(content)) !== null) {
        const comment = match[1].trim().split('\n').map(line => line.replace(/^\s*\*\s?/, '').trim()).join(' ');
        const type = match[2].trim();
        const name = match[3].trim();

        variablesInfo.push({
            type: type,
            name: name,
            description: comment
        });
    }

    return variablesInfo;
}

async function listExportedAndWindowVariables(originalContent) {
    const variableRegex = /\/\*\*([\s\S]*?)\*\/\s*(export\s+(const|let)\s+([^=]+)=|window\.([^=]+)\s*=\s*(?![\s\S]*function))/g;
    let match;
    const variables = [];
    let cleanedContent = originalContent;

    while ((match = variableRegex.exec(originalContent)) !== null) {
        let commentLines = match[1].trim().split('\n').map(line => line.replace(/^\s*\*\s?/, ''));
        commentLines = commentLines.map(line => line.trim() === '' ? '<br>' : line);
        let comment = commentLines.join(' ').trim().replace(/^(<br>)+|(<br>)+$/g, '');
        const def = match[3] ? match[3].trim() : "property";
        const name = match[4] ? match[4].trim() : match[5].trim();
        const declarationType = match[3] ? "export " : "window.";

        const typeMatch = comment.match(/@type {(.+?)}/);
        const type = typeMatch ? typeMatch[1] : "unknown type";

        if (typeMatch) {
            comment = comment.replace(typeMatch[0], '').trim();
        }

        variables.push({
            type: type,
            def: def,
            name: name,
            description: comment,
            declarationType: declarationType
        });

        const fullMatchLength = match[0].length;
        const startIndex = match.index;
        const endIndex = startIndex + fullMatchLength;

        cleanedContent = cleanedContent.substring(0, startIndex) + ' '.repeat(endIndex - startIndex) + cleanedContent.substring(endIndex);
    }

    return { variables, cleanedContent };
}

async function extractTopComment(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const commentRegex = /(\/\*[\s\S]*?\*\/)|(<!--[\s\S]*?-->)/;
    const match = content.match(commentRegex);
    if (match) {
        let commentLines = match[0].replace(/\/\*|\*\/|<!--|-->|#/g, '').trim().split('\n');
        commentLines = commentLines.map(line => line.trim() === '' ? '<br>' : line.trim());
        let comment = commentLines.join(' ').trim().replace(/^(<br>)+|(<br>)+$/g, '');
        return '[p class=^topComment justify^]' + comment + '[/p]';
    } else {
        return "";
    }
}

function convertMarkdownToHTML(mdContent) {
    return marked.parse(mdContent);
}

function removeIgnoredBlocks(content) {
    // Matches anything between //< and //>, including the markers themselves
    const ignoredBlockRegex = /\/\/<[\s\S]*?\/\/>/g;
    return content.replace(ignoredBlockRegex, '');
}

async function escapeHTMLSpecialCharacters(content) {
    // Replace <, >, &, " and ' with their HTML entity equivalents
    return content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

const routes = [];
const directoryStructure = {};

async function generateDocumentation(directoryPath, ig, basePath = '', structure = directoryStructure) {
    const entries = await fs.readdir(directoryPath, { withFileTypes: true });
    const allowedExtensions = ['.html', '.js', '.css', '.txt', '.md'];

    for (const entry of entries) {
        const entryRelativePath = path.join(basePath, entry.name);

        if (entry.name.startsWith('.') || ig.ignores(entryRelativePath)) {
            continue;
        }

        const fullPath = path.join(directoryPath, entry.name);

        if (entry.isDirectory()) {
            structure[entry.name] = {};
            await generateDocumentation(fullPath, ig, entryRelativePath, structure[entry.name]);
        } else if (allowedExtensions.includes(path.extname(entry.name))) {
            let content = `[h1]${entry.name}[/h1]\n`;

            const fileLink = `[a href=^https://github.com/HousebirdGames/Birdhouse/blob/main/${entryRelativePath}^]view this file on GitHub[/a]`;
            content += `[p]You can ${fileLink}.[/p]`;

            const comment = await extractTopComment(fullPath);
            content += `${comment}`;


            if (entry.name.endsWith('.js')) {
                let fileContent = await fs.readFile(fullPath, 'utf-8');
                fileContent = removeIgnoredBlocks(fileContent);
                fileContent = await escapeHTMLSpecialCharacters(fileContent);

                const { variables, cleanedContent } = await listExportedAndWindowVariables(fileContent);

                if (variables.length > 0) {
                    content += '[h2 id=^variables^][button href=^#variables^ class=^copyLink^]Variables <span class="material-icons">link</span>[/button][/h2]';
                }

                for (const variable of variables) {
                    content += `[div class=^variable^ id=^${variable.name}^][h3]${variable.declarationType}<strong class="copyData" data-copy="${variable.name}">${variable.name}</strong> (${variable.def} ${variable.type}) [button href=^#${variable.name}^ class=^copyLink^]<span class="material-icons">link</span>[/button][/h3][p class=^justify^]${variable.description}[/p][/div]`;
                }

                const functions = await listFunctionsInJSFile(cleanedContent);

                if (functions.length > 0) {
                    content += '[h2 id=^functions^][button href=^#functions^ class=^copyLink^]Functions <span class="material-icons">link</span>[/button][/h2]';
                }

                for (const func of functions) {
                    let parameters = [];
                    let parameterTypes = [];
                    for (const param of func.params) {
                        parameters.push(`${param.type}: ${param.name}`);
                        parameterTypes.push(param.type);
                    }
                    const parametersString = parameters.join(', ');
                    const parametersTypesString = parameterTypes.join(', ');
                    content += `[div class=^function^ id=^${func.functionName}^][h3]${func.isDefault ? 'DEFAULT ' : ''}${func.isAsync ? 'async ' : ''}${func.declarationType}<strong class="copyData" data-copy="${func.declarationType == 'window.' ? 'window.' : ''}${func.functionName}(${parametersTypesString})">${func.functionName}</strong>${parameters.length > 0 ? `(${parametersString})` : ''} [button href=^#${func.functionName}^ class=^copyLink^]<span class="material-icons">link</span>[/button][/h3][p class=^justify^]${func.description}[/p]`;
                    if (func.params.length > 0 || func.returns) {
                        content += '<table>';
                        if (func.params.length > 0) {
                            content += "<tr><th>Parameter</th><th>Type</th><th>Description</th></tr>";
                        }
                        for (const param of func.params) {
                            content += `<tr><td class="parameter">${param.name}</td><td>${param.type}</td><td>${param.description}</td></tr>`;
                        }
                        if (func.returns) {
                            content += '<tr></tr>';
                            content += `<tr><th class="returns">Returns</th><td>${func.returns.type}</td><td>${func.returns.description}</td></tr>`;
                        }
                        content += '</table>';
                    }
                    content += "[/div]";
                }
            } else if (entry.name.endsWith('.txt')) {
                content += (await fs.readFile(fullPath, 'utf-8')).split('\r\n\r\n').map(
                    paragraph => `[p class=^justify^]${paragraph.replace(/\r\n/g, ' ')}[/p]`
                ).join('');
            } else if (entry.name.endsWith('.md')) {
                content += convertMarkdownToHTML(await fs.readFile(fullPath, 'utf-8'));
            }

            const markdownPath = `./docs/${entryRelativePath.replace(/\\/g, '+')}.md`;
            await fs.writeFile(markdownPath, content, 'utf-8');

            routes.push({
                originalPath: fullPath.replace(/\\/g, '/'),
                markdownPath: markdownPath.replace(/\\/g, '/'),
                filename: entry.name,
                description: comment.length > 150 ? comment.slice(0, 150) + "..." : comment
            });

            structure[entry.name] = {
                path: fullPath.replace(/\\/g, '/'),
            };
        } else {
            structure[entry.name] = {};
        }
    }
}

async function main() {
    const birdhousePath = './Birdhouse';
    const ig = await readGitignore(birdhousePath);

    await fs.rm('./docs', { recursive: true, force: true });
    await fs.mkdir('./docs', { recursive: true });
    await generateDocumentation(birdhousePath, ig);

    await fs.writeFile('./src/dynamic-routes.js', `export const dynamicRoutes = ${JSON.stringify(routes, null, 2)};`, 'utf-8');

    await fs.writeFile('./src/birdhouse-structure.js', `export const birdhouseStructure = ${JSON.stringify(directoryStructure, null, 2)};`, 'utf-8');

    console.log('Custom markdown documentation and dynamic routes generated successfully.');
}

main().catch(console.error);