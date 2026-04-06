import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const CARD_DIR = path.join(ROOT, 'content', 'card');
const IMG_DIR = path.join(ROOT, 'content', 'img');
const ATTACH_DIR = path.join(ROOT, 'content', 'attachments');

async function walk(dir) {
    let files = [];
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                files = files.concat(await walk(fullPath));
            } else if (fullPath.endsWith('.md')) {
                files.push(fullPath);
            }
        }
    } catch (e) {}
    return files;
}

async function ensureDir(dir) {
    try {
        await fs.access(dir);
    } catch {
        await fs.mkdir(dir, { recursive: true });
    }
}

async function findFile(dir, targetName) {
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                const found = await findFile(fullPath, targetName);
                if (found) return found;
            } else if (entry.name === targetName) {
                return fullPath;
            }
        }
    } catch (e) {}
    return null;
}

async function run() {
    const cardFiles = await walk(CARD_DIR);
    let totalFixed = 0;

    for (const cardFile of cardFiles) {
        let content = await fs.readFile(cardFile, 'utf8');
        const schoolSlugMatch = content.match(/school_slug:\s*["']?([^"'\n\r\s]+)["']?/);
        const schoolSlug = schoolSlugMatch ? schoolSlugMatch[1] : 'unknown';

        let changed = false;

        // 1. 修复被截断的图片引用
        const brokenImgRegex = /!\[([^\]]*)\]\(([^)]*?)\s*[\r\n]+\s*([^)]*?\.(?:jpg|png|webp|gif|jpeg))\)/gi;
        if (brokenImgRegex.test(content)) {
            content = content.replace(brokenImgRegex, (match, alt, part1, part2) => {
                console.log(`[Fix Syntax] Broken image link in ${path.basename(cardFile)}`);
                return `![${alt}](${part1.trim()}${part2.trim()})`;
            });
            changed = true;
        }

        // 2. 图片迁移
        const imgRegex = /\/img\/init-(?:nov|dec|jan|oct|sept)\/([^)\s"']+\.[a-z0-9]+)/gi;
        const imgMatches = Array.from(content.matchAll(imgRegex));
        for (const match of imgMatches) {
            const oldRelPath = match[0];
            const fileName = match[1];
            const oldFullPath = path.join(ROOT, 'content', oldRelPath);
            const newRelPath = `/img/${schoolSlug}/${fileName}`;
            const newFullPath = path.join(ROOT, 'content', newRelPath);

            try {
                await ensureDir(path.dirname(newFullPath));
                await fs.access(oldFullPath);
                await fs.copyFile(oldFullPath, newFullPath);
            } catch (err) {}
        }
        
        let updatedContent = content.replace(imgRegex, `/img/${schoolSlug}/$1`);
        if (updatedContent !== content) {
            content = updatedContent;
            changed = true;
        }

        // 3. 附件迁移
        const attachRegex = /\/attachments\/(?:legacy|init)[^)\s"']+\/([^)\s"']+\.[a-z0-9]+)/gi;
        const attachMatches = Array.from(content.matchAll(attachRegex));
        for (const match of attachMatches) {
            const fileName = match[1];
            const oldFullPath = await findFile(ATTACH_DIR, fileName);
            if (oldFullPath) {
                const newRelPath = `/attachments/${schoolSlug}/${fileName}`;
                const newFullPath = path.join(ROOT, 'content', newRelPath);
                try {
                    await ensureDir(path.dirname(newFullPath));
                    await fs.copyFile(oldFullPath, newFullPath);
                } catch (err) {}
            }
        }

        updatedContent = content.replace(attachRegex, `/attachments/${schoolSlug}/$1`);
        if (updatedContent !== content) {
            content = updatedContent;
            changed = true;
        }

        if (changed) {
            await fs.writeFile(cardFile, content, 'utf8');
            totalFixed++;
            console.log(`[Fixed] ${path.relative(CARD_DIR, cardFile)}`);
        }
    }

    console.log(`\nFinished! Total fixed cards: ${totalFixed}`);
}

run().catch(console.error);
