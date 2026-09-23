import fs from 'node:fs/promises';
import path from 'node:path';

// Measure source files conservatively; DevTools reports the final upload size.
const root = path.resolve(process.argv[2] || 'dist/build/mp-weixin');
const budget = Math.floor(1.8 * 1024 * 1024);
const format = bytes => `${(bytes / 1024).toFixed(1)} KB (${(bytes / 1024 / 1024).toFixed(2)} MB)`;

try {
  const app = JSON.parse(await fs.readFile(path.join(root, 'app.json'), 'utf8'));
  const subpackages = (app.subPackages || app.subpackages || []).map(item => item.root.replace(/\\/g, '/').replace(/\/$/, ''));
  const sizes = new Map([['主包', 0], ...subpackages.map(name => [name, 0])]);
  const files = [];
  async function walk(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (entry.isFile()) {
        const relative = path.relative(root, file).split(path.sep).join('/');
        const size = (await fs.stat(file)).size;
        const group = subpackages.find(name => relative.startsWith(name + '/')) || '主包';
        sizes.set(group, sizes.get(group) + size);
        files.push({ path: relative, size });
      }
    }
  }
  await walk(root);
  console.log(`小程序构建目录：${root}`);
  for (const [name, size] of sizes) console.log(`${name}：${format(size)}`);
  console.log('体积预算：每包 1.8 MB，为微信工具处理预留余量；最终大小以开发者工具为准。');
  if ([...sizes.values()].some(size => size > budget)) {
    console.error('构建产物超过体积预算，请缩减资源或拆分包后再上传。最大的资源：');
    for (const file of files.sort((a, b) => b.size - a.size).slice(0, 8)) console.error(`  ${format(file.size)}  ${file.path}`);
    process.exitCode = 1;
  } else console.log('PASS 小程序包体积检查');
} catch (error) {
  console.error(`无法检查小程序构建产物：${error.message}。请先运行 npm run build:mp-weixin。`);
  process.exitCode = 1;
}
